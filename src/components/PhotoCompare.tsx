"use client";

import { useMemo, useState } from "react";
import { Image as ImageIcon } from "lucide-react";
import type { EvolutionEntry, EvolutionPhotos } from "@/types/fitness";
import { formatLongDate, getEvolutionDate } from "@/lib/fitness-format";

const poseOptions: Array<{ key: keyof EvolutionPhotos; label: string }> = [
    { key: "front", label: "Frente" },
    { key: "side", label: "Perfil" },
    { key: "back", label: "Costas" },
    { key: "frontDoubleBiceps", label: "Frente duplo bíceps" },
    { key: "backDoubleBiceps", label: "Costas duplo bíceps" },
    { key: "sideChest", label: "Peitoral de lado" },
    { key: "absAndThigh", label: "Abdominal e coxa" },
    { key: "frontLatSpread", label: "Frente dorsal" }
];

interface PhotoCompareProps {
    entries: EvolutionEntry[];
}

export function PhotoCompare({ entries }: PhotoCompareProps) {
    const entriesWithPhotos = useMemo(
        () => entries.filter(entry => Object.values(entry.photos || {}).some(value => Array.isArray(value) ? value.length > 0 : Boolean(value))),
        [entries]
    );
    const [leftId, setLeftId] = useState(entriesWithPhotos[1]?.id || entriesWithPhotos[0]?.id || "");
    const [rightId, setRightId] = useState(entriesWithPhotos[0]?.id || "");
    const [pose, setPose] = useState<keyof EvolutionPhotos>("front");

    const left = entriesWithPhotos.find(entry => entry.id === leftId) || entriesWithPhotos[1] || entriesWithPhotos[0];
    const right = entriesWithPhotos.find(entry => entry.id === rightId) || entriesWithPhotos[0];
    const leftUrl = left?.photos?.[pose] as string | undefined;
    const rightUrl = right?.photos?.[pose] as string | undefined;

    return (
        <section className="rounded-3xl border border-[#f2eee3] bg-white p-6 shadow-sm md:p-8">
            <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <h3 className="font-heading text-xl font-bold text-[#1a1a1c]">Comparador Visual</h3>
                    <p className="mt-1 text-xs font-mono-data uppercase tracking-widest text-[#a19e95]">
                        Fotos por data e pose
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <select
                        value={left?.id || ""}
                        onChange={event => setLeftId(event.target.value)}
                        className="rounded-xl border border-[#e6e2d6] bg-[#f4f2ea] px-3 py-2 text-xs font-bold text-[#1a1a1c] outline-none"
                    >
                        {entriesWithPhotos.map(entry => (
                            <option key={entry.id} value={entry.id}>
                                {formatLongDate(getEvolutionDate(entry))}
                            </option>
                        ))}
                    </select>
                    <select
                        value={right?.id || ""}
                        onChange={event => setRightId(event.target.value)}
                        className="rounded-xl border border-[#e6e2d6] bg-[#f4f2ea] px-3 py-2 text-xs font-bold text-[#1a1a1c] outline-none"
                    >
                        {entriesWithPhotos.map(entry => (
                            <option key={entry.id} value={entry.id}>
                                {formatLongDate(getEvolutionDate(entry))}
                            </option>
                        ))}
                    </select>
                    <select
                        value={pose}
                        onChange={event => setPose(event.target.value as keyof EvolutionPhotos)}
                        className="rounded-xl border border-[#e6e2d6] bg-[#f4f2ea] px-3 py-2 text-xs font-bold text-[#1a1a1c] outline-none"
                    >
                        {poseOptions.map(option => (
                            <option key={option.key} value={option.key}>{option.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {entriesWithPhotos.length < 1 ? (
                <div className="flex min-h-[360px] items-center justify-center rounded-2xl border border-dashed border-[#e6e2d6] bg-[#f4f2ea]/60 text-center">
                    <p className="max-w-xs text-xs font-mono-data uppercase tracking-widest text-[#a19e95]">
                        Registre fotos na evolução para habilitar a comparação.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <PhotoPane entry={left} imageUrl={leftUrl} label="Referência" poseLabel={poseOptions.find(option => option.key === pose)?.label || ""} />
                    <PhotoPane entry={right} imageUrl={rightUrl} label="Atual" poseLabel={poseOptions.find(option => option.key === pose)?.label || ""} />
                </div>
            )}
        </section>
    );
}

function PhotoPane({
    entry,
    imageUrl,
    label,
    poseLabel
}: {
    entry?: EvolutionEntry;
    imageUrl?: string;
    label: string;
    poseLabel: string;
}) {
    return (
        <div className="overflow-hidden rounded-2xl border border-[#e6e2d6] bg-[#f4f2ea]">
            <div className="flex items-center justify-between gap-3 border-b border-[#e6e2d6] bg-white px-4 py-3">
                <div>
                    <span className="block text-[10px] font-bold uppercase tracking-widest text-[#a19e95]">{label}</span>
                    <span className="block text-xs font-black text-[#1a1a1c]">
                        {entry ? formatLongDate(getEvolutionDate(entry)) : "Sem data"}
                    </span>
                </div>
                <span className="rounded-full bg-[#f4f2ea] px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[#7a7872]">
                    {poseLabel}
                </span>
            </div>

            <div className="relative aspect-[3/4] max-h-[620px] w-full">
                {imageUrl ? (
                    <img src={imageUrl} alt={`${label} - ${poseLabel}`} className="h-full w-full object-contain" />
                ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-[#a19e95]">
                        <ImageIcon className="h-8 w-8" />
                        <p className="text-xs font-mono-data uppercase tracking-widest">Sem foto para esta pose</p>
                    </div>
                )}
            </div>
        </div>
    );
}
