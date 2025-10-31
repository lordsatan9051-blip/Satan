
import { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveSession, LiveServerMessage, Modality, Blob } from '@google/genai';
import { encode, decode, decodeAudioData } from '../utils/audio';

interface TranscriptItem {
    text: string;
    isUser: boolean;
}

const useLiveConversation = () => {
    const [isSessionActive, setIsSessionActive] = useState(false);
    const [isInitializing, setIsInitializing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
    const [targetLanguage, setTargetLanguage] = useState("Spanish");
    const [nativeLanguage, setNativeLanguage] = useState("English");

    const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    
    const nextStartTimeRef = useRef(0);
    const audioSourcesRef = useRef(new Set<AudioBufferSourceNode>());

    const cleanup = useCallback(() => {
        setIsSessionActive(false);
        setIsInitializing(false);
        setError(null);

        // Stop microphone stream
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
        }

        // Disconnect audio nodes
        if (scriptProcessorRef.current) {
            scriptProcessorRef.current.disconnect();
            scriptProcessorRef.current.onaudioprocess = null;
            scriptProcessorRef.current = null;
        }
        if (mediaStreamSourceRef.current) {
            mediaStreamSourceRef.current.disconnect();
            mediaStreamSourceRef.current = null;
        }

        // Close audio contexts
        if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
            inputAudioContextRef.current.close();
            inputAudioContextRef.current = null;
        }
        if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
            outputAudioContextRef.current.close();
            outputAudioContextRef.current = null;
        }
        
        // Clear audio queue
        audioSourcesRef.current.forEach(source => source.stop());
        audioSourcesRef.current.clear();
        nextStartTimeRef.current = 0;

        sessionPromiseRef.current = null;
    }, []);

    const stopSession = useCallback(async () => {
        if (sessionPromiseRef.current) {
            try {
                const session = await sessionPromiseRef.current;
                session.close();
            } catch(e) {
                console.error("Error closing session", e);
            }
        }
        cleanup();
    }, [cleanup]);

    useEffect(() => {
        // Ensure cleanup is called when the component unmounts
        return () => {
           if(isSessionActive) stopSession();
        };
    }, [isSessionActive, stopSession]);

    const startSession = useCallback(async () => {
        setIsInitializing(true);
        setError(null);
        setTranscript([]);

        try {
            if (!process.env.API_KEY) {
                throw new Error("API key not configured.");
            }
             const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

            inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            
            mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });

            sessionPromiseRef.current = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                config: {
                    responseModalities: [Modality.AUDIO],
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
                    systemInstruction: `You are a friendly and patient language tutor for a child. The user speaks ${nativeLanguage}. You must listen, understand, and respond ONLY in ${targetLanguage}. Keep your responses simple, encouraging, and directly related to what the user said.`,
                },
                callbacks: {
                    onopen: () => {
                        setIsInitializing(false);
                        setIsSessionActive(true);
                        
                        const source = inputAudioContextRef.current!.createMediaStreamSource(mediaStreamRef.current!);
                        mediaStreamSourceRef.current = source;

                        const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
                        scriptProcessorRef.current = scriptProcessor;

                        scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            const l = inputData.length;
                            const int16 = new Int16Array(l);
                             for (let i = 0; i < l; i++) {
                                int16[i] = inputData[i] * 32768;
                            }
                            const pcmBlob: Blob = {
                                data: encode(new Uint8Array(int16.buffer)),
                                mimeType: 'audio/pcm;rate=16000',
                            };
                            sessionPromiseRef.current?.then((session) => {
                                session.sendRealtimeInput({ media: pcmBlob });
                            });
                        };
                        source.connect(scriptProcessor);
                        scriptProcessor.connect(inputAudioContextRef.current!.destination);
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        if (message.serverContent?.inputTranscription) {
                            const text = message.serverContent.inputTranscription.text;
                            if (text) {
                                setTranscript(prev => {
                                    const last = prev[prev.length -1];
                                    if(last?.isUser) {
                                        const newLast = {...last, text: last.text + text};
                                        return [...prev.slice(0,-1), newLast];
                                    }
                                    return [...prev, {text, isUser: true}];
                                });
                            }
                        }
                        if (message.serverContent?.outputTranscription) {
                            const text = message.serverContent.outputTranscription.text;
                            if (text) {
                                setTranscript(prev => {
                                    const last = prev[prev.length -1];
                                    if(last && !last.isUser) {
                                        const newLast = {...last, text: last.text + text};
                                        return [...prev.slice(0,-1), newLast];
                                    }
                                    return [...prev, {text, isUser: false}];
                                });
                            }
                        }
                        const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                        if (base64Audio) {
                            const ctx = outputAudioContextRef.current!;
                            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
                            const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
                            const source = ctx.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(ctx.destination);
                            source.addEventListener('ended', () => audioSourcesRef.current.delete(source));
                            source.start(nextStartTimeRef.current);
                            nextStartTimeRef.current += audioBuffer.duration;
                            audioSourcesRef.current.add(source);
                        }
                         if (message.serverContent?.interrupted) {
                            audioSourcesRef.current.forEach(source => source.stop());
                            audioSourcesRef.current.clear();
                            nextStartTimeRef.current = 0;
                        }
                    },
                    onerror: (e: ErrorEvent) => {
                        console.error('Session error:', e);
                        setError('A connection error occurred. Please try again.');
                        cleanup();
                    },
                    onclose: () => {
                        cleanup();
                    },
                },
            });

        } catch (err) {
            console.error(err);
            let errorMessage = 'An unexpected error occurred.';
            if (err instanceof Error) {
                if (err.name === 'NotAllowedError') {
                    errorMessage = 'Microphone access was denied. Please allow microphone access in your browser settings.';
                } else {
                    errorMessage = err.message;
                }
            }
            setError(errorMessage);
            cleanup();
        }
    }, [cleanup, nativeLanguage, targetLanguage]);

    return {
        isSessionActive,
        isInitializing,
        error,
        transcript,
        startSession,
        stopSession,
        targetLanguage,
        setTargetLanguage,
        nativeLanguage,
        setNativeLanguage,
    };
};

export default useLiveConversation;
