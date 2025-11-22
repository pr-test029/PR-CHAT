import React, { useState, useRef, useEffect } from 'react';
import { User, Message, ChatSession } from '../types';
import { CURRENT_USER, AI_USER } from '../constants';
import MessageBubble from './MessageBubble';
import { generateChatResponse, getCurrentLocation, generateImage } from '../services/geminiService';

interface ChatWindowProps {
  chat: ChatSession;
  onSendMessage: (chatId: string, text: string, image?: string) => void;
  onOpenImageEditor: (image: string) => void;
  onOpenLive: () => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ chat, onSendMessage, onOpenImageEditor, onOpenLive }) => {
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showGenImageModal, setShowGenImageModal] = useState(false);
  
  // Image Gen State
  const [genPrompt, setGenPrompt] = useState('');
  const [isGeneratingImg, setIsGeneratingImg] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAiChat = chat.participants.some(p => p.isAi);
  const otherUser = chat.participants.find(p => p.id !== CURRENT_USER.id);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat.messages]);

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const text = inputValue;
    setInputValue('');
    onSendMessage(chat.id, text);

    // Handle AI Response if in AI Chat
    if (isAiChat) {
      setIsTyping(true);
      // Actual AI logic is lifted to App.tsx for state management, 
      // but we simulate local typing state for UI feedback
      setTimeout(() => setIsTyping(false), 1500); // Simple visual feedback
    }
  };
  
  const handleImageGenSubmit = async () => {
    if (!genPrompt) return;
    setIsGeneratingImg(true);
    try {
      const base64 = await generateImage(genPrompt);
      onSendMessage(chat.id, `Generated: ${genPrompt}`, base64);
      setShowGenImageModal(false);
      setGenPrompt('');
    } catch (e) {
      alert("Failed to generate image");
    } finally {
      setIsGeneratingImg(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        onSendMessage(chat.id, "", base64);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#efe7dd] bg-opacity-30 relative">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-100 border-b border-gray-200">
            <div className="flex items-center gap-3">
                <img src={isAiChat ? AI_USER.avatar : otherUser?.avatar} className="w-10 h-10 rounded-full" alt="avatar" />
                <div>
                    <h2 className="font-semibold text-gray-800">{isAiChat ? AI_USER.name : (chat.isGroup ? chat.name : otherUser?.name)}</h2>
                    <p className="text-xs text-gray-500">{isAiChat ? 'Powered by Gemini 2.5' : 'Online'}</p>
                </div>
            </div>
            {isAiChat && (
                <button 
                    onClick={onOpenLive}
                    className="p-2 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors" title="Start Voice Conversation">
                    <span className="material-symbols-outlined">mic</span>
                </button>
            )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 scrollbar-hide space-y-2">
            {chat.messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} onImageClick={onOpenImageEditor} />
            ))}
            {isTyping && (
                <div className="flex justify-start mb-4">
                    <div className="bg-white p-3 rounded-lg rounded-bl-none border border-gray-200 shadow-sm">
                        <div className="flex gap-1">
                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></span>
                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></span>
                        </div>
                    </div>
                </div>
            )}
            <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-3 bg-gray-100 border-t border-gray-200">
            <div className="flex items-center gap-2">
                <div className="relative">
                    <button 
                        onClick={() => setShowAttachMenu(!showAttachMenu)}
                        className="p-2 text-gray-500 hover:bg-gray-200 rounded-full">
                        <span className="material-symbols-outlined">add</span>
                    </button>
                    {showAttachMenu && (
                        <div className="absolute bottom-12 left-0 bg-white shadow-lg rounded-xl p-2 flex flex-col gap-2 min-w-[150px] z-10">
                             <button 
                                onClick={() => {fileInputRef.current?.click(); setShowAttachMenu(false);}}
                                className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded text-sm text-gray-700 text-left">
                                <span className="material-symbols-outlined text-purple-500">image</span> Upload Image
                             </button>
                             {isAiChat && (
                                 <button 
                                    onClick={() => {setShowGenImageModal(true); setShowAttachMenu(false);}}
                                    className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded text-sm text-gray-700 text-left">
                                    <span className="material-symbols-outlined text-green-500">brush</span> Generate Image
                                 </button>
                             )}
                        </div>
                    )}
                </div>
                
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleFileUpload}
                />

                <input 
                    type="text" 
                    className="flex-1 py-2 px-4 rounded-full border border-gray-300 focus:outline-none focus:border-blue-500"
                    placeholder="Type a message..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                />
                <button 
                    onClick={handleSend}
                    className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 shadow-sm">
                    <span className="material-icons-outlined">send</span>
                </button>
            </div>
        </div>

        {/* Image Generation Modal */}
        {showGenImageModal && (
            <div className="absolute inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-green-500">brush</span> 
                        Generate Image
                    </h3>
                    <textarea 
                        className="w-full border border-gray-300 rounded-lg p-3 mb-4 focus:ring-2 focus:ring-blue-500 outline-none"
                        rows={3}
                        placeholder="Describe the image you want (e.g., A futuristic city with flying cars)..."
                        value={genPrompt}
                        onChange={(e) => setGenPrompt(e.target.value)}
                    />
                    <div className="flex justify-end gap-2">
                        <button 
                            onClick={() => setShowGenImageModal(false)}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                            Cancel
                        </button>
                        <button 
                            onClick={handleImageGenSubmit}
                            disabled={isGeneratingImg || !genPrompt}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                            {isGeneratingImg ? 'Generating...' : 'Generate'}
                        </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2 text-center">Uses Gemini 2.5 Flash Image</p>
                </div>
            </div>
        )}
    </div>
  );
};

export default ChatWindow;