"use client";

import Link from "next/link";
import {
    Activity,
    Apple,
    Dumbbell,
    FileText,
    Pill,
    Syringe,
    TrendingUp
} from "lucide-react";
import type { TimelineEvent, TimelineKind } from "@/types/fitness";
import { formatShortDate } from "@/lib/fitness-format";

const iconMap: Record<TimelineKind, React.ComponentType<{ className?: string }>> = {
    workout: Dumbbell,
    diet: Apple,
    supplement: Pill,
    evolution: TrendingUp,
    bioimpedance: Activity,
    exam: FileText,
    protocol: Syringe
};

export function TimelinePanel({ events }: { events: TimelineEvent[] }) {
    return (
        <section className="rounded-3xl border border-[#f2eee3] bg-white p-6 shadow-sm md:p-8">
            <div className="mb-8 flex items-center justify-between gap-4">
                <div>
                    <h3 className="font-heading text-xl font-bold text-[#1a1a1c]">Linha do Tempo</h3>
                    <p className="mt-1 text-xs font-mono-data uppercase tracking-widest text-[#a19e95]">
                        Eventos recentes do físico
                    </p>
                </div>
                <span className="rounded-full bg-[#f4f2ea] px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[#7a7872]">
                    {events.length} sinais
                </span>
            </div>

            {events.length === 0 ? (
                <div className="flex min-h-[260px] items-center justify-center rounded-2xl border border-dashed border-[#e6e2d6] bg-[#f4f2ea]/60 text-center">
                    <p className="max-w-xs text-xs font-mono-data uppercase tracking-widest text-[#a19e95]">
                        Os próximos registros aparecerão aqui em ordem cronológica.
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {events.slice(0, 10).map((event, index) => {
                        const Icon = iconMap[event.kind];

                        return (
                            <Link
                                key={event.id}
                                href={event.href}
                                className="group grid grid-cols-[auto_1fr_auto] items-center gap-4 rounded-2xl border border-transparent bg-[#fdfbf6] p-4 transition-all hover:border-[#1a1a1c] hover:bg-white hover:shadow-sm"
                            >
                                <div className="relative">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1a1a1c] text-white">
                                        <Icon className="h-5 w-5" />
                                    </div>
                                    {index < events.length - 1 && (
                                        <span className="absolute left-1/2 top-12 h-5 w-px -translate-x-1/2 bg-[#e6e2d6]" />
                                    )}
                                </div>

                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                        <h4 className="truncate text-sm font-black text-[#1a1a1c]">{event.title}</h4>
                                        <span className="text-[10px] font-mono-data uppercase tracking-widest text-[#a19e95]">
                                            {formatShortDate(event.date)}
                                        </span>
                                    </div>
                                    <p className="mt-1 truncate text-xs text-[#7a7872]">{event.subtitle}</p>
                                </div>

                                {event.metric && (
                                    <span className="max-w-[80px] truncate rounded-full bg-white px-3 py-1 text-right font-mono-data text-xs font-bold text-[#d84a22] ring-1 ring-[#e6e2d6]">
                                        {event.metric}
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
