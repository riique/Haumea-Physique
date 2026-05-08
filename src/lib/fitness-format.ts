import type { EvolutionEntry, TimelineEvent } from "@/types/fitness";

export const parseNumber = (value?: string | number | null) => {
    if (value === null || value === undefined || value === "") return null;
    const parsed = Number(String(value).replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
};

export const formatMetric = (value: number | null | undefined, suffix = "", fallback = "-") => {
    if (value === null || value === undefined || !Number.isFinite(value)) return fallback;

    const formatted = value.toLocaleString("pt-BR", {
        maximumFractionDigits: Number.isInteger(value) ? 0 : 1
    });

    return suffix ? `${formatted}${suffix}` : formatted;
};

export const formatShortDate = (date: Date) =>
    new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "short"
    }).format(date);

export const formatLongDate = (date: Date) =>
    new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric"
    }).format(date);

export const getEvolutionDate = (entry: EvolutionEntry) => {
    if (entry.timestamp) return new Date(entry.timestamp);
    return new Date(`${entry.date}T12:00:00`);
};

export const sortTimelineEvents = (events: TimelineEvent[]) =>
    [...events].sort((a, b) => b.date.getTime() - a.date.getTime());

export const getDelta = (current: number | null, previous: number | null) => {
    if (current === null || previous === null) return null;
    return current - previous;
};
