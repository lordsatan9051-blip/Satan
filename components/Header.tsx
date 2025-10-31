
import React from 'react';
import { AppTab } from '../types';
import { TranslateIcon, BookIcon, ChatIcon } from './common/Icons';

interface HeaderProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
}

const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { name: AppTab.TALK_TRANSLATE, icon: <TranslateIcon /> },
    { name: AppTab.PICTURE_BOOK, icon: <BookIcon /> },
    { name: AppTab.ASK_ANYTHING, icon: <ChatIcon /> },
  ];

  return (
    <nav className="flex justify-center space-x-2 sm:space-x-4 bg-white/70 backdrop-blur-sm p-3 rounded-full shadow-lg">
      {tabs.map((tab) => (
        <button
          key={tab.name}
          onClick={() => setActiveTab(tab.name)}
          className={`
            flex items-center space-x-2 px-4 py-2 rounded-full text-sm sm:text-base font-semibold transition-all duration-300 ease-in-out
            focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-opacity-75
            ${
              activeTab === tab.name
                ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md'
                : 'text-gray-600 hover:bg-blue-100 hover:text-blue-700'
            }
          `}
        >
          {tab.icon}
          <span className="hidden sm:inline">{tab.name}</span>
        </button>
      ))}
    </nav>
  );
};

export default Header;
