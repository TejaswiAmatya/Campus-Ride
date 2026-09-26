import { create } from "zustand";

type ToastTone = "default" | "success" | "error";
type ToastActionVariant = "default" | "outline" | "destructive";

export interface ToastAction {
  label: string;
  onClick?: () => void | Promise<void>;
  variant?: ToastActionVariant;
}

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  tone?: ToastTone;
  duration?: number;
  actions?: ToastAction[];
}

interface ToastState {
  toasts: ToastItem[];
  showToast: (toast: ToastItem) => void;
  dismissToast: (id: string) => void;
}

const toastTimers = new Map<string, ReturnType<typeof setTimeout>>();

function clearToastTimer(id: string) {
  const timer = toastTimers.get(id);

  if (!timer) {
    return;
  }

  clearTimeout(timer);
  toastTimers.delete(id);
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  showToast: (toast) => {
    clearToastTimer(toast.id);

    set((state) => ({
      toasts: [...state.toasts.filter((item) => item.id !== toast.id), toast],
    }));

    const duration = toast.duration ?? 5000;
    if (duration <= 0) {
      return;
    }

    const timer = setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((item) => item.id !== toast.id),
      }));
      toastTimers.delete(toast.id);
    }, duration);

    toastTimers.set(toast.id, timer);
  },
  dismissToast: (id) => {
    clearToastTimer(id);
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    }));
  },
}));
