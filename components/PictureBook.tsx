
import React, { useState, useCallback } from 'react';
import Card from './common/Card';
import Button from './common/Button';
import { generateImage } from '../services/geminiService';
import { LoadingIcon, ImageIcon } from './common/Icons';

const PictureBook: React.FC = () => {
    const [prompt, setPrompt] = useState<string>('a happy red apple');
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const handleGenerateImage = useCallback(async () => {
        if (!prompt.trim()) {
            setError('Please enter a word or phrase!');
            return;
        }
        setIsLoading(true);
        setError(null);
        setImageUrl(null);
        try {
            const url = await generateImage(prompt);
            setImageUrl(url);
        } catch (e) {
            console.error(e);
            setError('Oops! Something went wrong. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }, [prompt]);

    return (
        <Card>
            <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-700 mb-2">Picture Book</h2>
                <p className="text-gray-500 mb-6">Type a word and see a picture! Great for learning new things.</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
                <input
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g., a friendly lion"
                    className="flex-grow w-full px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-400 transition-shadow"
                    disabled={isLoading}
                />
                <Button onClick={handleGenerateImage} disabled={isLoading} className="w-full sm:w-auto">
                    {isLoading ? <><LoadingIcon className="mr-2"/> Generating...</> : 'Create Picture'}
                </Button>
            </div>
            {error && <p className="text-red-500 mt-2 text-center">{error}</p>}

            <div className="mt-6 w-full aspect-square bg-gray-100 rounded-xl flex items-center justify-center shadow-inner overflow-hidden">
                {isLoading ? (
                    <div className="text-center text-gray-500">
                        <LoadingIcon className="w-12 h-12 mx-auto mb-2"/>
                        <p>Drawing your picture...</p>
                    </div>
                ) : imageUrl ? (
                    <img src={imageUrl} alt={prompt} className="w-full h-full object-cover" />
                ) : (
                    <div className="text-center text-gray-400">
                        <ImageIcon className="w-24 h-24 mx-auto"/>
                        <p>Your picture will appear here!</p>
                    </div>
                )}
            </div>
        </Card>
    );
};

export default PictureBook;
