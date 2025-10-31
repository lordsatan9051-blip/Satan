
export enum AppTab {
  TALK_TRANSLATE = 'Talk & Translate',
  PICTURE_BOOK = 'Picture Book',
  ASK_ANYTHING = 'Ask Anything',
}

export enum ChatRole {
  USER = 'user',
  MODEL = 'model',
}

export interface ChatMessage {
  role: ChatRole;
  text: string;
  sources?: { uri: string; title: string }[];
}

export enum AskMode {
    QUICK_LITE = 'Quick Lite',
    STANDARD_FLASH = 'Standard Flash',
    DEEP_THINK_PRO = 'Deep Think Pro',
    WEB_SEARCH = 'Web Search',
}
