'use client';

import { useStore } from '@/store/useStore';

const borderColorMap: Record<string, string> = {
  success: 'border-l-success',
  error: 'border-l-danger',
  info: 'border-l-accent',
  warning: 'border-l-warning',
};

export function ToastContainer() {
  const { toasts, removeToast } = useStore();

  return (
    <div className="fixed bottom-6 right-6 flex flex-col gap-2 pointer-events-none z-100">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`toast flex items-center bg-surface border border-edge border-l-3 ${borderColorMap[toast.type] ?? 'border-l-accent'} rounded-sm shadow text-primary text-[0.85rem] font-medium gap-2 max-w-80 px-4 py-[11px] animate-toast-in pointer-events-auto`}
          onClick={() => removeToast(toast.id)}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}
