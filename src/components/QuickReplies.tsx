import React from 'react';
import { HiSparkles, HiMiniLightBulb, HiDocumentText, HiCodeBracket } from 'react-icons/hi2';

interface QuickRepliesProps {
  onSelect: (text: string) => void;
}

const ACTION_CHIPS = [
  { label: 'Admission process', icon: HiMiniLightBulb, prompt: 'What is the admission process for B.Tech at AITS Tirupati?' },
  { label: 'EAPCET Cutoffs 2025', icon: HiDocumentText, prompt: 'What are the AP EAPCET cutoffs and counseling codes for AITS?' },
  { label: 'Courses & Fees', icon: HiCodeBracket, prompt: 'What courses and fee structure are offered at AITS Tirupati?' },
  { label: 'Campus Placements', icon: HiSparkles, prompt: 'Tell me about placement stats and top recruiters at AITS Tirupati.' }
];

export function QuickReplies({ onSelect }: QuickRepliesProps) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2.5 my-4">
      {ACTION_CHIPS.map((chip, index) => {
        const Icon = chip.icon;
        return (
          <button
            key={index}
            onClick={() => onSelect(chip.prompt)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-full border bg-[var(--bg-card)] border-[var(--border-subtle)] text-[var(--text-primary)] text-xs font-medium shadow-xs hover:border-[var(--brand-green)] hover:bg-[var(--bg-hover)] transition-all duration-200 cursor-pointer"
          >
            <Icon size={15} className="text-[var(--brand-green)]" />
            <span>{chip.label}</span>
          </button>
        );
      })}
    </div>
  );
}
