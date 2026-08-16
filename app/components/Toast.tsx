"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from 'motion/react';
import { StatusIcon } from "./ui/icons";

export type ToastType = "success" | "error" | "info";

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose: () => void;
}

export default function Toast({ 
  message, 
  type = "success", 
  duration = 2000, 
  onClose 
}: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // 等待动画结束后关闭
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case "success":
        return <StatusIcon.success className="h-5 w-5" />;
      case "error":
        return <StatusIcon.error className="h-5 w-5" />;
      case "info":
        return <StatusIcon.info className="h-5 w-5" />;
      default:
        return null;
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="toast-message fixed bottom-6 left-1/2 z-50 -translate-x-1/2 transform"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex max-w-[calc(100vw-2rem)] items-center rounded-lg border border-gray-100 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-slate-800">
            <span className="mr-2">{getIcon()}</span>
            <span className="break-words text-sm text-gray-700 dark:text-gray-200">{message}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
