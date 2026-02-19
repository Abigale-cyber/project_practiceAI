import { useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
    open: boolean;
    title?: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
    variant?: 'danger' | 'warning';
}

export default function ConfirmDialog({
    open,
    title = '确认操作',
    message,
    confirmLabel = '确认',
    cancelLabel = '取消',
    onConfirm,
    onCancel,
    variant = 'danger',
}: ConfirmDialogProps) {
    const cancelRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (open) {
            cancelRef.current?.focus();
            const handleEsc = (e: KeyboardEvent) => {
                if (e.key === 'Escape') onCancel();
            };
            window.addEventListener('keydown', handleEsc);
            return () => window.removeEventListener('keydown', handleEsc);
        }
    }, [open, onCancel]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onCancel}
            />
            {/* Dialog */}
            <div className="relative bg-card rounded-xl shadow-2xl border border-border w-[90%] max-w-sm p-6 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-start gap-3">
                    <div className={`flex-none p-2 rounded-full ${variant === 'danger' ? 'bg-red-100 text-red-500' : 'bg-amber-100 text-amber-500'}`}>
                        <AlertTriangle className="size-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-base font-semibold text-foreground">{title}</h3>
                        <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{message}</p>
                    </div>
                </div>
                <div className="flex justify-end gap-2.5 mt-6">
                    <button
                        ref={cancelRef}
                        onClick={onCancel}
                        className="px-4 py-2 text-sm rounded-lg border border-border text-foreground hover:bg-muted/50 transition-colors"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`px-4 py-2 text-sm rounded-lg text-white transition-colors ${variant === 'danger'
                                ? 'bg-red-500 hover:bg-red-600'
                                : 'bg-amber-500 hover:bg-amber-600'
                            }`}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
