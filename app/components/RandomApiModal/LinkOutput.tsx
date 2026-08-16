'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ClipboardCopyIcon, CheckIcon } from '../ui/icons';
import { copyToClipboard } from '../../utils/copyImageUtils';
import { showToast } from '../ToastContainer';

interface LinkOutputProps {
  url: string;
}

export default function LinkOutput({ url }: LinkOutputProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const success = await copyToClipboard(url);
    if (!success) {
      showToast('复制失败', 'error');
      return;
    }

    setCopied(true);
    showToast('URL 已复制', 'success');
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-3">
      <h3 className="section-title text-sm">生成的 URL</h3>

      <div className="relative group">
        <div className="rounded-xl bg-slate-900 p-4 pr-16 font-mono text-sm text-slate-300 dark:bg-slate-950">
          <code className="break-all">{url}</code>
        </div>

        <motion.button
          type="button"
          onClick={() => void handleCopy()}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`absolute right-2 top-2 flex min-h-11 min-w-11 items-center justify-center rounded-lg transition-all duration-200 sm:right-3 sm:top-3 ${
            copied
              ? 'bg-emerald-500 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white'
          }`}
          title="复制随机 API URL"
          aria-label="复制随机 API URL"
        >
          <AnimatePresence mode="wait">
            {copied ? (
              <motion.div
                key="check"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 180 }}
                transition={{ duration: 0.2 }}
              >
                <CheckIcon className="h-4 w-4" />
              </motion.div>
            ) : (
              <motion.div
                key="copy"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={{ duration: 0.2 }}
              >
                <ClipboardCopyIcon className="h-4 w-4" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
    </div>
  );
}
