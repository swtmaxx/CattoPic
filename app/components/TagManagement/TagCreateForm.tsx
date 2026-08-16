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
    <div className="card p-4 sm:p-6">
      <h3 className="mb-4 text-base font-semibold text-[var(--app-ink)]">
        创建新标签
      </h3>
      <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row sm:gap-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="输入标签名称..."
          className="input-primary min-w-0 flex-1 px-4 py-2.5 placeholder:text-[var(--app-faint)]"
          disabled={isProcessing}
        />
        <motion.button
          type="submit"
          disabled={!name.trim() || isProcessing || isSubmitting}
          className="btn-primary px-5 py-2.5 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
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
