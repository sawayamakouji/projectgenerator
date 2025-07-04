
import React, { useState, useEffect, useRef } from 'react';
import type { ChatMessage } from '@/types';

interface ChatInterfaceProps {
  chatHistory: ChatMessage[];
  onSendMessage: (message: string) => void;
  isLoading: boolean; // For AI response loading
  projectOverview: string;
  isChatAvailable: boolean;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  chatHistory,
  onSendMessage,
  isLoading,
  projectOverview,
  isChatAvailable
}) => {
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [chatHistory]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isLoading || !isChatAvailable) return;
    onSendMessage(newMessage);
    setNewMessage('');
  };

  const getBubbleBgColor = (sender: ChatMessage['sender']) => {
    if (sender === 'user') return 'bg-blue-500 text-white';
    if (sender === 'ai') return 'bg-gray-100 text-gray-800';
    if (sender === 'system') return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
    return 'bg-gray-200 text-gray-800';
  };

  const getAlignment = (sender: ChatMessage['sender']) => {
    if (sender === 'user') return 'items-end';
    return 'items-start';
  };
  
  const getTextAlign = (sender: ChatMessage['sender']) => {
    if (sender === 'user') return 'text-right';
    return 'text-left';
  };


  return (
    <div className="bg-white p-4 md:p-6 rounded-lg shadow-md border border-gray-200 h-full flex flex-col max-h-[calc(100vh-10rem)] md:max-h-[700px]">
      <h3 className="text-lg md:text-xl font-semibold text-gray-800 mb-1">AIプロジェクトアシスタント</h3>
      <p className="text-xs text-gray-500 mb-4 truncate" title={projectOverview}>
        チャット対象: {projectOverview.length > 50 ? projectOverview.substring(0,50) + "..." : projectOverview}
      </p>

      {!isChatAvailable && (
        <div className="flex-grow flex flex-col items-center justify-center text-center p-4 bg-gray-50 rounded-md border border-gray-200">
            <WarningIcon className="w-10 h-10 text-yellow-500 mb-3" />
            <p className="text-yellow-700 font-medium">チャット利用不可</p>
            <p className="text-gray-600 text-sm mt-1">AIチャット機能は現在無効です。APIキーが設定されていない可能性があります。</p>
        </div>
      )}

      {isChatAvailable && (
        <>
          <div className="flex-grow overflow-y-auto space-y-3 mb-4 pr-1"> 
            {chatHistory.map((msg) => (
              <div key={msg.id} className={`flex flex-col ${getAlignment(msg.sender)}`}>
                <div 
                    className={`p-2.5 rounded-lg max-w-[85%] sm:max-w-[75%] break-words ${getBubbleBgColor(msg.sender)} shadow-sm`}
                    aria-live={msg.sender === 'ai' ? 'polite' : undefined} 
                    role={msg.sender === 'system' ? 'alert' : 'log'}
                >
                  <p className="text-sm whitespace-pre-wrap">
                    {msg.parts && msg.parts.length > 0 && msg.parts[0].text ? msg.parts[0].text : ''}
                  </p>
                </div>
                <p className={`text-xs text-gray-400 mt-1 px-1 ${getTextAlign(msg.sender)}`}>
                  {msg.sender === 'ai' ? 'AI' : msg.sender === 'user' ? 'あなた' : 'システム'} - {new Date(msg.timestamp).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSubmit} className="flex items-center space-x-2 pt-2 border-t border-gray-200">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              rows={1} 
              className="flex-grow p-2.5 bg-gray-100 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400 text-gray-900 transition-colors resize-none text-sm"
              placeholder={isLoading ? "AIが思考中..." : "AIに質問する..."}
              disabled={isLoading || !isChatAvailable}
              aria-label="チャットメッセージ入力"
            />
            <button
              type="submit"
              disabled={isLoading || !newMessage.trim() || !isChatAvailable}
              className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2.5 px-3 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-blue-400 transition-colors disabled:opacity-60 disabled:cursor-not-allowed h-full flex items-center justify-center"
              aria-label="チャットメッセージを送信"
            >
              {isLoading ? (
                <SpinnerIcon className="w-5 h-5 animate-spin" />
              ) : (
                <SendIcon className="w-5 h-5" />
              )}
            </button>
          </form>
        </>
      )}
    </div>
  );
};

// SVG Icons
const SendIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}>
    <path d="M3.105 3.105a.5.5 0 01.814-.39L17.5 9.5a.5.5 0 010 .79L3.919 17.285a.5.5 0 01-.814-.39V3.105z" />
  </svg>
);

const SpinnerIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
  </svg>
);

const WarningIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.008v.008H12v-.008Z" />
  </svg>
);
