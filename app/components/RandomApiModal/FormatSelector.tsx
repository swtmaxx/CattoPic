'use client';

import { motion } from 'motion/react';
import type { Format } from './index';

interface FormatSelectorProps {
  value: Format;
  onChange: (value: Format) => void;
}

const options: { value: Format; label: string; description: string }[] = [
  { value: 'auto', label: 'Auto', description: '自动选择' },
  { value: 'original', label: 'Original', description: '原始格式' },
  { value: 'webp', label: 'WebP', description: '压缩格式' },
  { value: 'avif', label: 'AVIF', description: '高效压缩' },
];

export default function FormatSelector({ value, onChange }: FormatSelectorProps) {
  return (
    <div className="space-y-3">
      <h3 className="section-title text-sm">格式</h3>
      <div className="flex gap-1 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-muted)] p-1">
        {options.map((option) => {
          const isSelected = value === option.value;
          return (
            <motion.button
              key={option.value}
              onClick={() => onChange(option.value)}
              className={`
                relative flex min-h-11 flex-1 items-center justify-center px-1 py-2.5 text-sm font-medium transition-colors duration-200 sm:px-3
                ${isSelected
                  ? 'text-white'
                  : 'text-[var(--app-muted)] hover:text-[var(--app-ink)]'
                }
              `}
              whileTap={{ scale: 0.98 }}
            >
              {isSelected && (
                <motion.div
                  layoutId="format-bg"
                    className="absolute inset-0 rounded-md bg-[var(--accent-600)]"
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                />
              )}
              <span className="relative z-10 flex flex-col items-center gap-0.5">
                <span>{option.label}</span>
                <span className={`text-xs font-normal ${isSelected ? 'text-white/80' : 'text-[var(--app-faint)]'}`}>
                  {option.description}
                </span>
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
