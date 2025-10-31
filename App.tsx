
import React, { useState } from 'react';
import Header from './components/Header';
import TalkTranslate from './components/TalkTranslate';
import PictureBook from './components/PictureBook';
import AskAnything from './components/AskAnything';
import { AppTab } from './types';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.TALK_TRANSLATE);

  const renderContent = () => {
    switch (activeTab) {
      case AppTab.TALK_TRANSLATE:
        return <TalkTranslate />;
      case AppTab.PICTURE_BOOK:
        return <PictureBook />;
      case AppTab.ASK_ANYTHING:
        return <AskAnything />;
      default:
        return <TalkTranslate />;
    }
  };

  return (
    <div className="min-h-screen font-sans text-gray-800 bg-gradient-to-br from-blue-100 to-purple-100">
      <div className="container mx-auto p-4 max-w-4xl">
        <header className="text-center my-6">
          <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-600 drop-shadow-md">
            Gemini Kids Voice Pal
          </h1>
          <p className="text-lg text-gray-600 mt-2">Your fun learning and translation friend!</p>
        </header>
        
        <Header activeTab={activeTab} setActiveTab={setActiveTab} />
        
        <main className="mt-6">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default App;
