
import React from 'react';
import useLiveConversation from '../hooks/useLiveConversation';
import { MicrophoneIcon, StopIcon, LoadingIcon, WarningIcon } from './common/Icons';
import Card from './common/Card';

const TalkTranslate: React.FC = () => {
    const {
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
    } = useLiveConversation();

    const languages = [
        "English", "Spanish", "French", "German", "Italian", "Japanese", "Korean", "Mandarin", "Russian", "Portuguese"
    ];

    return (
        <Card>
            <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-700 mb-2">Talk & Translate</h2>
                <p className="text-gray-500 mb-6">Have a real-time conversation and learn a new language!</p>
            </div>
            
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-6">
                <div className="w-full sm:w-auto">
                    <label htmlFor="native-lang" className="block text-sm font-medium text-gray-700 mb-1">I speak:</label>
                    <select
                        id="native-lang"
                        value={nativeLanguage}
                        onChange={(e) => setNativeLanguage(e.target.value)}
                        disabled={isSessionActive || isInitializing}
                        className="w-full bg-white border border-gray-300 rounded-md shadow-sm pl-3 pr-10 py-2 text-left cursor-default focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                        {languages.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                    </select>
                </div>
                <div className="text-2xl text-gray-400 mt-4 sm:mt-6">→</div>
                 <div className="w-full sm:w-auto">
                    <label htmlFor="target-lang" className="block text-sm font-medium text-gray-700 mb-1">Translate to:</label>
                    <select
                        id="target-lang"
                        value={targetLanguage}
                        onChange={(e) => setTargetLanguage(e.target.value)}
                        disabled={isSessionActive || isInitializing}
                        className="w-full bg-white border border-gray-300 rounded-md shadow-sm pl-3 pr-10 py-2 text-left cursor-default focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                    >
                        {languages.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                    </select>
                </div>
            </div>

            <div className="flex justify-center my-8">
                <button
                    onClick={isSessionActive ? stopSession : startSession}
                    disabled={isInitializing}
                    className={`
                        w-24 h-24 rounded-full text-white flex items-center justify-center transition-all duration-300 ease-in-out
                        transform hover:scale-105 focus:outline-none focus:ring-4
                        ${isInitializing ? 'bg-gray-400 cursor-not-allowed' :
                        isSessionActive ? 'bg-red-500 hover:bg-red-600 focus:ring-red-300 animate-pulse' :
                        'bg-blue-500 hover:bg-blue-600 focus:ring-blue-300'}
                    `}
                >
                    {isInitializing ? <LoadingIcon className="w-10 h-10"/> : isSessionActive ? <StopIcon className="w-10 h-10"/> : <MicrophoneIcon className="w-10 h-10"/>}
                </button>
            </div>

            <div className="bg-gray-100 rounded-lg p-4 min-h-[150px] max-h-60 overflow-y-auto shadow-inner">
                {error && <div className="text-red-600 flex items-center"><WarningIcon className="mr-2"/>{error}</div>}
                {!error && transcript.length === 0 && <p className="text-gray-500 text-center italic">Transcript will appear here...</p>}
                {transcript.map((item, index) => (
                    <p key={index} className={`mb-2 ${item.isUser ? 'text-blue-800' : 'text-purple-800 font-semibold'}`}>
                        <span className="font-bold">{item.isUser ? 'You:' : 'Pal:'}</span> {item.text}
                    </p>
                ))}
            </div>
        </Card>
    );
};

export default TalkTranslate;
