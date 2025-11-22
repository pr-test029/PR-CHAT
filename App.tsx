import React, { useState, useEffect, useRef } from 'react';
import { User, ChatSession, Message, Contact } from './types';
import { CURRENT_USER, AI_USER, DEMO_CONTACTS } from './constants';
import ChatWindow from './components/ChatWindow';
import { generateChatResponse, editImage, getCurrentLocation } from './services/geminiService';
import { LiveClient } from './services/liveService';

// --- Persistence Helper ---
const useStickyState = <T,>(defaultValue: T, key: string): [T, React.Dispatch<React.SetStateAction<T>>] => {
  const [value, setValue] = useState<T>(() => {
    try {
      const stickyValue = window.localStorage.getItem(key);
      return stickyValue !== null ? JSON.parse(stickyValue) : defaultValue;
    } catch (e) {
      return defaultValue;
    }
  });
  useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);
  return [value, setValue];
};

// --- Sidebar Component ---
const Sidebar: React.FC<{
    chats: ChatSession[];
    contacts: Contact[];
    activeTab: 'chats' | 'contacts';
    activeChatId: string | null;
    onSelectChat: (id: string) => void;
    onTabChange: (tab: 'chats' | 'contacts') => void;
    onStartChatWithContact: (contact: Contact) => void;
    onImportContacts: () => void;
    onAddManualContact: () => void;
    onShareLink: () => void;
    onNewAiChat: () => void;
}> = ({ 
    chats, contacts, activeTab, activeChatId, 
    onSelectChat, onTabChange, onStartChatWithContact, 
    onImportContacts, onAddManualContact, onShareLink, onNewAiChat
}) => {
    return (
        <div className="w-full md:w-80 h-full bg-white border-r border-gray-200 flex flex-col">
            {/* App Header */}
            <div className="p-4 bg-slate-100 border-b border-gray-200 flex justify-between items-center sticky top-0 z-10">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold shadow-sm">
                        PR
                    </div>
                    <span className="font-bold text-blue-900 tracking-tight">PR-CHAT</span>
                </div>
                <div className="flex gap-2">
                    <button onClick={onShareLink} className="p-2 text-blue-600 hover:bg-blue-100 rounded-full transition-colors" title="Share Link">
                        <span className="material-symbols-outlined text-xl">share</span>
                    </button>
                </div>
            </div>

            {/* List Content */}
            <div className="overflow-y-auto flex-1 bg-white relative">
                {activeTab === 'chats' ? (
                    <div className="flex flex-col">
                        {/* AI Chat Button */}
                        <button 
                            onClick={onNewAiChat}
                            className="flex items-center gap-3 p-4 hover:bg-blue-50 transition-colors border-b border-gray-100 text-left group">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-400 to-purple-500 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
                                <span className="material-symbols-outlined">spark</span>
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-800">Gemini AI</h3>
                                <p className="text-sm text-blue-600 font-medium">Ask me anything...</p>
                            </div>
                        </button>

                        {chats.length === 0 ? (
                            <div className="text-center p-8 text-gray-400 mt-4 flex flex-col items-center">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                                    <span className="material-symbols-outlined text-3xl opacity-50">chat_bubble_outline</span>
                                </div>
                                <p className="text-sm font-medium text-gray-500">No conversations yet.</p>
                                <button onClick={() => onTabChange('contacts')} className="text-blue-500 font-bold mt-2 text-sm hover:underline hover:text-blue-600 transition-colors">
                                    Start a chat from Contacts
                                </button>
                            </div>
                        ) : (
                            chats.map(chat => {
                                const other = chat.participants.find(p => p.id !== CURRENT_USER.id);
                                const isAi = chat.participants.some(p => p.isAi);
                                const lastMsg = chat.messages[chat.messages.length - 1];
                                
                                if (isAi) return null; // Rendered separately above

                                return (
                                    <div 
                                        key={chat.id} 
                                        onClick={() => onSelectChat(chat.id)}
                                        className={`flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 border-b border-gray-100 transition-colors ${activeChatId === chat.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}`}
                                    >
                                        <img src={other?.avatar || 'https://ui-avatars.com/api/?name=' + other?.name} className="w-12 h-12 rounded-full object-cover bg-gray-200 border border-gray-100" alt="avatar" />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-baseline">
                                                <h3 className="font-semibold text-gray-800 truncate">{chat.isGroup ? chat.name : other?.name}</h3>
                                                {lastMsg && <span className="text-[10px] text-gray-400 font-medium">{new Date(lastMsg.timestamp).toLocaleTimeString([],{hour:'2-digit', minute:'2-digit'})}</span>}
                                            </div>
                                            <p className="text-sm text-gray-500 truncate">
                                                {lastMsg ? (
                                                    lastMsg.image ? <span className="flex items-center gap-1 text-blue-500"><span className="material-symbols-outlined text-[16px]">image</span> Image</span> : lastMsg.text
                                                ) : (
                                                    <span className="italic text-gray-400">Tap to chat</span>
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                ) : (
                    // Contacts List
                    <div className="pb-20">
                        <div className="flex gap-2 p-4 border-b border-gray-100 bg-gray-50 sticky top-0 z-10">
                             <button 
                                onClick={onImportContacts}
                                className="flex-1 flex flex-col items-center justify-center p-3 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-blue-50 hover:border-blue-200 transition-all active:scale-95">
                                <span className="material-symbols-outlined text-blue-600 mb-1">sync</span>
                                <span className="text-xs font-bold text-gray-700">Import</span>
                            </button>
                            <button 
                                onClick={onAddManualContact}
                                className="flex-1 flex flex-col items-center justify-center p-3 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-green-50 hover:border-green-200 transition-all active:scale-95">
                                <span className="material-symbols-outlined text-green-600 mb-1">person_add</span>
                                <span className="text-xs font-bold text-gray-700">Add New</span>
                            </button>
                        </div>

                        <div className="px-4 py-2 bg-white text-xs font-bold text-gray-400 uppercase tracking-wide border-b border-gray-50">
                            My Contacts ({contacts.length})
                        </div>

                        {contacts.length === 0 && (
                            <div className="p-8 text-center text-gray-400 flex flex-col items-center">
                                <span className="material-symbols-outlined text-4xl opacity-30 mb-2">contact_page</span>
                                <p className="text-sm">No contacts found.</p>
                                <p className="text-xs mt-1 opacity-70">Use "Add New" to create a contact.</p>
                            </div>
                        )}

                        {contacts.map(contact => (
                            <div 
                                key={contact.id}
                                onClick={() => onStartChatWithContact(contact)}
                                className="flex items-center gap-3 p-4 hover:bg-gray-50 cursor-pointer border-b border-gray-100 group transition-colors"
                            >
                                <img src={contact.avatar || `https://ui-avatars.com/api/?name=${contact.name}&background=random`} className="w-10 h-10 rounded-full bg-gray-200 object-cover" alt={contact.name} />
                                <div className="flex-1">
                                    <h4 className="font-semibold text-gray-800 group-hover:text-blue-700 transition-colors">{contact.name}</h4>
                                    <p className="text-xs text-gray-500">{contact.phoneNumber}</p>
                                </div>
                                <span className="material-symbols-outlined text-gray-300 group-hover:text-blue-500">chat</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Bottom Nav */}
            <div className="mt-auto border-t border-gray-200 flex bg-white shadow-[0_-5px_10px_rgba(0,0,0,0.02)]">
                <button 
                    onClick={() => onTabChange('chats')}
                    className={`flex-1 py-3 flex flex-col items-center gap-1 hover:bg-gray-50 transition-colors relative ${activeTab === 'chats' ? 'text-blue-600' : 'text-gray-400'}`}>
                    <span className={`material-symbols-outlined text-2xl ${activeTab === 'chats' ? 'fill-current' : ''}`}>chat</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider">Chats</span>
                    {activeTab === 'chats' && <span className="absolute top-0 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-blue-600 rounded-b-full"></span>}
                </button>
                <button 
                    onClick={() => onTabChange('contacts')}
                    className={`flex-1 py-3 flex flex-col items-center gap-1 hover:bg-gray-50 transition-colors relative ${activeTab === 'contacts' ? 'text-blue-600' : 'text-gray-400'}`}>
                    <span className={`material-symbols-outlined text-2xl ${activeTab === 'contacts' ? 'fill-current' : ''}`}>contacts</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider">Contacts</span>
                    {activeTab === 'contacts' && <span className="absolute top-0 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-blue-600 rounded-b-full"></span>}
                </button>
            </div>
        </div>
    );
};

// --- Main App Component ---
const App: React.FC = () => {
  // State
  const [activeTab, setActiveTab] = useState<'chats' | 'contacts'>('chats');
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  
  // Persistent State
  const [chats, setChats] = useStickyState<ChatSession[]>([], 'pr-chat-sessions');
  const [contacts, setContacts] = useStickyState<Contact[]>([], 'pr-chat-contacts');

  // UI State
  const [showLiveModal, setShowLiveModal] = useState(false);
  const [liveStatus, setLiveStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  
  // Add Contact Form State
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');

  // Image Editing State
  const [editImageSrc, setEditImageSrc] = useState<string | null>(null);
  const [editPrompt, setEditPrompt] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Live Client Ref
  const liveClientRef = useRef<LiveClient | null>(null);

  // Initial Setup: Create AI Chat if missing & Populate Demo Contacts if empty
  useEffect(() => {
    const aiChatExists = chats.some(c => c.participants.some(p => p.isAi));
    if (!aiChatExists) {
        const aiChat: ChatSession = {
            id: 'chat_ai',
            participants: [CURRENT_USER, AI_USER],
            messages: [{
                id: 'welcome',
                senderId: 'gemini_ai',
                text: 'Hello! I am Gemini. I can help you write messages, generate images, search the web, find places on maps, or just chat!',
                timestamp: Date.now(),
                type: 'text'
            }],
            isGroup: false
        };
        setChats(prev => [aiChat, ...prev]);
    }

    // If contacts are completely empty, seed them so the user sees functionality immediately
    if (contacts.length === 0) {
        setContacts(DEMO_CONTACTS);
    }
  }, []);

  const activeChat = chats.find(c => c.id === activeChatId);

  // --- Handlers ---

  const handleSendMessage = async (chatId: string, text: string, image?: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      senderId: CURRENT_USER.id,
      text: text || undefined,
      image: image,
      timestamp: Date.now(),
      type: image ? 'image' : 'text'
    };

    setChats(prev => prev.map(chat => {
      if (chat.id === chatId) {
        return { ...chat, messages: [...chat.messages, newMessage] };
      }
      return chat;
    }));

    const chat = chats.find(c => c.id === chatId);
    if (!chat) return;

    // If AI Chat, trigger response
    if (chat.participants.some(p => p.isAi)) {
       const history = chat.messages.map(m => ({
           role: m.senderId === CURRENT_USER.id ? 'user' : 'model' as 'user' | 'model',
           parts: [{ text: (m.text || '') + (m.image ? ' [Image sent]' : '') }]
       }));
       
       history.push({ role: 'user', parts: [{ text: text || (image ? 'Analyze this image' : '') }] });

       try {
           const location = await getCurrentLocation();
           const useSearch = text.toLowerCase().includes('search') || text.toLowerCase().includes('find') || text.toLowerCase().includes('news');
           const useMaps = text.toLowerCase().includes('map') || text.toLowerCase().includes('place') || text.toLowerCase().includes('where');

           const response = await generateChatResponse(history, text || (image ? "Describe this image" : "Hello"), useSearch, useMaps, location);
           
           const aiMessage: Message = {
               id: (Date.now() + 1).toString(),
               senderId: AI_USER.id,
               text: response.text,
               timestamp: Date.now(),
               type: 'text',
               groundingChunks: response.groundingChunks
           };

           setChats(prev => prev.map(c => {
               if (c.id === chatId) {
                   return { ...c, messages: [...c.messages, aiMessage] };
               }
               return c;
           }));
       } catch (e) {
           console.error(e);
       }
    } else {
        // Simulate reply from "Simulated" user for demo purposes
        setTimeout(() => {
             const otherUser = chat.participants.find(p => p.id !== CURRENT_USER.id);
             if (otherUser) {
                const reply: Message = {
                    id: Date.now().toString(),
                    senderId: otherUser.id,
                    text: "Got it! (Simulated reply)",
                    timestamp: Date.now(),
                    type: 'text'
                };
                setChats(prev => prev.map(c => {
                    if (c.id === chatId) return { ...c, messages: [...c.messages, reply] };
                    return c;
                }));
             }
        }, 2000);
    }
  };

  const handleImportContacts = async () => {
    try {
        // Feature detection for Contact Picker API (Android Chrome mostly)
        if ('contacts' in navigator && 'ContactsManager' in window) {
            const props = ['name', 'tel'];
            const opts = { multiple: true };
            // @ts-ignore
            const selectedContacts = await navigator.contacts.select(props, opts);
            
            if (selectedContacts && selectedContacts.length > 0) {
                const newContacts: Contact[] = selectedContacts.map((c: any, i: number) => ({
                    id: `imp_${Date.now()}_${i}`,
                    name: c.name?.[0] || 'Unknown',
                    phoneNumber: c.tel?.[0] || '',
                    avatar: undefined
                }));
                
                setContacts(prev => {
                    const existingPhones = new Set(prev.map(p => p.phoneNumber));
                    const filtered = newContacts.filter(c => !existingPhones.has(c.phoneNumber));
                    return [...prev, ...filtered];
                });
                alert(`Successfully imported ${newContacts.length} contacts!`);
                return;
            }
        } 
        throw new Error("API not supported or cancelled");
    } catch (e) {
        const newDemoContacts = DEMO_CONTACTS.filter(dc => !contacts.some(c => c.phoneNumber === dc.phoneNumber));
        if (newDemoContacts.length > 0) {
             setContacts(prev => [...prev, ...newDemoContacts]);
             alert("Cannot access phone contacts directly on this device. Added example contacts.");
        } else {
             alert("No new contacts to import.");
        }
    }
  };

  const handleAddManualContact = () => {
      if (!newContactName || !newContactPhone) {
          alert("Please enter both a name and a phone number.");
          return;
      }
      
      const newContact: Contact = {
          id: `man_${Date.now()}`,
          name: newContactName,
          phoneNumber: newContactPhone,
          avatar: `https://ui-avatars.com/api/?name=${newContactName}&background=random`
      };
      
      setContacts(prev => [...prev, newContact]);
      setNewContactName('');
      setNewContactPhone('');
      setShowAddContactModal(false);
  };

  const handleStartChatWithContact = (contact: Contact) => {
    // Check if chat exists
    const existingChat = chats.find(c => 
        !c.isGroup && 
        c.participants.some(p => p.phoneNumber === contact.phoneNumber)
    );

    if (existingChat) {
        setActiveChatId(existingChat.id);
        setActiveTab('chats');
    } else {
        // Create new chat
        const newUser: User = {
            id: contact.id,
            name: contact.name,
            avatar: contact.avatar || `https://ui-avatars.com/api/?name=${contact.name}&background=random`,
            status: 'offline',
            phoneNumber: contact.phoneNumber
        };

        const newChat: ChatSession = {
            id: `chat_${Date.now()}`,
            participants: [CURRENT_USER, newUser],
            messages: [],
            isGroup: false
        };

        setChats(prev => [newChat, ...prev]);
        setActiveChatId(newChat.id);
        setActiveTab('chats');
    }
  };

  const handleNewAiChat = () => {
      const aiChat = chats.find(c => c.participants.some(p => p.isAi));
      if (aiChat) {
          setActiveChatId(aiChat.id);
          setActiveTab('chats');
      }
  };

  const handleShareLink = () => {
      navigator.clipboard.writeText(window.location.href);
      alert("App link copied to clipboard! Share it with friends.");
  };

  // --- Image Editing ---
  const handleEditImageSubmit = async () => {
      if (!editImageSrc || !editPrompt || !activeChatId) return;
      setIsEditing(true);
      try {
          const resultBase64 = await editImage(editImageSrc, editPrompt);
          handleSendMessage(activeChatId, `Edited image: ${editPrompt}`, resultBase64);
          setEditImageSrc(null);
          setEditPrompt('');
      } catch (e) {
          alert("Failed to edit image.");
      } finally {
          setIsEditing(false);
      }
  };

  // --- Live API ---
  const startLiveSession = () => {
    if (liveClientRef.current) return;
    setLiveStatus('connecting');
    setShowLiveModal(true);

    const client = new LiveClient({
        onAudioData: async (base64) => {}, // In real implementation, play audio here
        onTranscription: (userT, modelT) => {},
        onClose: () => {
            setLiveStatus('disconnected');
            setShowLiveModal(false);
            liveClientRef.current = null;
        },
        onError: (e) => {
            alert("Live Session Error: " + e.message);
            setLiveStatus('disconnected');
            liveClientRef.current = null;
        }
    });

    client.connect().then(() => {
        setLiveStatus('connected');
        liveClientRef.current = client;
    }).catch(e => {
        setLiveStatus('disconnected');
        alert("Could not connect to Live API. Check console.");
    });
  };

  const stopLiveSession = () => {
      liveClientRef.current?.disconnect();
      liveClientRef.current = null;
      setLiveStatus('disconnected');
      setShowLiveModal(false);
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-slate-100 font-sans">
      
      {/* Sidebar */}
      <div className={`${activeChatId ? 'hidden md:flex' : 'flex'} h-full w-full md:w-auto shadow-xl z-10`}>
        <Sidebar 
            chats={chats}
            contacts={contacts}
            activeTab={activeTab}
            activeChatId={activeChatId}
            onSelectChat={(id) => { setActiveChatId(id); }}
            onTabChange={setActiveTab}
            onStartChatWithContact={handleStartChatWithContact}
            onImportContacts={handleImportContacts}
            onAddManualContact={() => setShowAddContactModal(true)}
            onShareLink={handleShareLink}
            onNewAiChat={handleNewAiChat}
        />
      </div>

      {/* Chat Window */}
      <div className={`${!activeChatId ? 'hidden md:flex' : 'flex'} flex-1 h-full flex-col bg-[#efe7dd] bg-opacity-30`}>
        {activeChat ? (
            <>
                <div className="md:hidden bg-white p-3 border-b shadow-sm flex items-center sticky top-0 z-10">
                    <button onClick={() => setActiveChatId(null)} className="mr-2 p-2 rounded-full hover:bg-gray-100 text-blue-600 transition-colors">
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                    <div className="flex items-center gap-2">
                         <img 
                            src={activeChat.participants.find(p => p.id !== CURRENT_USER.id)?.avatar || ""} 
                            className="w-8 h-8 rounded-full bg-gray-200" 
                            alt="Avatar" 
                         />
                         <span className="font-bold text-gray-800">{activeChat.participants.find(p => p.id !== CURRENT_USER.id)?.name}</span>
                    </div>
                </div>
                <ChatWindow 
                    chat={activeChat}
                    onSendMessage={handleSendMessage}
                    onOpenImageEditor={(src) => setEditImageSrc(src)}
                    onOpenLive={startLiveSession}
                />
            </>
        ) : (
            <div className="hidden md:flex h-full items-center justify-center flex-col text-gray-500 bg-slate-50">
                <div className="w-48 h-48 bg-white rounded-full flex items-center justify-center mb-6 shadow-lg animate-fade-in-up">
                    <span className="material-symbols-outlined text-8xl text-blue-500 opacity-80">forum</span>
                </div>
                <h2 className="text-3xl font-light text-gray-800 mb-3">PR-CHAT Web</h2>
                <p className="text-gray-400 max-w-md text-center">Send and receive messages quickly and securely. Use Gemini AI to boost your productivity.</p>
                <div className="mt-8 flex gap-2 text-xs text-gray-400">
                    <span className="material-symbols-outlined text-sm">verified_user</span>
                    End-to-end encryption simulated
                </div>
            </div>
        )}
      </div>

      {/* Add Contact Modal */}
      {showAddContactModal && (
          <div className="fixed inset-0 z-50 bg-black bg-opacity-60 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl transform transition-all scale-100">
                  <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                      <span className="material-symbols-outlined text-blue-600">person_add</span> Add Contact
                  </h3>
                  <div className="space-y-4">
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                          <input 
                              type="text" 
                              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                              placeholder="e.g., John Doe"
                              value={newContactName}
                              onChange={(e) => setNewContactName(e.target.value)}
                          />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                          <input 
                              type="tel" 
                              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                              placeholder="e.g., +1 234 567 8900"
                              value={newContactPhone}
                              onChange={(e) => setNewContactPhone(e.target.value)}
                          />
                      </div>
                  </div>
                  <div className="flex justify-end gap-3 mt-8">
                      <button 
                          onClick={() => setShowAddContactModal(false)}
                          className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors">
                          Cancel
                      </button>
                      <button 
                          onClick={handleAddManualContact}
                          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-500/30 font-medium transition-all hover:transform hover:-translate-y-1">
                          Save Contact
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Image Editor Modal */}
      {editImageSrc && (
          <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl overflow-hidden max-w-3xl w-full shadow-2xl flex flex-col max-h-[90vh]">
                  <div className="p-4 bg-white border-b flex justify-between items-center">
                      <h3 className="font-bold text-gray-800 flex items-center gap-2">
                          <span className="material-symbols-outlined text-purple-600">auto_fix</span> Edit with Gemini
                      </h3>
                      <button onClick={() => setEditImageSrc(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                          <span className="material-symbols-outlined">close</span>
                      </button>
                  </div>
                  <div className="flex-1 bg-slate-900 flex items-center justify-center p-6 overflow-hidden relative group">
                      <img src={editImageSrc} alt="To Edit" className="max-w-full max-h-[60vh] object-contain shadow-lg" />
                  </div>
                  <div className="p-6 bg-white">
                      <label className="block text-sm font-bold text-gray-700 mb-2">Instructions for AI</label>
                      <div className="flex gap-3">
                          <input 
                              type="text" 
                              value={editPrompt}
                              onChange={(e) => setEditPrompt(e.target.value)}
                              placeholder="E.g., Add a vintage filter, remove the background, add a cat..." 
                              className="flex-1 border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-purple-500 outline-none bg-gray-50"
                              onKeyDown={(e) => e.key === 'Enter' && handleEditImageSubmit()}
                          />
                          <button 
                              onClick={handleEditImageSubmit}
                              disabled={isEditing || !editPrompt}
                              className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-xl hover:opacity-90 disabled:opacity-50 flex items-center gap-2 font-bold shadow-lg transition-all">
                              {isEditing ? (
                                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                              ) : (
                                  <>
                                    <span>Magic Edit</span>
                                    <span className="material-symbols-outlined text-sm">wand</span>
                                  </>
                              )}
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Live Modal */}
      {showLiveModal && (
          <div className="fixed inset-0 z-50 bg-slate-900 flex flex-col items-center justify-center text-white bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
               <div className="relative mb-10">
                    <div className={`w-40 h-40 rounded-full flex items-center justify-center transition-all duration-1000 ${liveStatus === 'connected' ? 'bg-gradient-to-br from-blue-500 to-purple-600 shadow-[0_0_60px_rgba(59,130,246,0.6)] animate-pulse' : 'bg-gray-700'}`}>
                        <span className="material-symbols-outlined text-7xl">mic</span>
                    </div>
                    {liveStatus === 'connected' && (
                         <div className="absolute -inset-4 rounded-full border border-blue-500/30 animate-ping"></div>
                    )}
               </div>
               
               <h2 className="text-4xl font-light mb-2 tracking-tight">Gemini Live</h2>
               <p className="text-blue-200 mb-12 text-xl font-light tracking-wide">
                   {liveStatus === 'connecting' ? 'Establishing connection...' : 'Listening & Speaking...'}
               </p>
               
               <button 
                    onClick={stopLiveSession}
                    className="bg-red-500 hover:bg-red-600 text-white px-10 py-4 rounded-full font-bold flex items-center gap-3 transition-all hover:scale-105 shadow-lg shadow-red-500/30">
                    <span className="material-symbols-outlined">call_end</span> 
                    End Conversation
               </button>
          </div>
      )}

    </div>
  );
};

export default App;