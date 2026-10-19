"use client";
import React from 'react';
import { useToastStore } from '@/store/toastStore';
import { X } from 'lucide-react';

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => {
        const bg = {
          info: 'bg-bg-surface border-accent text-text-main',
          success: 'bg-success/10 border-success text-success',
          warning: 'bg-warning/10 border-warning text-warning',
          error: 'bg-danger/10 border-danger text-danger',
        }[toast.type];

        return (
          <div key={toast.id} className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg w-80 backdrop-blur-md ${bg}`}>
            <span className="flex-1 text-sm font-medium leading-tight">{toast.message}</span>
            <button onClick={() => removeToast(toast.id)} className="opacity-70 hover:opacity-100 transition-opacity">
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}