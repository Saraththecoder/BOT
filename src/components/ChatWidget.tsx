'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Loader2, Mic, Sparkles, RefreshCw, Volume2, VolumeX } from 'lucide-react';
import { ChatMessage, Message } from './ChatMessage';
import { QuickReplies } from './QuickReplies';

interface ChatWidgetProps {
  pendingQuery?: string;
  onQueryConsumed?: () => void;
  isOpenExternal?: boolean;
  onCloseExternal?: () => void;
}

export function ChatWidget({
  pendingQuery,
  onQueryConsumed,
  isOpenExternal,
  onCloseExternal
}: ChatWidgetProps = {}) {
  const [isOpenInternal, setIsOpenInternal] = useState(false);
  const isOpen = isOpenExternal !== undefined ? isOpenExternal : isOpenInternal;
  const setIsOpen = (val: boolean) => {
    setIsOpenInternal(val);
    if (!val && onCloseExternal) onCloseExternal();
  };

  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hello! I am your AITS Campus AI Companion. Ask me anything about admissions, cutoffs, courses, or campus life!' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const [sessionId] = useState(() => Math.random().toString(36).substring(7));
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (text: string) => {
    if (!text.trim()) return;

    setIsOpenInternal(true);
    const userMsg: Message = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    const newMessages = [...messages, userMsg];

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, sessionId }),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      if (!response.body) {
        throw new Error('No readable stream');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let assistantContent = '';

      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunkValue = decoder.decode(value, { stream: true });
        assistantContent += chunkValue;

        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1].content = assistantContent;
          return updated;
        });
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'I encountered an issue retrieving that information. Please try again or contact admissions at 9948149222.' }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Consume pending query passed from parent component (e.g. landing page input / voice)
  useEffect(() => {
    if (pendingQuery && pendingQuery.trim() && isOpen) {
      const queryToSend = pendingQuery;
      if (onQueryConsumed) onQueryConsumed();
      handleSend(queryToSend);
    }
  }, [pendingQuery, isOpen]);

  // Voice Speech Recognition
  const toggleVoiceListen = () => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in your browser. Please type your message.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setIsListening(false);
        if (transcript) {
          handleSend(transcript);
        }
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      recognition.start();
    } catch (err) {
      console.error(err);
      setIsListening(false);
    }
  };

  // Text to Speech Readout
  const speakLastMessage = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const lastMsg = [...messages].reverse().find(m => m.role === 'assistant');
    if (!lastMsg || !lastMsg.content) return;

    const utterance = new SpeechSynthesisUtterance(lastMsg.content.replace(/[*#_`]/g, ''));
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <>
      {/* Floating launcher button when closed */}
      <div className="fixed bottom-6 right-6 z-50">
        <AnimatePresence>
          {!isOpen && (
            <motion.button
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              onClick={() => setIsOpen(true)}
              className="relative group bg-[#2b5944] hover:bg-[#224736] text-white rounded-full p-4 shadow-xl flex items-center justify-center transition-all duration-300 cursor-pointer"
            >
              <div className="absolute inset-0 rounded-full bg-[#2b5944] opacity-30 group-hover:animate-ping pointer-events-none" />
              <Sparkles size={24} className="relative z-10" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Main Drawer Chat Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-6 right-6 z-50 w-[420px] h-[640px] max-h-[85vh] max-w-[92vw] bg-white/95 dark:bg-[#161c18]/95 backdrop-blur-xl rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-[#e2e7e3] dark:border-[#243028]"
          >
            {/* Header */}
            <div className="bg-[#2b5944] text-white px-5 py-4 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-3">
                <div className="bg-white/15 p-2 rounded-full border border-white/20">
                  <Sparkles size={18} className="text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-base tracking-tight">aitsbot.ai</h3>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse"></span>
                    <p className="text-xs text-emerald-100/90 font-medium">AITS Campus Assistant</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {/* Audio Readout Toggle */}
                <button
                  onClick={speakLastMessage}
                  title={isSpeaking ? 'Stop audio' : 'Read answer aloud'}
                  className="text-white/80 hover:text-white hover:bg-white/10 p-2 rounded-full transition-all cursor-pointer"
                >
                  {isSpeaking ? <VolumeX size={16} className="text-amber-300" /> : <Volume2 size={16} />}
                </button>
                <button
                  onClick={() => {
                    if (isSpeaking && typeof window !== 'undefined') window.speechSynthesis.cancel();
                    setMessages([{ role: 'assistant', content: 'Chat reset. How can I help you today?' }]);
                  }}
                  title="Clear Chat"
                  className="text-white/80 hover:text-white hover:bg-white/10 p-2 rounded-full transition-all cursor-pointer"
                >
                  <RefreshCw size={16} />
                </button>
                <button
                  onClick={() => {
                    if (isSpeaking && typeof window !== 'undefined') window.speechSynthesis.cancel();
                    setIsOpen(false);
                  }}
                  className="text-white/80 hover:text-white hover:bg-white/10 p-2 rounded-full transition-all cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-5 bg-[#f4f6f2]/50 dark:bg-[#0f1411]/50 relative">
              {messages.map((msg, idx) => (
                <ChatMessage key={idx} message={msg} />
              ))}
              
              {messages.length === 1 && (
                <QuickReplies onSelect={handleSend} />
              )}
              
              {isLoading && (
                <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="flex w-full justify-start mb-4"
                >
                  <div className="bg-white dark:bg-[#161c18] border border-[#e2e7e3] dark:border-[#243028] px-4 py-3 rounded-2xl rounded-tl-xs flex items-center gap-3 shadow-xs">
                    <Loader2 size={16} className="animate-spin text-[#2b5944] dark:text-[#529d78]" />
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Generating answer...</span>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <div className="p-4 bg-white dark:bg-[#161c18] border-t border-[#e2e7e3] dark:border-[#243028]">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend(input);
                }}
                className="flex items-center gap-2 relative bg-[#f4f6f2] dark:bg-[#0f1411] border border-[#e2e7e3] dark:border-[#243028] rounded-full px-3 py-1.5"
              >
                <button
                  type="button"
                  onClick={toggleVoiceListen}
                  className={`p-2 rounded-full transition-colors cursor-pointer ${isListening ? 'bg-red-500 text-white animate-pulse' : 'text-gray-400 hover:text-[#2b5944]'}`}
                  title={isListening ? 'Listening...' : 'Speak message'}
                >
                  <Mic size={18} />
                </button>

                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 bg-transparent text-sm outline-none px-2 text-gray-800 dark:text-gray-100 placeholder-gray-400"
                  disabled={isLoading}
                />

                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="bg-[#2b5944] hover:bg-[#224736] disabled:opacity-40 text-white rounded-full p-2.5 transition-all flex items-center justify-center cursor-pointer"
                >
                  <Send size={15} />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}


