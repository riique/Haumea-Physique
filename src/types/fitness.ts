import type { Timestamp } from "firebase/firestore";

export interface Exercise {
    id: string;
    name: string;
    sets: string;
    reps: string;
    restTime: string;
    notes: string;
    imageUrl?: string;
}

export interface WorkoutSection {
    id: string;
    name: string;
    exercises: Exercise[];
}

export interface Food {
    id: string;
    name: string;
    quantity?: string;
    protein: number;
    carbs: number;
    fats: number;
    calories: number;
    checked?: boolean;
}

export interface Meal {
    id: string;
    name: string;
    time: string;
    checked?: boolean;
    foods: Food[];
}

export interface Supplement {
    id: string;
    name: string;
    quantity: string;
    time: string;
    checked?: boolean;
}

export interface EvolutionPhotos {
    front?: string;
    side?: string;
    back?: string;
    frontDoubleBiceps?: string;
    backDoubleBiceps?: string;
    sideChest?: string;
    absAndThigh?: string;
    frontLatSpread?: string;
    extra?: string[];
    extraPoses?: string[];
}

export interface EvolutionMeasures {
    neck?: string;
    shoulders?: string;
    chest?: string;
    waist?: string;
    abdomen?: string;
    hips?: string;
    rightArmRelaxed?: string;
    rightArmFlexed?: string;
    leftArmRelaxed?: string;
    leftArmFlexed?: string;
    rightForearm?: string;
    leftForearm?: string;
    rightThigh?: string;
    leftThigh?: string;
    rightCalf?: string;
    leftCalf?: string;
}

export interface EvolutionEntry {
    id: string;
    date: string;
    timestamp: number;
    weight: string;
    bodyFat: string;
    photos: EvolutionPhotos;
    measures: EvolutionMeasures;
}

export interface BioimpedanceEntry {
    id: string;
    date: string;
    timestamp: number;
    pdfUrl?: string;
    pdfName?: string;
    composition: {
        bodyFat: string;
        skeletalMuscle: string;
        water: string;
        bmr: string;
        visceralFat: string;
        whr: string;
        fatFreeMass: string;
        protein: string;
        boneMass: string;
    };
    postural: {
        forwardHead: string;
        hunchback: string;
        apt: string;
        shoulderOffset: string;
        scoliosisRisk: string;
        shoulderRisk: string;
        kneeRisk: string;
    };
    segmental: {
        rightArmMuscle: string;
        leftArmMuscle: string;
        rightLegMuscle: string;
        leftLegMuscle: string;
        trunkMuscle: string;
    };
}

export interface ExamRecord {
    id: string;
    date: Timestamp;
    medico?: string;
    pdfUrl?: string | null;
    pdfName?: string | null;
    markers?: Record<string, string>;
}

export type TimelineKind =
    | "workout"
    | "diet"
    | "supplement"
    | "evolution"
    | "bioimpedance"
    | "exam"
    | "protocol";

export interface TimelineEvent {
    id: string;
    kind: TimelineKind;
    title: string;
    subtitle: string;
    date: Date;
    href: string;
    metric?: string;
}

export interface DashboardData {
    workouts: WorkoutSection[];
    meals: Meal[];
    supplements: Supplement[];
    evolutions: EvolutionEntry[];
    bioimpedances: BioimpedanceEntry[];
    exams: ExamRecord[];
    protocolPhase?: string;
    protocolItemsCount: number;
}
