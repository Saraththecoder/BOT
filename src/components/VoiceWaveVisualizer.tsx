'use client';

import React, { useEffect, useRef } from 'react';

interface VoiceWaveVisualizerProps {
  isActive: boolean;
  mode?: 'listening' | 'speaking' | 'idle';
  audioStream?: MediaStream | null;
  className?: string;
}

export function VoiceWaveVisualizer({
  isActive,
  mode = 'idle',
  audioStream,
  className = '',
}: VoiceWaveVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Setup Web Audio API Analyser if stream is available
  useEffect(() => {
    if (!isActive || !audioStream) {
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        try {
          audioCtxRef.current.close();
        } catch (e) {}
        audioCtxRef.current = null;
      }
      analyserRef.current = null;
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      const audioCtx = new AudioCtx();
      const source = audioCtx.createMediaStreamSource(audioStream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);

      audioCtxRef.current = audioCtx;
      analyserRef.current = analyser;
    } catch (err) {
      console.warn('AudioContext setup error:', err);
    }

    return () => {
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        try {
          audioCtxRef.current.close();
        } catch (e) {}
        audioCtxRef.current = null;
      }
      analyserRef.current = null;
    };
  }, [isActive, audioStream]);

  // Main Canvas Render Loop (Fluid Morphing Waves + Frequency Bars)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let step = 0;
    const dataArray = new Uint8Array(32);

    const render = () => {
      const width = (canvas.width = canvas.offsetWidth * (window.devicePixelRatio || 1));
      const height = (canvas.height = canvas.offsetHeight * (window.devicePixelRatio || 1));

      ctx.clearRect(0, 0, width, height);

      // Get real audio frequency data if available
      let audioVolume = 0.5;
      if (analyserRef.current) {
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        audioVolume = Math.min(1.5, Math.max(0.1, (sum / dataArray.length) / 80));
      } else if (isActive) {
        // Dynamic simulated voice cadence (organic speech amplitude fluctuation)
        audioVolume = 0.4 + Math.sin(step * 0.08) * 0.35 + Math.cos(step * 0.15) * 0.2;
      } else {
        audioVolume = 0.05;
      }

      step += isActive ? 0.05 : 0.01;

      // Color scheme based on mode (Listening = Red/Emerald, Speaking = Amber/Green)
      const colors = mode === 'listening'
        ? [
            'rgba(239, 68, 68, 0.7)',  // Red glow
            'rgba(16, 185, 129, 0.8)', // Emerald
            'rgba(52, 211, 153, 0.5)', // Mint
            'rgba(244, 63, 94, 0.6)'   // Rose
          ]
        : mode === 'speaking'
        ? [
            'rgba(245, 158, 11, 0.8)', // Amber
            'rgba(16, 185, 129, 0.8)', // Emerald
            'rgba(59, 130, 246, 0.6)', // Blue
            'rgba(251, 191, 36, 0.5)'  // Gold
          ]
        : [
            'rgba(16, 185, 129, 0.2)',
            'rgba(99, 102, 241, 0.1)'
          ];

      // Render Multi-Layer Morphing Organic Sine Waves
      const waveCount = colors.length;
      for (let w = 0; w < waveCount; w++) {
        ctx.beginPath();
        ctx.lineWidth = isActive ? 2.5 * (window.devicePixelRatio || 1) : 1.5;
        ctx.strokeStyle = colors[w];

        const centerY = height / 2;
        const amplitude = (height / 3.5) * audioVolume * (1 - w * 0.18);
        const frequency = 0.008 + w * 0.003;
        const speed = step * (1 + w * 0.4);

        ctx.moveTo(0, centerY);

        for (let x = 0; x <= width; x += 5) {
          const y =
            centerY +
            Math.sin(x * frequency + speed) * amplitude * Math.sin((x / width) * Math.PI) +
            Math.cos(x * frequency * 1.5 - speed * 0.8) * (amplitude * 0.4);
          ctx.lineTo(x, y);
        }

        ctx.stroke();
      }

      // Render Central Frequency Equalizer Bars for extra voice crispness
      if (isActive) {
        const barCount = 18;
        const barWidth = 4 * (window.devicePixelRatio || 1);
        const gap = 6 * (window.devicePixelRatio || 1);
        const totalWidth = barCount * (barWidth + gap);
        const startX = (width - totalWidth) / 2;

        for (let i = 0; i < barCount; i++) {
          const freqVal = dataArray[i % dataArray.length] || Math.abs(Math.sin(step * 2 + i * 0.5) * 200);
          const barHeight = Math.max(
            6 * (window.devicePixelRatio || 1),
            ((freqVal / 255) * (height * 0.7)) * audioVolume
          );

          const x = startX + i * (barWidth + gap);
          const y = (height - barHeight) / 2;

          ctx.fillStyle = mode === 'listening' 
            ? 'rgba(239, 68, 68, 0.85)' 
            : 'rgba(43, 89, 68, 0.85)';
          
          // Rounded Pill Bar
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barHeight, 4);
          ctx.fill();
        }
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isActive, mode]);

  return (
    <div className={`relative flex items-center justify-center w-full overflow-hidden ${className}`}>
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
      />
    </div>
  );
}
