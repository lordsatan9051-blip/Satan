
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { marked } from 'marked';
import { AskMode, ChatMessage, ChatRole } from '../types';
import * as geminiService from '../services/geminiService';
import Card from './common/Card';
import Button from './common/Button';
import { SendIcon, MicrophoneIcon, LoadingIcon, SpeakerIcon, StopCircleIcon, SourceIcon } from './common/Icons';
import { decodeAudioData } from '../utils/audio';

// Helper component for rendering a chat message
const Message: React.FC<{ message: ChatMessage }> = ({ message }) => {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const audioContextRef = useRef<AudioContext | null>(null);
    const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

    const handleSpeak = async () => {
        if (isSpeaking) {
            audioSourceRef.current?.stop();
            setIsSpeaking(false);
            return;
        }
        setIsSpeaking(true);
        try {
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
            }
            const audioBytes = await geminiService.generateSpeech(message.text);
            const audioBuffer = await decodeAudioData(audioBytes, audioContextRef.current, 24000, 1);
            
            const source = audioContextRef.current.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContextRef.current.destination);
            source.onended = () => setIsSpeaking(false);
            source.start();
            audioSourceRef.current = source;

        } catch (error) {
            console.error("Error playing audio:", error);
            setIsSpeaking(false);
        }
    };

    const htmlContent = message.role === ChatRole.MODEL ? marked.parse(message.text) : message.text;

    return (
        <div className={`flex gap-3 my-4 ${message.role === ChatRole.USER ? 'justify-end' : 'justify-start'}`}>
            <div className={`p-3 rounded-2xl max-w-sm md:max-w-md lg:max-w-lg ${message.role === ChatRole.USER ? 'bg-blue-500 text-white rounded-br-none' : 'bg-gray-200 text-gray-800 rounded-bl-none'}`}>
                 <div className="prose prose-sm" dangerouslySetInnerHTML={{ __html: htmlContent as string }} />
                {message.role === ChatRole.MODEL && message.text && (
                    <button onClick={handleSpeak} className="mt-2 text-gray-500 hover:text-gray-800 transition-colors">
                        {isSpeaking ? <StopCircleIcon /> : <SpeakerIcon />}
                    </button>
                )}
                {message.sources && message.sources.length > 0 && (
                     <div className="mt-2 border-t pt-2">
                         <h4 className="text-xs font-bold text-gray-600 flex items-center"><SourceIcon className="mr-1"/>Sources:</h4>
                         <ul className="list-none pl-0 text-xs">
                             {message.sources.map((source, i) => (
                                 <li key={i} className="truncate">
                                     <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                         {source.title}
                                     </a>
                                 </li>
                             ))}
                         </ul>
                     </div>
                 )}
            </div>
        </div>
    );
};


const AskAnything: React.FC = () => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [mode, setMode] = useState<AskMode>(AskMode.STANDARD_FLASH);
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = useCallback(async (text: string) => {
        if (!text.trim()) return;
        const userMessage: ChatMessage = { role: ChatRole.USER, text };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            if (mode === AskMode.WEB_SEARCH) {
                const { text: modelText, sources } = await geminiService.getGroundedAnswer(text);
                const modelMessage: ChatMessage = { role: ChatRole.MODEL, text: modelText, sources };
                setMessages(prev => [...prev, modelMessage]);
            } else {
                let accumulatedText = "";
                const modelMessage: ChatMessage = { role: ChatRole.MODEL, text: "" };
                setMessages(prev => [...prev, modelMessage]);

                const stream = geminiService.askAnythingStream(text, mode, messages);
                for await (const chunk of stream) {
                    accumulatedText += chunk;
                    setMessages(prev => prev.map((msg, index) => 
                        index === prev.length - 1 ? { ...msg, text: accumulatedText } : msg
                    ));
                }
            }
        } catch (error) {
            console.error("Error asking anything:", error);
            const errorMessage: ChatMessage = { role: ChatRole.MODEL, text: "Sorry, I had a little trouble thinking. Can you try again?" };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    }, [mode, messages]);

    const handleMicClick = async () => {
        if (isRecording) {
            mediaRecorderRef.current?.stop();
            setIsRecording(false);
        } else {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorderRef.current = new MediaRecorder(stream);
                audioChunksRef.current = [];
                mediaRecorderRef.current.ondataavailable = (event) => {
                    audioChunksRef.current.push(event.data);
                };
                mediaRecorderRef.current.onstop = async () => {
                    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                    const reader = new FileReader();
                    reader.readAsDataURL(audioBlob);
                    reader.onloadend = async () => {
                        const base64Audio = (reader.result as string).split(',')[1];
                        setIsLoading(true);
                        try {
                            const transcribedText = await geminiService.transcribeAudio(base64Audio, 'audio/webm');
                            setInput(transcribedText);
                        } catch (e) {
                            console.error("Transcription error", e);
                            setInput("Sorry, I couldn't understand that.");
                        } finally {
                            setIsLoading(false);
                        }
                    };
                    stream.getTracks().forEach(track => track.stop());
                };
                mediaRecorderRef.current.start();
                setIsRecording(true);
            } catch (error) {
                console.error("Microphone access denied:", error);
            }
        }
    };


    return (
        <Card>
            <div className="text-center mb-4">
                <h2 className="text-2xl font-bold text-gray-700">Ask Me Anything!</h2>
            </div>
            <div className="flex flex-wrap justify-center gap-2 mb-4 p-2 bg-gray-100 rounded-full">
                {Object.values(AskMode).map(m => (
                    <button key={m} onClick={() => setMode(m)} className={`px-3 py-1 text-xs sm:text-sm font-semibold rounded-full transition-colors ${mode === m ? 'bg-purple-500 text-white shadow' : 'bg-white text-gray-600 hover:bg-purple-100'}`}>
                        {m}
                    </button>
                ))}
            </div>

            <div className="bg-white rounded-lg shadow-inner h-96 flex flex-col p-4 overflow-y-auto">
                {messages.length === 0 && <div className="m-auto text-center text-gray-400">Your conversation starts here...</div>}
                {messages.map((msg, index) => <Message key={index} message={msg} />)}
                 {isLoading && messages[messages.length - 1]?.role === ChatRole.USER && (
                    <div className="flex justify-start gap-3 my-4">
                       <div className="p-3 rounded-2xl bg-gray-200 text-gray-800 rounded-bl-none flex items-center">
                           <LoadingIcon className="w-5 h-5" />
                           <span className="ml-2 animate-pulse">Thinking...</span>
                       </div>
                    </div>
                )}
                <div ref={chatEndRef} />
            </div>

            <div className="mt-4 flex gap-2 items-center">
                <button
                    onClick={handleMicClick}
                    className={`p-3 rounded-full transition-colors ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-200 hover:bg-gray-300'}`}
                >
                    <MicrophoneIcon />
                </button>
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleSendMessage(input)}
                    placeholder={isRecording ? "Recording..." : "Type or say something..."}
                    className="flex-grow w-full px-4 py-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-400"
                    disabled={isLoading || isRecording}
                />
                <Button onClick={() => handleSendMessage(input)} disabled={isLoading || !input.trim()} className="p-3 rounded-full aspect-square">
                    {isLoading ? <LoadingIcon /> : <SendIcon />}
                </Button>
            </div>
        </Card>
    );
};

export default AskAnything;
