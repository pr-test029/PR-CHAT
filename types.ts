export interface User {
  id: string;
  name: string;
  avatar: string;
  status: 'online' | 'offline' | 'busy';
  isAi?: boolean;
  phoneNumber?: string;
}

export interface Contact {
  id: string;
  name: string;
  phoneNumber: string;
  avatar?: string;
}

export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
  maps?: {
    uri: string;
    title: string;
    placeAnswerSources?: {
      reviewSnippets?: {
        snippet: string;
        author: string;
      }[];
    }[];
  };
}

export interface Message {
  id: string;
  senderId: string;
  text?: string;
  image?: string; // Base64
  timestamp: number;
  type: 'text' | 'image' | 'system';
  groundingChunks?: GroundingChunk[];
}

export interface ChatSession {
  id: string;
  participants: User[];
  messages: Message[];
  lastMessage?: Message;
  isGroup: boolean;
  name?: string; // For groups
  groupAvatar?: string;
}

export enum ImageResolution {
  RES_1K = '1K',
  RES_2K = '2K',
  RES_4K = '4K'
}