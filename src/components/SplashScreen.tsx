'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';

interface SplashScreenProps {
  onFinish?: () => void;
}

export function SplashScreen({ onFinish }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);
  const logoRef = useRef<HTMLImageElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const splashContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // GSAP Entrance & Gentle Float Motion for Splash Emblem
    if (logoRef.current && titleRef.current) {
      gsap.fromTo(
        logoRef.current,
        { opacity: 0, scale: 0.88, y: 12 },
        { opacity: 1, scale: 1, y: 0, duration: 0.9, ease: 'power3.out' }
      );

      gsap.fromTo(
        titleRef.current,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.9, delay: 0.15, ease: 'power3.out' }
      );

      gsap.to(logoRef.current, {
        y: -6,
        repeat: -1,
        yoyo: true,
        duration: 2.2,
        ease: 'sine.inOut',
      });
    }

    // 2.0s Duration -> Clean Dissolve Exit
    const timer = setTimeout(() => {
      if (splashContainerRef.current) {
        gsap.to(splashContainerRef.current, {
          opacity: 0,
          scale: 1.03,
          filter: 'blur(6px)',
          duration: 0.5,
          ease: 'power2.inOut',
          onComplete: () => {
            setIsVisible(false);
            if (onFinish) onFinish();
          },
        });
      } else {
        setIsVisible(false);
        if (onFinish) onFinish();
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          ref={splashContainerRef}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center select-none overflow-hidden bg-[var(--bg-page)] text-[var(--text-primary)] transition-colors duration-300"
        >
          {/* Subtle Ambient Glow Aura */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full ambient-glow pointer-events-none opacity-50" />

          {/* Pure Centerpiece: Floating 3D Logo Emblem + Title */}
          <div className="flex flex-col items-center justify-center z-10 text-center px-4">
            <div className="mb-6 flex items-center justify-center">
              <img
                ref={logoRef}
                src="/logo.png"
                alt="aitsbot.ai Logo"
                className="w-24 h-24 sm:w-32 sm:h-32 object-contain filter drop-shadow-md"
              />
            </div>

            <h1 
              ref={titleRef}
              className="font-display text-5xl sm:text-7xl font-normal tracking-tight drop-shadow-md text-[var(--text-primary)]"
            >
              aitsbot<span className="text-[var(--brand-green)]">.ai</span>
            </h1>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
