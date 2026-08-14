'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { PlusIcon, Spinner } from '../ui/icons';

interface TagCreateFormProps {
  onSubmit: (name: string) => Promise<boolean>;
  isProcessing: boolean;
}

export default function TagCreateForm({ onSubmit, isProcessing }: TagCreateFormProps) {
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const success = await onSubmit(name.trim());
    setIsSubmitting(false);

    if (success) {
      setName('');
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6 border border-gray-100 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        创建新标签
      </h3>
      <form onSubmit={handleSubmit} className="flex space-x-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="输入标签名称..."
          className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 transition-all"
          disabled={isProcessing}
        />
        <motion.button
          type="submit"
          disabled={!name.trim() || isProcessing || isSubmitting}
          className="flex items-center space-x-2 px-5 py-2.5 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {isSubmitting ? (
            <>
              <Spinner className="h-4 w-4" />
              <span>创建中...</span>
            </>
          ) : (
            <>
              <PlusIcon className="h-4 w-4" />
              <span>创建标签</span>
            </>
          )}
        </motion.button>
      </form>
    </div>
  );
}
