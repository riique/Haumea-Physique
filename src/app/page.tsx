"use client";

import { useEffect, useMemo, useState } from "react";
import {
    Activity,
    Apple,
    ArrowDownRight,
    ArrowUpRight,
    Dumbbell,
    Loader2,
    Pill,
    Stethoscope
} from "lucide-react";
import { Header } from "@/components/Header";
import { MetricLineChart } from "@/components/MetricLineChart";
import { PhotoCompare } from "@/components/PhotoCompare";
import { TimelinePanel } from "@/components/TimelinePanel";
import { useAuth } from "@/contexts/AuthContext";
import {
    buildBodyFatSeries,
    buildTimelineEvents,
    buildWeightSeries,
    getDashboardData
} from "@/services/fitnessService";
import { formatMetric, getDelta, parseNumber } from "@/lib/fitness-format";
import type { DashboardData } from "@/types/fitness";

const emptyDashboardData: DashboardData = {
    workouts: [],
    meals: [],
    supplements: [],
    evolutions: [],
    bioimpedances: [],
    exams: [],
    protocolItemsCount: 0
};

export default function Dashboard() {
    const { user, userData } = useAuth();
    const [data, setData] = useState<DashboardData>(emptyDashboardData);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const userName = userData?.username || "Atleta";

    useEffect(() => {
        if (!user) return;

        let active = true;
        setLoading(true);
        setError("");

        getDashboardData(user.uid)
            .then(result => {
                if (active) setData(result);
            })
            .catch(() => {
                if (active) setError("Não foi possível carregar o painel agora.");
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, [user]);

    const overview = useMemo(() => {
        const evolutions = [...data.evolutions].sort((a, b) => b.timestamp - a.timestamp);
        const latestEvolution = evolutions[0];
        const previousEvolution = evolutions[1];
        const latestBio = data.bioimpedances[0];
        const latestExam = data.exams[0];

        const latestWeight = parseNumber(latestEvolution?.weight);
        const previousWeight = parseNumber(previousEvolution?.weight);
        const weightDelta = getDelta(latestWeight, previousWeight);

        const latestBodyFat = parseNumber(latestEvolution?.bodyFat) ?? parseNumber(latestBio?.composition?.bodyFat);
        const previousBodyFat = parseNumber(previousEvolution?.bodyFat);
        const bodyFatDelta = getDelta(latestBodyFat, previousBodyFat);

        const exerciseCount = data.workouts.reduce((sum, section) => sum + section.exercises.length, 0);
        const checkedMeals = data.meals.filter(meal => meal.checked).length;
        const checkedSupplements = data.supplements.filter(supplement => supplement.checked).length;

        return {
            latestEvolution,
            latestBio,
            latestExam,
            latestWeight,
            weightDelta,
            latestBodyFat,
            bodyFatDelta,
            exerciseCount,
            checkedMeals,
            checkedSupplements,
            dietProgress: data.meals.length ? Math.round((checkedMeals / data.meals.length) * 100) : 0,
            supplementProgress: data.supplements.length ? Math.round((checkedSupplements / data.supplements.length) * 100) : 0
        };
    }, [data]);

    const timelineEvents = useMemo(() => buildTimelineEvents(data), [data]);
    const weightSeries = useMemo(() => buildWeightSeries(data.evolutions), [data.evolutions]);
    const bodyFatSeries = useMemo(
        () => buildBodyFatSeries(data.evolutions, data.bioimpedances),
        [data.evolutions, data.bioimpedances]
    );

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-[#d84a22]" />
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-[1500px] px-4 pb-24 pt-8 md:px-12 md:pt-12">
            <Header
                title={<>Bom dia, <span className="text-[#7a7872]">{userName}</span></>}
                showDate
            />

            {error && (
                <div className="mb-8 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-900">
                    {error}
                </div>
            )}

            <div className="mb-8 flex w-full items-center gap-6">
                <span className="shrink-0 text-[10px] font-mono-data font-bold uppercase tracking-[0.2em] text-[#a19e95]">
                    Visão Geral
                </span>
                <div className="h-px flex-1 bg-gradient-to-r from-[#e6e2d6] via-[#e6e2d6]/50 to-transparent" />
            </div>

            <section className="mb-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <KpiCard
                    label="Treino"
                    icon={Dumbbell}
                    value={overview.exerciseCount ? `${overview.exerciseCount}` : "-"}
                    suffix={overview.exerciseCount ? " exercícios" : ""}
                    description={data.workouts.length ? `${data.workouts.length} seções ativas` : "Nenhum treino cadastrado"}
                    tone="dark"
                />
                <KpiCard
                    label="Peso Atual"
                    icon={overview.weightDelta !== null && overview.weightDelta <= 0 ? ArrowDownRight : ArrowUpRight}
                    value={formatMetric(overview.latestWeight)}
                    suffix={overview.latestWeight ? " kg" : ""}
                    description={overview.weightDelta === null ? "Sem comparação anterior" : `${overview.weightDelta > 0 ? "+" : ""}${formatMetric(overview.weightDelta, " kg")} desde o último registro`}
                    tone={overview.weightDelta !== null && overview.weightDelta <= 0 ? "green" : "orange"}
                />
                <KpiCard
                    label="Gordura"
                    icon={overview.bodyFatDelta !== null && overview.bodyFatDelta <= 0 ? ArrowDownRight : ArrowUpRight}
                    value={formatMetric(overview.latestBodyFat)}
                    suffix={overview.latestBodyFat ? "%" : ""}
                    description={overview.bodyFatDelta === null ? "Sem comparação anterior" : `${overview.bodyFatDelta > 0 ? "+" : ""}${formatMetric(overview.bodyFatDelta, "%")} de variação`}
                    tone={overview.bodyFatDelta !== null && overview.bodyFatDelta <= 0 ? "green" : "orange"}
                />
                <KpiCard
                    label="Dieta"
                    icon={Apple}
                    value={data.meals.length ? `${overview.dietProgress}` : "-"}
                    suffix={data.meals.length ? "%" : ""}
                    description={data.meals.length ? `${overview.checkedMeals}/${data.meals.length} refeições feitas` : "Sem plano alimentar"}
                    tone="orange"
                />
                <KpiCard
                    label="Suplementos"
                    icon={Pill}
                    value={data.supplements.length ? `${overview.supplementProgress}` : "-"}
                    suffix={data.supplements.length ? "%" : ""}
                    description={data.supplements.length ? `${overview.checkedSupplements}/${data.supplements.length} doses feitas` : "Sem suplementação"}
                    tone="dark"
                />
            </section>

            <section className="mb-12 grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_0.9fr]">
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <MetricLineChart
                        title="Trajetória de Peso"
                        subtitle="Registros de evolução"
                        unit="kg"
                        points={weightSeries}
                    />
                    <MetricLineChart
                        title="Percentual de Gordura"
                        subtitle="Evolução + bioimpedância"
                        unit="%"
                        color="#1a1a1c"
                        points={bodyFatSeries}
                    />
                </div>

                <div className="grid grid-cols-1 gap-6">
                    <SignalCard
                        icon={Stethoscope}
                        title="Último Exame"
                        value={overview.latestExam?.date?.toDate ? overview.latestExam.date.toDate().toLocaleDateString("pt-BR") : "-"}
                        detail={overview.latestExam ? `${Object.keys(overview.latestExam.markers || {}).length} marcadores` : "Nenhum exame registrado"}
                    />
                    <SignalCard
                        icon={Activity}
                        title="Bioimpedância"
                        value={overview.latestBio?.composition?.bodyFat ? `${overview.latestBio.composition.bodyFat}%` : "-"}
                        detail={overview.latestBio?.composition?.skeletalMuscle ? `${overview.latestBio.composition.skeletalMuscle} kg de massa muscular esquelética` : "Sem laudo cadastrado"}
                    />
                </div>
            </section>

            <section className="mb-12 grid grid-cols-1 gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                <TimelinePanel events={timelineEvents} />
                <PhotoCompare entries={data.evolutions} />
            </section>
        </div>
    );
}

function KpiCard({
    label,
    icon: Icon,
    value,
    suffix,
    description,
    tone
}: {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    value: string;
    suffix?: string;
    description: string;
    tone: "dark" | "orange" | "green";
}) {
    const color = tone === "green" ? "text-[#43965c]" : tone === "orange" ? "text-[#d84a22]" : "text-[#1a1a1c]";

    return (
        <div className="flex h-[170px] flex-col justify-between rounded-2xl border border-[#f2eee3] bg-white p-6 shadow-[0_4px_30px_rgba(0,0,0,0.03)]">
            <div className="flex items-start justify-between gap-3">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-[#a19e95]">{label}</span>
                <Icon className={`h-4 w-4 shrink-0 stroke-[2px] ${color}`} />
            </div>
            <div>
                <div className="flex items-baseline gap-1">
                    <h3 className="font-mono-data text-3xl font-bold tracking-tight text-[#1a1a1c]">{value}</h3>
                    {suffix && <span className="text-sm font-medium text-[#a19e95]">{suffix}</span>}
                </div>
                <p className="mt-2 line-clamp-2 text-xs leading-snug text-[#7a7872]">{description}</p>
            </div>
        </div>
    );
}

function SignalCard({
    icon: Icon,
    title,
    value,
    detail
}: {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    value: string;
    detail: string;
}) {
    return (
        <div className="flex min-h-[150px] items-center justify-between gap-5 rounded-3xl border border-[#f2eee3] bg-white p-6 shadow-sm">
            <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#a19e95]">{title}</span>
                <h3 className="mt-2 font-heading text-3xl font-bold text-[#1a1a1c]">{value}</h3>
                <p className="mt-1 text-sm text-[#7a7872]">{detail}</p>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f4f2ea] text-[#d84a22]">
                <Icon className="h-7 w-7" />
            </div>
        </div>
    );
}
