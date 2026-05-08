"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";

type FeedbackTone = "success" | "error" | "info";

interface FeedbackItem {
    id: string;
    tone: FeedbackTone;
    title: string;
    message?: string;
}

interface FeedbackContextValue {
    showSuccess: (title: string, message?: string) => void;
    showError: (title: string, message?: string) => void;
    showInfo: (title: string, message?: string) => void;
}

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

const toneConfig = {
    success: {
        icon: CheckCircle2,
        className: "border-emerald-200 bg-emerald-50 text-emerald-900",
        iconClassName: "text-emerald-600"
    },
    error: {
        icon: AlertTriangle,
        className: "border-red-200 bg-red-50 text-red-950",
        iconClassName: "text-red-500"
    },
    info: {
        icon: Info,
        className: "border-[#e6e2d6] bg-white text-[#1a1a1c]",
        iconClassName: "text-[#d84a22]"
    }
};

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
    const [items, setItems] = useState<FeedbackItem[]>([]);

    const push = useCallback((tone: FeedbackTone, title: string, message?: string) => {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        setItems(current => [{ id, tone, title, message }, ...current].slice(0, 4));
        window.setTimeout(() => {
            setItems(current => current.filter(item => item.id !== id));
        }, 4200);
    }, []);

    const value = useMemo<FeedbackContextValue>(() => ({
        showSuccess: (title, message) => push("success", title, message),
        showError: (title, message) => push("error", title, message),
        showInfo: (title, message) => push("info", title, message)
    }), [push]);

    return (
        <FeedbackContext.Provider value={value}>
            {children}
            <div className="fixed right-4 top-4 z-[80] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-3 md:right-6 md:top-6">
                {items.map(item => {
                    const config = toneConfig[item.tone];
                    const Icon = config.icon;

                    return (
                        <div
                            key={item.id}
                            className={`rounded-2xl border p-4 shadow-[0_16px_50px_rgba(0,0,0,0.12)] backdrop-blur-xl animate-in slide-in-from-top-3 fade-in duration-200 ${config.className}`}
                        >
                            <div className="flex gap-3">
                                <Icon className={`h-5 w-5 shrink-0 ${config.iconClassName}`} />
                                <div className="min-w-0 flex-1">
                                    <h4 className="text-sm font-black leading-tight">{item.title}</h4>
                                    {item.message && (
                                        <p className="mt-1 text-xs leading-relaxed opacity-75">{item.message}</p>
                                    )}
                                </div>
                                <button
                                    onClick={() => setItems(current => current.filter(candidate => candidate.id !== item.id))}
                                    className="rounded-full p-1 opacity-50 transition-opacity hover:opacity-100"
                                    aria-label="Fechar aviso"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </FeedbackContext.Provider>
    );
}

export const useFeedback = () => {
    const context = useContext(FeedbackContext);
    if (!context) {
        throw new Error("useFeedback must be used inside FeedbackProvider");
    }
    return context;
};
