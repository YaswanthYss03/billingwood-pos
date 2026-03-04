'use client';

import { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info, XCircle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

let toastQueue: Toast[] = [];
let listeners: ((toasts: Toast[]) => void)[] = [];

const notify = () => {
  listeners.forEach(listener => listener([...toastQueue]));
};

export const toast = {
  success: (message: string, duration = 3000) => {
    const id = Math.random().toString(36).substring(7);
    toastQueue.push({ id, message, type: 'success', duration });
    notify();
    setTimeout(() => toast.dismiss(id), duration);
  },
  error: (message: string, duration = 5000) => {
    const id = Math.random().toString(36).substring(7);
    toastQueue.push({ id, message, type: 'error', duration });
    notify();
    setTimeout(() => toast.dismiss(id), duration);
  },
  info: (message: string, duration = 3000) => {
    const id = Math.random().toString(36).substring(7);
    toastQueue.push({ id, message, type: 'info', duration });
    notify();
    setTimeout(() => toast.dismiss(id), duration);
  },
  warning: (message: string, duration = 4000) => {
    const id = Math.random().toString(36).substring(7);
    toastQueue.push({ id, message, type: 'warning', duration });
    notify();
    setTimeout(() => toast.dismiss(id), duration);
  },
  dismiss: (id: string) => {
    toastQueue = toastQueue.filter(toast => toast.id !== id);
    notify();
  },
};

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    listeners.push(setToasts);
    return () => {
      listeners = listeners.filter(listener => listener !== setToasts);
    };
  }, []);

  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-600" />;
    }
  };

  const getColor = (type: ToastType) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`flex items-center gap-3 p-4 rounded-lg border shadow-lg animate-in slide-in-from-right ${getColor(t.type)}`}
        >
          {getIcon(t.type)}
          <p className="flex-1 text-sm font-medium text-gray-900">{t.message}</p>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
