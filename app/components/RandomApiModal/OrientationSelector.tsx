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
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">方向</h3>
      <div className="flex bg-gray-100 dark:bg-gray-700 rounded-xl p-1 gap-1">
        {options.map((option) => {
          const isSelected = value === option.value;
          return (
            <motion.button
              key={option.value}
              onClick={() => onChange(option.value)}
              className={`
                relative flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200
                ${isSelected
                  ? 'text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }
              `}
              whileTap={{ scale: 0.98 }}
            >
              {isSelected && (
                <motion.div
                  layoutId="orientation-bg"
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
