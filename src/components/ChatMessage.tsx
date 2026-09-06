import React from 'react';
import ReactMarkdown from 'react-markdown';
import { HiUser } from 'react-icons/hi2';
import { motion } from 'framer-motion';

export type Message = {
  role: 'user' | 'assistant';
  content: string;
};

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
    >
      <div className={`flex max-w-[88%] md:max-w-[80%] ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start gap-3`}>
        <div 
          className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center shadow-xs overflow-hidden ${
            isUser ? 'bg-[#2b5944] text-white' : 'bg-[var(--bg-hover)] border border-[var(--border-subtle)]'
          }`}
        >
          {isUser ? <HiUser size={16} /> : <img src="/logo.png" alt="AI Avatar" className="w-full h-full object-cover" />}
        </div>
        <div
          className={`px-4 py-3 rounded-2xl shadow-xs text-sm leading-relaxed border ${
            isUser
              ? 'bg-[#2b5944] text-white border-[#2b5944] rounded-tr-xs'
              : 'bg-[var(--bg-card)] border-[var(--border-subtle)] text-[var(--text-primary)] rounded-tl-xs shadow-xs'
          }`}
        >
          <div className={`prose prose-sm max-w-none break-words overflow-hidden ${isUser ? 'prose-invert text-white prose-p:text-white prose-a:text-emerald-200' : 'dark:prose-invert text-[var(--text-primary)]'}`}>
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
