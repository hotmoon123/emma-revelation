import { useCallback, useRef, useState } from 'react';
import { CheckCircle2, Info, X, XCircle } from 'lucide-react';

export type ToastKind = 'success' | 'info' | 'error';
export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const notify = useCallback(
    (kind: ToastKind, message: string, action?: { label: string; run: () => void }) => {
      const id = nextId.current++;
      setToasts((t) => [...t.slice(-3), { id, kind, message, actionLabel: action?.label, onAction: action?.run }]);
      // Errors and undo actions stay longer so they can be read / used.
      window.setTimeout(() => dismiss(id), action || kind === 'error' ? 9000 : 4500);
    },
    [dismiss]
  );

  return { toasts, notify, dismiss };
}

const ICON = { success: CheckCircle2, info: Info, error: XCircle } as const;

export function ToastHost({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="fixed z-[60] right-4 left-4 sm:left-auto sm:w-96 bottom-28 flex flex-col gap-2 pointer-events-none"
    >
      {toasts.map((t) => {
        const Icon = ICON[t.kind];
        return (
          <div
            key={t.id}
            role={t.kind === 'error' ? 'alert' : 'status'}
            className="pointer-events-auto flex items-start gap-3 p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-lg"
          >
            <Icon className="w-5 h-5 mt-0.5 shrink-0 text-[#2563EB]" aria-hidden="true" />
            <p className="flex-1 text-sm text-[#0F172A]">{t.message}</p>
            {t.actionLabel && t.onAction && (
              <button
                onClick={() => {
                  t.onAction?.();
                  onDismiss(t.id);
                }}
                className="min-h-11 px-3 -my-2 rounded-lg text-sm font-semibold text-[#2563EB] hover:bg-[#EFF6FF]"
              >
                {t.actionLabel}
              </button>
            )}
            <button
              onClick={() => onDismiss(t.id)}
              aria-label="Dismiss notification"
              className="w-8 h-8 -my-1 -mr-1 rounded-lg grid place-items-center text-[#64748B] hover:bg-[#F8FAFC]"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
