'use client';

import { motion } from 'motion/react';
import type { Orientation } from './index';

interface OrientationSelectorProps {
  value: Orientation;
  onChange: (value: Orientation) => void;
}

const options: { value: Orientation; label: string; description: string }[] = [
  { value: 'auto', label: 'Auto', description: '自动检测设备' },
  { value: 'landscape', label: 'Landscape', description: '横向' },
  { value: 'portrait', label: 'Portrait', description: '纵向' },
];

export default function OrientationSelector({ value, onChange }: OrientationSelectorProps) {
  return (
    <div className="space-y-3">
      <h3 className="section-title text-sm">方向</h3>
      <div className="flex gap-1 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-muted)] p-1">
        {options.map((option) => {
          const isSelected = value === option.value;
          return (
            <motion.button
              key={option.value}
              onClick={() => onChange(option.value)}
              className={`
                relative flex min-h-11 flex-1 items-center justify-center px-2 py-2.5 text-sm font-medium transition-colors duration-200 sm:px-4
                ${isSelected
                  ? 'text-white'
                  : 'text-[var(--app-muted)] hover:text-[var(--app-ink)]'
                }
              `}
              whileTap={{ scale: 0.98 }}
            >
              {isSelected && (
                <motion.div
                  layoutId="orientation-bg"
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
