import React from 'react';
import { Bot, User } from 'lucide-react';
import { Message } from '../types';
import ReactMarkdown from 'react-markdown';

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-[85%] md:max-w-[75%] gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        
        {/* Avatar */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser ? 'bg-indigo-600' : 'bg-gray-200'
        }`}>
          {isUser ? (
            <User size={16} className="text-white" />
          ) : (
            <Bot size={16} className="text-gray-600" />
          )}
        </div>

        {/* Bubble */}
        <div
          className={`px-5 py-3.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
            isUser
              ? 'bg-indigo-600 text-white rounded-tr-sm'
              : 'bg-white text-gray-800 border border-gray-100 rounded-tl-sm'
          }`}
        >
          <ReactMarkdown 
            components={{
              p: ({node, ...props}) => <p className="mb-1 last:mb-0" {...props} />,
              ul: ({node, ...props}) => <ul className="list-disc ml-4 mb-2" {...props} />,
              ol: ({node, ...props}) => <ol className="list-decimal ml-4 mb-2" {...props} />,
              li: ({node, ...props}) => <li className="mb-0.5" {...props} />,
              strong: ({node, ...props}) => <strong className="font-semibold" {...props} />,
            }}
          >
            {message.text}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
};