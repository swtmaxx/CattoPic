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
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">格式</h3>
      <div className="flex bg-gray-100 dark:bg-gray-700 rounded-xl p-1 gap-1">
        {options.map((option) => {
          const isSelected = value === option.value;
          return (
            <motion.button
              key={option.value}
              onClick={() => onChange(option.value)}
              className={`
                relative flex-1 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200
                ${isSelected
                  ? 'text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }
              `}
              whileTap={{ scale: 0.98 }}
            >
              {isSelected && (
                <motion.div
                  layoutId="format-bg"
                  className="absolute inset-0 bg-indigo-500 rounded-lg"
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                />
              )}
              <span className="relative z-10 flex flex-col items-center gap-0.5">
                <span>{option.label}</span>
                <span className={`text-xs font-normal ${isSelected ? 'text-white/80' : 'text-gray-400 dark:text-gray-500'}`}>
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
