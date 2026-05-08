import {
    collection,
    doc,
    getDoc,
    getDocs,
    orderBy,
    query,
    setDoc,
    type DocumentData
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type {
    BioimpedanceEntry,
    DashboardData,
    EvolutionEntry,
    ExamRecord,
    Meal,
    Supplement,
    TimelineEvent,
    WorkoutSection
} from "@/types/fitness";
import { getEvolutionDate, parseNumber, sortTimelineEvents } from "@/lib/fitness-format";

const readDoc = async <T>(path: string[], fallback: T): Promise<T> => {
    const snapshot = await getDoc(doc(db, path.join("/")));
    return snapshot.exists() ? ({ ...fallback, ...snapshot.data() } as T) : fallback;
};

const readOrderedCollection = async <T extends { id: string }>(
    path: string[],
    orderField: string,
    direction: "asc" | "desc" = "desc"
): Promise<T[]> => {
    const snapshot = await getDocs(query(collection(db, path.join("/")), orderBy(orderField, direction)));
    return snapshot.docs.map(item => ({ id: item.id, ...item.data() } as T));
};

export const getWorkoutPlan = async (userId: string): Promise<WorkoutSection[]> => {
    const data = await readDoc<{ sections: WorkoutSection[] }>(["users", userId, "workouts", "plan"], { sections: [] });
    return data.sections || [];
};

export const saveWorkoutPlan = async (userId: string, sections: WorkoutSection[]) =>
    setDoc(doc(db, "users", userId, "workouts", "plan"), { sections }, { merge: true });

export const getDietPlan = async (userId: string): Promise<Meal[]> => {
    const data = await readDoc<{ meals: Meal[] }>(["users", userId, "diet", "plan"], { meals: [] });
    return data.meals || [];
};

export const saveDietPlan = async (userId: string, meals: Meal[]) => {
    const today = new Date().toISOString().split("T")[0];
    return setDoc(doc(db, "users", userId, "diet", "plan"), { meals, lastResetDate: today }, { merge: true });
};

export const getSupplementsPlan = async (userId: string): Promise<Supplement[]> => {
    const data = await readDoc<{ items: Supplement[] }>(["users", userId, "supplements", "plan"], { items: [] });
    return data.items || [];
};

export const saveSupplementsPlan = async (userId: string, items: Supplement[]) => {
    const today = new Date().toISOString().split("T")[0];
    return setDoc(doc(db, "users", userId, "supplements", "plan"), { items, lastResetDate: today }, { merge: true });
};

export const getEvolutionEntries = async (userId: string): Promise<EvolutionEntry[]> =>
    readOrderedCollection<EvolutionEntry>(["users", userId, "evolutions"], "timestamp", "desc");

export const getBioimpedanceRecords = async (userId: string): Promise<BioimpedanceEntry[]> =>
    readOrderedCollection<BioimpedanceEntry>(["users", userId, "bioimpedancias"], "timestamp", "desc");

export const getExamRecords = async (userId: string): Promise<ExamRecord[]> =>
    readOrderedCollection<ExamRecord>(["users", userId, "exams"], "date", "desc");

export const getProtocolSummary = async (userId: string) => {
    const data = await readDoc<DocumentData>(["users", userId, "medical", "protocol"], {
        currentPhase: "Off",
        items: []
    });

    return {
        currentPhase: String(data.currentPhase || "Off"),
        itemsCount: Array.isArray(data.items) ? data.items.length : 0
    };
};

export const getDashboardData = async (userId: string): Promise<DashboardData> => {
    const [workouts, meals, supplements, evolutions, bioimpedances, exams, protocol] = await Promise.all([
        getWorkoutPlan(userId),
        getDietPlan(userId),
        getSupplementsPlan(userId),
        getEvolutionEntries(userId),
        getBioimpedanceRecords(userId),
        getExamRecords(userId),
        getProtocolSummary(userId)
    ]);

    return {
        workouts,
        meals,
        supplements,
        evolutions,
        bioimpedances,
        exams,
        protocolPhase: protocol.currentPhase,
        protocolItemsCount: protocol.itemsCount
    };
};

export const buildTimelineEvents = (data: DashboardData): TimelineEvent[] => {
    const events: TimelineEvent[] = [];

    data.evolutions.slice(0, 12).forEach(entry => {
        events.push({
            id: `evolution-${entry.id}`,
            kind: "evolution",
            title: "Registro de evolução",
            subtitle: [entry.weight && `${entry.weight} kg`, entry.bodyFat && `${entry.bodyFat}% gordura`]
                .filter(Boolean)
                .join(" · ") || "Medidas e fotos atualizadas",
            date: getEvolutionDate(entry),
            href: "/evolucao",
            metric: entry.weight ? `${entry.weight} kg` : undefined
        });
    });

    data.bioimpedances.slice(0, 8).forEach(record => {
        events.push({
            id: `bio-${record.id}`,
            kind: "bioimpedance",
            title: "Bioimpedância registrada",
            subtitle: [
                record.composition?.bodyFat && `${record.composition.bodyFat}% gordura`,
                record.composition?.skeletalMuscle && `${record.composition.skeletalMuscle} kg músculo`
            ].filter(Boolean).join(" · ") || "Composição corporal atualizada",
            date: new Date(record.timestamp || `${record.date}T12:00:00`),
            href: "/bioimpedancia",
            metric: record.composition?.bodyFat ? `${record.composition.bodyFat}%` : undefined
        });
    });

    data.exams.slice(0, 8).forEach(record => {
        const date = record.date?.toDate ? record.date.toDate() : new Date();
        const markers = Object.keys(record.markers || {}).length;
        events.push({
            id: `exam-${record.id}`,
            kind: "exam",
            title: "Avaliação médica",
            subtitle: `${markers} marcador${markers === 1 ? "" : "es"} transcrito${markers === 1 ? "" : "s"}`,
            date,
            href: "/exames",
            metric: markers > 0 ? String(markers) : undefined
        });
    });

    const checkedMeals = data.meals.filter(meal => meal.checked).length;
    if (data.meals.length > 0) {
        events.push({
            id: "diet-today",
            kind: "diet",
            title: "Plano alimentar de hoje",
            subtitle: `${checkedMeals}/${data.meals.length} refeições concluídas`,
            date: new Date(),
            href: "/dieta",
            metric: `${Math.round((checkedMeals / data.meals.length) * 100)}%`
        });
    }

    const checkedSupplements = data.supplements.filter(supplement => supplement.checked).length;
    if (data.supplements.length > 0) {
        events.push({
            id: "supplements-today",
            kind: "supplement",
            title: "Suplementação diária",
            subtitle: `${checkedSupplements}/${data.supplements.length} doses marcadas`,
            date: new Date(),
            href: "/suplementos",
            metric: `${Math.round((checkedSupplements / data.supplements.length) * 100)}%`
        });
    }

    const exerciseCount = data.workouts.reduce((sum, section) => sum + section.exercises.length, 0);
    if (exerciseCount > 0) {
        events.push({
            id: "workout-plan",
            kind: "workout",
            title: "Plano de treino ativo",
            subtitle: `${data.workouts.length} seções · ${exerciseCount} exercícios`,
            date: new Date(),
            href: "/treinos",
            metric: String(exerciseCount)
        });
    }

    if (data.protocolPhase) {
        events.push({
            id: "protocol-phase",
            kind: "protocol",
            title: `Protocolo em fase ${data.protocolPhase}`,
            subtitle: `${data.protocolItemsCount} item${data.protocolItemsCount === 1 ? "" : "s"} registrado${data.protocolItemsCount === 1 ? "" : "s"}`,
            date: new Date(),
            href: "/protocolos",
            metric: data.protocolPhase
        });
    }

    return sortTimelineEvents(events);
};

export const buildWeightSeries = (evolutions: EvolutionEntry[]) =>
    [...evolutions]
        .reverse()
        .map(entry => ({
            label: new Date(entry.timestamp || `${entry.date}T12:00:00`).toLocaleDateString("pt-BR", {
                month: "short",
                day: "2-digit"
            }),
            value: parseNumber(entry.weight)
        }))
        .filter(point => point.value !== null) as Array<{ label: string; value: number }>;

export const buildBodyFatSeries = (evolutions: EvolutionEntry[], bioimpedances: BioimpedanceEntry[]) => {
    const evolutionPoints = evolutions.map(entry => ({
        label: new Date(entry.timestamp || `${entry.date}T12:00:00`).toLocaleDateString("pt-BR", {
            month: "short",
            day: "2-digit"
        }),
        value: parseNumber(entry.bodyFat),
        timestamp: entry.timestamp || new Date(`${entry.date}T12:00:00`).getTime()
    }));

    const bioPoints = bioimpedances.map(entry => ({
        label: new Date(entry.timestamp || `${entry.date}T12:00:00`).toLocaleDateString("pt-BR", {
            month: "short",
            day: "2-digit"
        }),
        value: parseNumber(entry.composition?.bodyFat),
        timestamp: entry.timestamp || new Date(`${entry.date}T12:00:00`).getTime()
    }));

    return [...evolutionPoints, ...bioPoints]
        .filter(point => point.value !== null)
        .sort((a, b) => a.timestamp - b.timestamp)
        .map(({ label, value }) => ({ label, value })) as Array<{ label: string; value: number }>;
};
