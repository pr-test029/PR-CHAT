import React from 'react';
import { Message, GroundingChunk } from '../types';
import { CURRENT_USER } from '../constants';

interface MessageBubbleProps {
  message: Message;
  onImageClick: (imgSrc: string) => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, onImageClick }) => {
  const isMe = message.senderId === CURRENT_USER.id;

  // Helper to render Google Maps Grounding
  const renderMap = (mapData: GroundingChunk['maps'], index: number) => {
    if (!mapData) return null;
    return (
      <div key={`map-${index}`} className="mt-2 p-2 bg-white rounded shadow text-sm text-gray-800 border border-gray-200">
        <div className="font-semibold flex items-center gap-1">
          <span className="material-symbols-outlined text-red-500 text-sm">location_on</span>
          {mapData.title}
        </div>
        <div className="text-xs text-blue-600 truncate mb-2">{mapData.uri}</div>
        {mapData.placeAnswerSources?.[0]?.reviewSnippets?.[0] && (
             <div className="text-xs italic text-gray-600 bg-gray-50 p-1 rounded">
                "{mapData.placeAnswerSources[0].reviewSnippets[0].snippet}"
             </div>
        )}
        <a href={mapData.uri} target="_blank" rel="noreferrer" className="block mt-2 text-center bg-blue-100 text-blue-700 py-1 rounded text-xs hover:bg-blue-200">
            View on Maps
        </a>
      </div>
    );
  };

  // Helper to render Search Grounding citations
  const renderSearchSources = (chunks: GroundingChunk[]) => {
    const webSources = chunks.filter(c => c.web).map(c => c.web!);
    if (webSources.length === 0) return null;

    return (
      <div className="mt-2 pt-2 border-t border-opacity-20 border-gray-500">
        <p className="text-[10px] font-semibold uppercase opacity-70 mb-1">Sources:</p>
        <div className="flex flex-wrap gap-2">
          {webSources.map((src, i) => (
            <a 
              key={i} 
              href={src.uri} 
              target="_blank" 
              rel="noreferrer"
              className="text-[10px] bg-black bg-opacity-5 px-2 py-1 rounded hover:bg-opacity-10 truncate max-w-[150px]"
              title={src.title}
            >
              {src.title || new URL(src.uri).hostname}
            </a>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={`flex w-full mb-4 ${isMe ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[75%] md:max-w-[60%] rounded-lg p-3 shadow-sm relative ${
        isMe 
          ? 'bg-blue-500 text-white rounded-br-none' 
          : 'bg-white text-gray-800 rounded-bl-none border border-gray-200'
      }`}>
        {/* Text Content */}
        {message.text && (
          <div className="whitespace-pre-wrap text-sm">{message.text}</div>
        )}

        {/* Image Content */}
        {message.image && (
          <div className="mt-2 group relative cursor-pointer">
            <img 
              src={message.image} 
              alt="Shared" 
              className="rounded-md max-h-64 w-full object-cover border border-gray-300"
              onClick={() => onImageClick(message.image!)}
            />
            {/* Edit Overlay Hint */}
             <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all flex items-center justify-center pointer-events-none">
                <span className="text-white opacity-0 group-hover:opacity-100 bg-black bg-opacity-50 px-2 py-1 rounded text-xs">
                    Click to Edit
                </span>
             </div>
          </div>
        )}

        {/* Grounding Data (Maps) */}
        {message.groundingChunks && message.groundingChunks.map((chunk, i) => 
            chunk.maps ? renderMap(chunk.maps, i) : null
        )}

        {/* Grounding Data (Web) */}
        {message.groundingChunks && renderSearchSources(message.groundingChunks)}

        {/* Timestamp */}
        <div className={`text-[10px] text-right mt-1 ${isMe ? 'text-blue-100' : 'text-gray-400'}`}>
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
