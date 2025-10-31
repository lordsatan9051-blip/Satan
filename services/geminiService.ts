
import { GoogleGenAI, GenerateContentResponse, Chat } from "@google/genai";
import { AskMode, ChatMessage, ChatRole } from '../types';

let ai: GoogleGenAI | null = null;
let chatInstance: Chat | null = null;

const getAI = () => {
    if (!ai) {
        if (!process.env.API_KEY) {
            throw new Error("API_KEY environment variable not set");
        }
        ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    }
    return ai;
};

export const generateImage = async (prompt: string): Promise<string> => {
    const ai = getAI();
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: `A cute, vibrant, cartoon-style illustration for a child: ${prompt}`,
        config: {
            numberOfImages: 1,
            outputMimeType: 'image/png',
            aspectRatio: '1:1',
        },
    });

    const base64ImageBytes = response.generatedImages[0].image.imageBytes;
    return `data:image/png;base64,${base64ImageBytes}`;
};

export const generateSpeech = async (text: string): Promise<Uint8Array> => {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }],
        config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: 'Puck' },
                },
            },
        },
    });
    
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
        const binaryString = atob(base64Audio);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes;
    }
    throw new Error("Failed to generate audio");
};


export const getOrStartChat = (): Chat => {
    if (!chatInstance) {
        const ai = getAI();
        chatInstance = ai.chats.create({
            model: 'gemini-2.5-flash',
            config: {
                systemInstruction: 'You are a fun and friendly assistant for a curious child. Your name is Sparkle. Explain things in a simple, easy-to-understand way. Keep answers concise.',
            },
        });
    }
    return chatInstance;
};

export async function* askAnythingStream(
    prompt: string,
    mode: AskMode,
    history: ChatMessage[]
): AsyncGenerator<string> {
    const ai = getAI();
    let modelName: string;
    let config: any = {};

    switch (mode) {
        case AskMode.QUICK_LITE:
            modelName = 'gemini-flash-lite-latest';
            break;
        case AskMode.DEEP_THINK_PRO:
            modelName = 'gemini-2.5-pro';
            config.thinkingConfig = { thinkingBudget: 32768 };
            break;
        case AskMode.WEB_SEARCH:
            modelName = 'gemini-2.5-flash';
            config.tools = [{ googleSearch: {} }];
            break;
        case AskMode.STANDARD_FLASH:
        default:
            modelName = 'gemini-2.5-flash';
            break;
    }
    
    const chat = getOrStartChat();
    // This example uses a single chat instance; for production with different models/configs, you might manage separate instances.
    // For simplicity here, we'll use generateContent for non-standard-flash modes to apply special configs.
    if (mode !== AskMode.STANDARD_FLASH) {
         const responseStream = await ai.models.generateContentStream({
            model: modelName,
            contents: prompt,
            config: config,
        });
         for await (const chunk of responseStream) {
             yield chunk.text;
         }

    } else {
        const responseStream = await chat.sendMessageStream({ message: prompt });
        for await (const chunk of responseStream) {
            yield chunk.text;
        }
    }
}

export const getGroundedAnswer = async (prompt: string): Promise<{ text: string, sources: { uri: string; title: string }[] }> => {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            tools: [{ googleSearch: {} }],
        },
    });

    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
        ?.map((chunk: any) => ({
            uri: chunk.web?.uri,
            title: chunk.web?.title,
        }))
        .filter((s: any) => s.uri && s.title) || [];
    
    return { text: response.text, sources };
};

export const transcribeAudio = async (audioBase64: string, mimeType: string): Promise<string> => {
    const ai = getAI();
    const audioPart = {
        inlineData: {
            mimeType: mimeType,
            data: audioBase64,
        },
    };
    const textPart = {
        text: "Transcribe this audio recording."
    };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [audioPart, textPart] },
    });

    return response.text;
};
