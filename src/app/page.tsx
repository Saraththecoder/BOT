'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import { 
  HiSun, 
  HiMoon, 
  HiMicrophone, 
  HiPaperClip, 
  HiPaperAirplane, 
  HiMiniLightBulb, 
  HiDocumentText, 
  HiCodeBracket, 
  HiSparkles, 
  HiInformationCircle, 
  HiPhone, 
  HiBuildingOffice2, 
  HiAcademicCap, 
  HiArrowTopRightOnSquare, 
  HiSpeakerWave, 
  HiSpeakerXMark, 
  HiPlusCircle, 
  HiArrowLeft
} from 'react-icons/hi2';
import { CgSpinner } from 'react-icons/cg';
import { ChatMessage, Message } from '@/components/ChatMessage';
import { SplashScreen } from '@/components/SplashScreen';

const QUICK_ACTIONS = [
  { label: 'Admission process', icon: HiMiniLightBulb, prompt: 'What is the admission process for B.Tech at AITS Tirupati?' },
  { label: 'EAPCET Cutoffs 2025', icon: HiDocumentText, prompt: 'What are the AP EAPCET cutoffs and counseling code (AITT) for AITS Tirupati?' },
  { label: 'Courses & Fee structure', icon: HiCodeBracket, prompt: 'What engineering courses and fee structures are available at AITS?' },
  { label: 'Campus Placements', icon: HiSparkles, prompt: 'What are the recent placement stats, packages, and top recruiters at AITS Tirupati?' }
];

export default function Home() {
  const [showSplash, setShowSplash] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasStartedChat, setHasStartedChat] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [voiceNetworkFailed, setVoiceNetworkFailed] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);

  const [sessionId] = useState(() => Math.random().toString(36).substring(7));
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const capturedTextRef = useRef('');
  const heroContainerRef = useRef<HTMLDivElement>(null);

  // Sync Theme state on initial load
  useEffect(() => {
    const isDarkNow = document.documentElement.classList.contains('dark');
    setIsDarkMode(isDarkNow);
  }, []);

  // Toggle Dark / Light Mode
  const toggleDarkMode = () => {
    const nextDark = !isDarkMode;
    setIsDarkMode(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('aitsbot_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('aitsbot_theme', 'light');
    }
  };

  // GSAP Entrance Timeline Animation — Runs strictly after Splash unmounts
  useEffect(() => {
    if (showSplash) return;

    const timer = setTimeout(() => {
      const ctx = gsap.context(() => {
        gsap.fromTo(
          '.gsap-animate',
          { opacity: 0, y: 15 },
          {
            opacity: 1,
            y: 0,
            duration: 0.7,
            stagger: 0.07,
            ease: 'power2.out',
          }
        );
      }, heroContainerRef);

      return () => ctx.revert();
    }, 40);

    return () => clearTimeout(timer);
  }, [hasStartedChat, showSplash]);

  // Magnetic Button Hover Animation
  const handleMagneticMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const btn = e.currentTarget;
    const rect = btn.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    gsap.to(btn, { x: x * 0.25, y: y * 0.25, duration: 0.3, ease: 'power2.out' });
  };

  const handleMagneticLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    gsap.to(e.currentTarget, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.4)' });
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (hasStartedChat) {
      scrollToBottom();
    }
  }, [messages, isLoading, hasStartedChat]);

  // Main Handle Send Query
  const handleSend = async (text: string, isVoice: boolean = false) => {
    if (!text.trim()) return;

    setHasStartedChat(true);
    const userMsg: Message = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLiveTranscript('');
    capturedTextRef.current = '';
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
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          assistantContent += chunk;
          setMessages((prev) => {
            const updated = [...prev];
            const lastIndex = updated.length - 1;
            if (lastIndex >= 0 && updated[lastIndex].role === 'assistant') {
              updated[lastIndex] = { role: 'assistant', content: assistantContent };
            }
            return updated;
          });
        }
      }

      if (isVoice && assistantContent && typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(assistantContent.replace(/[*#_`]/g, ''));
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        setIsSpeaking(true);
        window.speechSynthesis.speak(utterance);
      }

    } catch (error) {
      console.error('Error fetching stream:', error);
      setMessages((prev) => [
        ...prev.filter(m => m.content !== ''),
        { role: 'assistant', content: 'I encountered an issue connecting to the AITS knowledge stream. Please try sending your query again.' }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle Hardware-Activated Speech Recognition Dictation
  const toggleVoiceListen = async () => {
    setVoiceError(null);

    if (isListening) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
      setIsListening(false);
      return;
    }

    if (typeof window === 'undefined') return;

    // Cancel any active speech synthesis output before recording
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }

    // Request Hardware Mic Permissions First, then immediately release track so Chrome is not actively recording when Speech Recognition starts
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Crucial for Android / Mobile Chrome: stop tracks immediately so hardware mic is freed for Google Speech Service
        stream.getTracks().forEach(t => t.stop());
      }
    } catch (micErr) {
      console.warn('Microphone permission warning:', micErr);
      setVoiceError('Microphone permission needed. Allow mic access in your browser address bar.');
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceError('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = false; // Single-phrase mode avoids Chrome network streaming dropouts
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setLiveTranscript('');
        capturedTextRef.current = '';
        setVoiceNetworkFailed(false);
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcriptChunk = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += transcriptChunk + ' ';
          } else {
            interim += transcriptChunk;
          }
        }

        const fullDisplay = (capturedTextRef.current + ' ' + final + interim).trim();
        if (final) {
          capturedTextRef.current = (capturedTextRef.current + ' ' + final).trim();
        }

        setLiveTranscript(fullDisplay);
        setInput(fullDisplay);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error event:', event.error);
        setIsListening(false);
        if (event.error === 'network') {
          setVoiceNetworkFailed(true);
          setVoiceError('Chrome speech network blocked by ad-blocker/VPN. Pause ad-blocker or tap mic to retry!');
        } else if (event.error === 'not-allowed') {
          setVoiceError('Microphone permission needed. Allow mic access in browser address bar.');
        } else if (event.error !== 'aborted') {
          setVoiceError(`Voice note: ${event.error}. Please tap mic and speak again.`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        const finalQuery = capturedTextRef.current.trim();
        capturedTextRef.current = '';
        if (finalQuery) {
          handleSend(finalQuery, true);
        }
      };

      recognition.start();
    } catch (err: any) {
      console.error('Speech recognition exception:', err);
      setIsListening(false);
      setVoiceError('Could not start voice recognition. Please try again.');
    }
  };

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

  // Reset Conversation back to initial Hero Hub
  const resetToHero = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setHasStartedChat(false);
    setLiveTranscript('');
    setVoiceError(null);
    setVoiceNetworkFailed(false);
    setMessages([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    handleSend(input);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)] transition-colors duration-300 flex flex-col justify-between relative overflow-hidden select-none">

      <AnimatePresence mode="wait">
        {/* PHASE 1: SPLASH SCREEN ONLY */}
        {showSplash ? (
          <SplashScreen key="splash" onFinish={() => setShowSplash(false)} />
        ) : (
          /* PHASE 2: MAIN HOMEPAGE MOUNTS & GSAP ENTRANCE EXECUTES */
          <motion.div
            key="main-app"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="min-h-screen flex flex-col justify-between relative w-full"
          >
            {/* Ambient Background Glow Mesh */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full ambient-glow pointer-events-none z-0" />

            {/* Header Bar */}
            <header className="max-w-7xl w-full mx-auto px-3.5 sm:px-6 py-3 sm:py-5 flex items-center justify-between z-20 gsap-animate gap-2">
              {/* Brand Logo */}
              <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
                {hasStartedChat && (
                  <button
                    onClick={resetToHero}
                    className="p-1.5 sm:p-2 rounded-full border bg-[var(--bg-card)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer mr-0.5 shadow-xs"
                    title="Back to Voice Hub"
                  >
                    <HiArrowLeft size={16} />
                  </button>
                )}

                <div 
                  onClick={resetToHero}
                  className="flex items-center gap-2 sm:gap-2.5 cursor-pointer group"
                >
                  <img 
                    src="/logo.png" 
                    alt="aitsbot.ai logo" 
                    className="w-8 h-8 sm:w-9 sm:h-9 object-contain group-hover:scale-105 transition-transform shrink-0" 
                  />
                  <span className="font-bold text-base sm:text-xl tracking-tight text-[var(--text-primary)] whitespace-nowrap">
                    aitsbot<span className="text-[var(--brand-green)]">.ai</span>
                  </span>
                  <span className="ml-1 text-[9px] sm:text-[10px] uppercase font-bold tracking-wider px-2 sm:px-2.5 py-0.5 rounded-full bg-[var(--bg-hover)] border border-[var(--border-subtle)] text-[var(--brand-green)] whitespace-nowrap hidden min-[540px]:inline-flex">
                    AITS Tirupati
                  </span>
                </div>
              </div>

              {/* Header Right Controls */}
              <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
                {hasStartedChat && (
                  <button
                    onClick={resetToHero}
                    onMouseMove={handleMagneticMove}
                    onMouseLeave={handleMagneticLeave}
                    className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs font-semibold bg-[var(--bg-hover)] text-[var(--brand-green)] hover:bg-[var(--brand-green)] hover:text-white transition-all shadow-xs cursor-pointer"
                  >
                    <HiPlusCircle size={15} />
                    <span>New Chat</span>
                  </button>
                )}

                {hasStartedChat && (
                  <button
                    onClick={speakLastMessage}
                    className={`p-2 sm:p-2.5 rounded-full border transition-all cursor-pointer ${
                      isSpeaking 
                        ? 'bg-amber-500 text-white border-amber-600 animate-pulse shadow-md' 
                        : 'bg-[var(--bg-card)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                    title={isSpeaking ? 'Stop Audio Readout' : 'Read Latest Response Aloud'}
                  >
                    {isSpeaking ? <HiSpeakerXMark size={16} /> : <HiSpeakerWave size={16} />}
                  </button>
                )}

                <button
                  onClick={() => setShowInfoModal(!showInfoModal)}
                  onMouseMove={handleMagneticMove}
                  onMouseLeave={handleMagneticLeave}
                  className="p-2 sm:p-2.5 rounded-full border bg-[var(--bg-card)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--brand-green)] transition-all shadow-xs cursor-pointer flex items-center gap-1.5 text-xs font-medium"
                  title="AITS Tirupati Details"
                >
                  <HiInformationCircle size={16} />
                  <span className="hidden sm:inline">College Info</span>
                </button>

                <button
                  onClick={toggleDarkMode}
                  className="p-2 sm:p-2.5 rounded-full border bg-[var(--bg-card)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--brand-green)] transition-all shadow-xs cursor-pointer"
                  title="Toggle Light/Dark Theme"
                >
                  {isDarkMode ? <HiSun size={16} /> : <HiMoon size={16} />}
                </button>

                {/* Clean User Profile Pill */}
                <div className="flex items-center gap-2 p-1 sm:px-3 sm:py-1.5 rounded-full shadow-xs border bg-[var(--bg-card)] border-[var(--border-subtle)] text-[var(--text-primary)] shrink-0">
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#2b5944] text-white flex items-center justify-center font-bold text-[11px] sm:text-xs shrink-0">
                    SK
                  </div>
                  <div className="text-left hidden md:block pr-1">
                    <p className="text-xs font-medium leading-none text-[var(--text-primary)]">Good evening, Student</p>
                    <p className="text-[10px] mt-0.5 text-[var(--text-muted)]">Let's build something great.</p>
                  </div>
                </div>
              </div>
            </header>

            {/* MAIN VIEWPORT CONTAINER */}
            <main ref={heroContainerRef} className="flex-1 flex flex-col items-center justify-between px-3.5 sm:px-4 py-2 sm:py-4 max-w-4xl mx-auto w-full relative z-10 overflow-hidden">

              {/* ----------------- STATE 1: HERO HUB VIEW ----------------- */}
              {!hasStartedChat && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex-1 flex flex-col items-center justify-center w-full text-center relative py-4 sm:py-6"
                >
                  {/* Ethereal Organic Wave Graphic Background */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40 dark:opacity-25 z-0 overflow-hidden">
                    <svg
                      viewBox="0 0 1200 400"
                      className="w-full h-full max-w-6xl animate-float-wave text-[#2b5944]"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M-100 200 C 150 100, 300 300, 600 200 C 900 100, 1050 300, 1300 200"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeDasharray="6 6"
                      />
                      <path
                        d="M-100 220 C 180 320, 420 80, 600 220 C 780 360, 1020 120, 1300 220"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        opacity="0.6"
                      />
                      <path
                        d="M-100 180 C 220 80, 380 320, 600 180 C 820 40, 980 280, 1300 180"
                        stroke="currentColor"
                        strokeWidth="1"
                        opacity="0.4"
                      />
                    </svg>
                  </div>

                  {/* Eyebrow */}
                  <p className="gsap-animate text-[10px] sm:text-xs uppercase font-bold tracking-[0.2em] sm:tracking-[0.3em] mb-2 sm:mb-3 relative z-10 text-[var(--brand-green)]">
                    ✦ YOUR AI CAMPUS COMPANION
                  </p>

                  {/* Main Display Title */}
                  <h1 className="gsap-animate font-display text-4xl sm:text-7xl md:text-8xl font-normal tracking-tight mb-2 sm:mb-3 relative z-10 drop-shadow-xs text-[var(--text-primary)]">
                    Just talk to it.
                  </h1>

                  {/* Subtitle */}
                  <p className="gsap-animate text-sm sm:text-base md:text-xl max-w-xl mx-auto font-normal mb-6 sm:mb-8 px-2 relative z-10 text-[var(--text-secondary)]">
                    Ask anything. Admissions, EAPCET cutoffs, courses, or campus life.
                  </p>

                  {/* Central Voice Button Hub */}
                  <div className="gsap-animate relative mb-8 sm:mb-10 flex flex-col items-center justify-center z-10">
                    <div className="relative w-32 h-32 sm:w-36 sm:h-36 flex items-center justify-center">
                      <div className="absolute inset-0 rounded-full border border-[var(--border-subtle)] animate-pulse-ring" />
                      <div className="absolute inset-3 rounded-full border border-[var(--border-subtle)] animate-pulse-ring" style={{ animationDelay: '1s' }} />
                      <div className="absolute inset-5 rounded-full opacity-70 bg-[var(--bg-hover)]" />

                      <button
                        onClick={toggleVoiceListen}
                        onMouseMove={handleMagneticMove}
                        onMouseLeave={handleMagneticLeave}
                        className={`relative z-10 w-20 h-20 sm:w-22 sm:h-22 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 cursor-pointer ${
                          isListening
                            ? 'bg-red-500 text-white scale-105 animate-pulse shadow-red-500/40'
                            : 'bg-[#2b5944] hover:bg-[#224736] text-white hover:scale-105 shadow-[#2b5944]/30'
                        }`}
                        title={isListening ? 'Listening...' : 'Tap to start talking'}
                      >
                        {isListening ? (
                          <div className="flex items-center gap-1">
                            <div className="w-1 bg-white animate-bar-1 rounded-full" />
                            <div className="w-1 bg-white animate-bar-2 rounded-full" />
                            <div className="w-1 bg-white animate-bar-3 rounded-full" />
                            <div className="w-1 bg-white animate-bar-4 rounded-full" />
                          </div>
                        ) : (
                          <HiMicrophone size={34} className="text-white" />
                        )}
                      </button>
                    </div>

                    <p className={`text-xs md:text-sm font-medium max-w-md mx-auto mt-3 transition-colors ${voiceError ? 'text-red-500 font-semibold' : 'text-[var(--text-secondary)]'}`}>
                      {isListening 
                        ? (liveTranscript ? `Listening: "${liveTranscript}"` : 'Listening... Speak your question now') 
                        : (voiceError || 'Tap to start talking')}
                    </p>

                    {isListening && (
                      <button
                        onClick={() => {
                          if (recognitionRef.current) {
                            try { recognitionRef.current.stop(); } catch (e) {}
                          }
                        }}
                        className="mt-3 px-4 py-1.5 rounded-full bg-red-600 text-white text-xs font-semibold shadow-md hover:bg-red-700 transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <HiPaperAirplane size={13} />
                        <span>Done Speaking — Send Query</span>
                      </button>
                    )}
                  </div>

                  {/* Quick Action Suggestion Chips */}
                  <div className="gsap-animate flex flex-wrap items-center justify-center gap-2 sm:gap-2.5 mb-6 sm:mb-8 max-w-2xl relative z-10">
                    {QUICK_ACTIONS.map((action, idx) => {
                      const Icon = action.icon;
                      return (
                        <button
                          key={idx}
                          onClick={() => handleSend(action.prompt, true)}
                          onMouseMove={handleMagneticMove}
                          onMouseLeave={handleMagneticLeave}
                          className="flex items-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-full border bg-[var(--bg-card)] border-[var(--border-subtle)] text-[var(--text-primary)] text-[11px] sm:text-xs font-medium shadow-xs hover:border-[var(--brand-green)] hover:bg-[var(--bg-hover)] transition-all duration-200 cursor-pointer"
                        >
                          <Icon size={15} className="text-[var(--brand-green)]" />
                          <span>{action.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Divider */}
                  <div className="gsap-animate w-full max-w-sm flex items-center justify-center gap-4 mb-3 relative z-10">
                    <div className="flex-1 h-px bg-[var(--border-subtle)]" />
                    <span className="text-[10px] uppercase tracking-widest font-semibold text-[var(--text-muted)]">
                      OR TYPE INSTEAD
                    </span>
                    <div className="flex-1 h-px bg-[var(--border-subtle)]" />
                  </div>
                </motion.div>
              )}

              {/* ----------------- STATE 2: ACTIVE CONVERSATION STREAM VIEW ----------------- */}
              {hasStartedChat && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex-1 flex flex-col w-full max-w-3xl h-[68vh] sm:h-[65vh] min-h-[380px] sm:min-h-[450px] glass-panel rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 shadow-2xl mb-3 sm:mb-4 overflow-hidden relative"
                >
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-[var(--border-subtle)] text-xs text-[var(--text-secondary)]">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="font-semibold text-[var(--text-primary)]">aitsbot.ai Live Stream</span>
                    </div>
                    <button
                      onClick={resetToHero}
                      className="hover:underline font-medium cursor-pointer text-[var(--brand-green)]"
                    >
                      Clear & Back
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto pr-1 space-y-4">
                    {messages.map((msg, idx) => (
                      <ChatMessage key={idx} message={msg} />
                    ))}

                    {isLoading && (
                      <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="flex w-full justify-start mb-4"
                      >
                        <div className="border border-[var(--border-subtle)] bg-[var(--bg-card)] px-4 py-3 rounded-2xl rounded-tl-xs flex items-center gap-3 shadow-xs">
                          <CgSpinner size={18} className="animate-spin text-[var(--brand-green)]" />
                          <span className="text-xs font-medium text-[var(--text-secondary)]">Assistant is thinking...</span>
                        </div>
                      </motion.div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </motion.div>
              )}

              {/* ----------------- PINNED INPUT BAR ----------------- */}
              <form
                onSubmit={handleSubmit}
                className="gsap-animate w-full max-w-2xl relative flex items-center border bg-[var(--bg-card)] border-[var(--border-subtle)] focus-within:border-[var(--brand-green)] rounded-full px-3 py-1.5 sm:px-4 sm:py-2.5 shadow-xl transition-all z-20 my-2"
              >
                <button
                  type="button"
                  onClick={() => alert('Attach feature: Select document or screenshot to query AITS AI.')}
                  className="p-1.5 sm:p-2 transition-colors cursor-pointer text-[var(--text-muted)] hover:text-[var(--brand-green)]"
                  title="Attach file"
                >
                  <HiPaperClip size={18} />
                </button>

                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 bg-transparent border-none outline-none px-2.5 sm:px-3 text-xs sm:text-sm md:text-base text-[var(--text-primary)] placeholder-[var(--text-muted)]"
                  disabled={isLoading}
                />

                <button
                  type="button"
                  onClick={toggleVoiceListen}
                  className={`p-1.5 sm:p-2 rounded-full transition-colors cursor-pointer mr-1 ${
                    isListening ? 'bg-red-500 text-white animate-pulse' : 'text-[var(--text-muted)] hover:text-[var(--brand-green)]'
                  }`}
                  title={isListening ? 'Listening...' : 'Speak query'}
                >
                  <HiMicrophone size={18} />
                </button>

                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#2b5944] hover:bg-[#224736] disabled:opacity-30 text-white flex items-center justify-center transition-all cursor-pointer shadow-md shrink-0"
                >
                  <HiPaperAirplane size={16} />
                </button>
              </form>
            </main>

            <footer className="w-full max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 text-[11px] uppercase tracking-widest border-t border-[var(--border-subtle)] text-[var(--text-muted)] z-10">
              <span>SMARTER CONVERSATIONS</span>
              <div className="hidden md:block w-32 h-px bg-[var(--border-subtle)]" />
              <span>BRIGHTER TOMORROW</span>
            </footer>

            <AnimatePresence>
              {showInfoModal && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
                  onClick={() => setShowInfoModal(false)}
                >
                  <motion.div
                    initial={{ scale: 0.95, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.95, y: 20 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-primary)] rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl relative text-left"
                  >
                    <h2 className="text-xl font-bold mb-1 text-[var(--text-primary)]">
                      Annamacharya Institute of Technology & Sciences
                    </h2>
                    <p className="text-xs font-semibold mb-4 text-[var(--brand-green)]">
                      Tirupati, Andhra Pradesh (Autonomous)
                    </p>

                    <div className="space-y-3 text-xs md:text-sm mb-6 text-[var(--text-secondary)]">
                      <p className="flex items-center gap-2">
                        <HiAcademicCap size={18} className="text-[var(--brand-green)] shrink-0" />
                        <span>Approved by AICTE, NBA & NAAC 'A' Grade Accredited</span>
                      </p>
                      <p className="flex items-center gap-2">
                        <HiBuildingOffice2 size={18} className="text-[var(--brand-green)] shrink-0" />
                        <span>EAMCET / ICET / ECET Counseling Code: <strong className="text-[var(--text-primary)]">AITT</strong></span>
                      </p>
                      <p className="flex items-center gap-2">
                        <HiPhone size={18} className="text-[var(--brand-green)] shrink-0" />
                        <span>Admissions Office: <strong className="text-[var(--text-primary)]">9948149222 / 0877-2285609</strong></span>
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-[var(--border-subtle)]">
                      <a
                        href="https://aits-tpt.edu.in"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-[var(--brand-green)] font-semibold hover:underline"
                      >
                        Visit Official Website <HiArrowTopRightOnSquare size={14} />
                      </a>

                      <button
                        onClick={() => setShowInfoModal(false)}
                        className="px-4 py-2 rounded-full bg-[#2b5944] hover:bg-[#224736] text-white text-xs font-medium cursor-pointer shadow-md"
                      >
                        Close
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
