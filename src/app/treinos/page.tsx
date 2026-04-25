"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Dumbbell, Plus, Trash2, Clock, X, Loader2, Image as ImageIcon, Upload, FileDown, ArrowUp, ArrowDown, Pencil } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { db, storage } from "@/lib/firebase";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

interface Exercise {
    id: string;
    name: string;
    sets: string;
    reps: string;
    restTime: string;
    notes: string;
    imageUrl?: string;
}

interface WorkoutSection {
    id: string;
    name: string;
    exercises: Exercise[];
}

export default function Treinos() {
    const { user } = useAuth();
    const [sections, setSections] = useState<WorkoutSection[]>([]);
    const [loading, setLoading] = useState(true);

    const [newSectionName, setNewSectionName] = useState("");
    const [activeSectionId, setActiveSectionId] = useState<string | null>(null);

    const [isExerciseModalOpen, setIsExerciseModalOpen] = useState(false);
    const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [newExercise, setNewExercise] = useState<Omit<Exercise, 'id'>>({ name: "", sets: "", reps: "", restTime: "", notes: "", imageUrl: "" });

    const [imageFile, setImageFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        const fetchWorkouts = async () => {
            try {
                const docRef = doc(db, "users", user.uid, "workouts", "plan");
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setSections(data.sections || []);
                }
            } catch (error) {
                console.error("Erro ao carregar treinos:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchWorkouts();
    }, [user]);

    const saveWorkoutsToFirebase = async (updatedSections: WorkoutSection[]) => {
        if (!user) return;
        try {
            const docRef = doc(db, "users", user.uid, "workouts", "plan");
            await setDoc(docRef, { sections: updatedSections }, { merge: true });
        } catch (error) {
            console.error("Erro ao salvar treinos:", error);
        }
    };

    const addSection = () => {
        if (!newSectionName.trim()) return;
        const newSection: WorkoutSection = {
            id: Date.now().toString(),
            name: newSectionName,
            exercises: [],
        };
        const updatedSections = [...sections, newSection];
        setSections(updatedSections);
        saveWorkoutsToFirebase(updatedSections);
        setNewSectionName("");
        if (!activeSectionId) setActiveSectionId(newSection.id);
    };

    const removeSection = (id: string) => {
        const updatedSections = sections.filter(s => s.id !== id);
        setSections(updatedSections);
        saveWorkoutsToFirebase(updatedSections);
        if (activeSectionId === id) setActiveSectionId(null);
    };

    const openAddModal = () => {
        setNewExercise({ name: "", sets: "", reps: "", restTime: "", notes: "", imageUrl: "" });
        setImageFile(null);
        setEditingExerciseId(null);
        setIsExerciseModalOpen(true);
    };

    const openEditModal = (exercise: Exercise) => {
        setNewExercise({
            name: exercise.name,
            sets: exercise.sets,
            reps: exercise.reps,
            restTime: exercise.restTime,
            notes: exercise.notes,
            imageUrl: exercise.imageUrl || ""
        });
        setImageFile(null);
        setEditingExerciseId(exercise.id);
        setIsExerciseModalOpen(true);
    };

    const saveExercise = async (sectionId: string) => {
        if (!newExercise.name.trim() || !user) return;
        setIsUploading(true);

        let uploadedImageUrl = newExercise.imageUrl || "";

        try {
            if (imageFile) {
                const fileExtension = imageFile.name.split('.').pop();
                const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExtension}`;
                const storageRef = ref(storage, `users/${user.uid}/workouts/exercises/${fileName}`);

                await uploadBytes(storageRef, imageFile);
                uploadedImageUrl = await getDownloadURL(storageRef);
            }

            const exerciseData: Exercise = {
                id: editingExerciseId || Date.now().toString(),
                name: newExercise.name,
                sets: newExercise.sets,
                reps: newExercise.reps,
                restTime: newExercise.restTime,
                notes: newExercise.notes,
                ...(uploadedImageUrl && { imageUrl: uploadedImageUrl }),
            };

            const updatedSections = sections.map(s => {
                if (s.id === sectionId) {
                    if (editingExerciseId) {
                        return {
                            ...s,
                            exercises: s.exercises.map(e => e.id === editingExerciseId ? exerciseData : e)
                        };
                    } else {
                        return {
                            ...s,
                            exercises: [...s.exercises, exerciseData]
                        };
                    }
                }
                return s;
            });

            setSections(updatedSections);
            await saveWorkoutsToFirebase(updatedSections);

            setNewExercise({ name: "", sets: "", reps: "", restTime: "", notes: "", imageUrl: "" });
            setImageFile(null);
            setEditingExerciseId(null);
            setIsExerciseModalOpen(false);
        } catch (error) {
            console.error("Erro ao salvar exercício:", error);
        } finally {
            setIsUploading(false);
        }
    };

    const removeExercise = (sectionId: string, exerciseId: string) => {
        const updatedSections = sections.map(s => {
            if (s.id === sectionId) {
                return {
                    ...s,
                    exercises: s.exercises.filter(e => e.id !== exerciseId)
                };
            }
            return s;
        });
        setSections(updatedSections);
        saveWorkoutsToFirebase(updatedSections);
    };

    const moveExercise = (sectionId: string, index: number, direction: 'up' | 'down') => {
        const updatedSections = sections.map(s => {
            if (s.id === sectionId) {
                const newExercises = [...s.exercises];
                if (direction === 'up' && index > 0) {
                    [newExercises[index - 1], newExercises[index]] = [newExercises[index], newExercises[index - 1]];
                } else if (direction === 'down' && index < newExercises.length - 1) {
                    [newExercises[index], newExercises[index + 1]] = [newExercises[index + 1], newExercises[index]];
                }
                return { ...s, exercises: newExercises };
            }
            return s;
        });
        setSections(updatedSections);
        saveWorkoutsToFirebase(updatedSections);
    };

    const activeSection = sections.find(s => s.id === activeSectionId);

    const generatePDF = async () => {
        if (sections.length === 0) return;
        setIsGeneratingPdf(true);
        setTimeout(async () => {
            try {
                const element = document.getElementById("pdf-content");
                if (!element) return;
                
                element.style.display = "block";
                element.style.position = "absolute";
                element.style.top = "-9999px";
                
                const canvas = await html2canvas(element, {
                    scale: 2,
                    useCORS: true,
                    backgroundColor: "#fdfbf6",
                    logging: false,
                });
                
                element.style.display = "none";
                
                const imgData = canvas.toDataURL("image/jpeg", 0.95);
                
                const pdfWidth = 210;
                const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
                
                const pdf = new jsPDF({
                    orientation: "portrait",
                    unit: "mm",
                    format: [pdfWidth, pdfHeight]
                });
                
                pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);
                pdf.save(`Protocolo_Treino_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`);
            } catch (error) {
                console.error("Erro ao gerar PDF:", error);
            } finally {
                setIsGeneratingPdf(false);
            }
        }, 100);
    };

    if (loading) {
        return (
            <div className="max-w-[1400px] mx-auto px-12 pt-12 flex justify-center items-center h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-[#d84a22]" />
            </div>
        );
    }

    return (
        <div className="max-w-[1400px] mx-auto px-4 md:px-12 pb-24 pt-8 md:pt-12">
            <div className="relative">
                <div className="md:absolute right-0 top-0 md:top-2 flex justify-end mb-4 md:mb-0 z-10">
                    <button
                        onClick={generatePDF}
                        disabled={isGeneratingPdf || sections.length === 0}
                        className="flex items-center gap-2 bg-[#d84a22] text-white px-5 py-2.5 rounded-sm hover:bg-[#c2421f] transition-all disabled:opacity-50 disabled:cursor-not-allowed group border border-transparent hover:border-[#fdfbf6]/20 font-bold tracking-wider shadow-lg"
                    >
                        {isGeneratingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />}
                        <span className="text-[10px] md:text-xs uppercase">Exportar PDF</span>
                    </button>
                </div>
                <Header
                    title="Treinos"
                    subtitle="Gerencie suas rotinas"
                />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 md:gap-8">
                {/* Left Column - Manage Sections */}
                <div className="xl:col-span-1 space-y-6 md:space-y-8">
                    <div className="bg-white rounded-3xl p-6 md:p-8 border border-[#f2eee3] shadow-sm">
                        <h4 className="font-heading text-lg font-bold text-[#1a1a1c] mb-4 md:mb-6">Criar Seção</h4>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newSectionName}
                                onChange={(e) => setNewSectionName(e.target.value)}
                                placeholder="Ex: Push, Pull, Legs"
                                className="flex-1 bg-[#f4f2ea] border-none rounded-xl px-4 py-3 text-[#1a1a1c] placeholder-[#a19e95] focus:ring-1 focus:ring-[#d84a22] transition-all outline-none text-sm"
                            />
                            <button
                                onClick={addSection}
                                className="bg-[#d84a22] text-white px-4 py-3 rounded-xl hover:bg-[#c2421f] transition-colors"
                            >
                                <Plus className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="mt-8 space-y-3">
                            {sections.length === 0 ? (
                                <p className="text-xs text-[#a19e95] font-mono-data uppercase tracking-widest text-center py-4">
                                    Nenhuma seção criada
                                </p>
                            ) : (
                                sections.map(section => (
                                    <div
                                        key={section.id}
                                        onClick={() => setActiveSectionId(section.id)}
                                        className={`p-4 rounded-xl border cursor-pointer flex justify-between items-center transition-all ${activeSectionId === section.id
                                            ? "bg-[#faf9f5] border-[#d84a22] shadow-[0_4px_12px_rgba(216,74,34,0.08)]"
                                            : "bg-white border-[#e6e2d6] hover:border-[#a19e95]"
                                            }`}
                                    >
                                        <span className={`font-bold text-sm ${activeSectionId === section.id ? "text-[#d84a22]" : "text-[#1a1a1c]"}`}>{section.name}</span>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                removeSection(section.id);
                                            }}
                                            className={activeSectionId === section.id ? "text-[#d84a22]/50 hover:text-[#d84a22]" : "text-[#a19e95] hover:text-red-500"}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column - Exercises for active section */}
                <div className="xl:col-span-2 space-y-6 md:space-y-8">
                    {activeSection ? (
                        <div className="bg-white rounded-3xl p-6 md:p-8 border border-[#f2eee3] shadow-sm relative overflow-hidden min-h-[400px] flex flex-col">

                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center relative z-10 mb-6 md:mb-8 border-b border-[#f2eee3] pb-4 md:pb-6 gap-4 border-dashed md:border-solid">
                                <div>
                                    <span className="inline-block px-3 py-1 bg-[#d84a22]/10 text-[#d84a22] text-[10px] font-bold tracking-widest uppercase rounded-full mb-3">
                                        Seção Ativa
                                    </span>
                                    <h3 className="font-heading text-3xl font-bold text-[#1a1a1c]">{activeSection.name}</h3>
                                </div>
                                <button
                                    onClick={openAddModal}
                                    className="flex items-center gap-2 bg-[#1a1a1c] text-white px-5 md:px-6 py-2.5 md:py-3 rounded-full hover:bg-[#3a3a3c] transition-colors self-end md:self-auto"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span className="text-[11px] md:text-sm font-bold uppercase tracking-wider md:tracking-normal md:normal-case">Novo</span>
                                </button>
                            </div>

                            {/* Exercises List */}
                            <div className="relative z-10 flex-1">
                                {activeSection.exercises.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-[#a19e95] py-12 bg-[#faf9f5] rounded-2xl border border-dashed border-[#e6e2d6]">
                                        <Dumbbell className="w-8 h-8 mb-4 opacity-30" />
                                        <p className="text-sm font-mono-data tracking-widest uppercase">Nenhum exercício adicionado</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {activeSection.exercises.map((ex, idx) => (
                                            <div key={ex.id} className="bg-white rounded-2xl p-4 md:p-5 border border-[#e6e2d6] flex flex-col md:flex-row md:items-center gap-4 md:gap-6 hover:shadow-[0_8px_24px_rgba(0,0,0,0.04)] transition-all">
                                                <div className="flex items-start md:items-center gap-3 md:gap-6 flex-1">
                                                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-[#faf9f5] text-[#d84a22] font-mono-data text-xs md:text-sm font-bold flex items-center justify-center shrink-0 border border-[#f2eee3]">
                                                        {(idx + 1).toString().padStart(2, '0')}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h5 className="font-bold text-[#1a1a1c] text-[15px] md:text-[16px] leading-tight truncate">{ex.name}</h5>
                                                        {ex.notes && <p className="text-[12px] md:text-sm text-[#88888b] mt-0.5 md:mt-1 truncate">{ex.notes}</p>}
                                                    </div>
                                                </div>

                                                <div className="flex gap-4 md:gap-6 justify-between md:justify-start items-center md:border-l md:border-[#f2eee3] md:pl-6 bg-[#f4f2ea] md:bg-transparent p-3 md:p-0 rounded-xl md:rounded-none">
                                                    <div className="flex-1 md:flex-none text-center md:text-left">
                                                        <span className="block text-[9px] md:text-[10px] font-bold tracking-widest uppercase text-[#a19e95] mb-0.5 md:mb-1">Séries</span>
                                                        <span className="font-mono-data font-bold text-[#1a1a1c] text-xs md:text-base">{ex.sets || '-'}</span>
                                                    </div>
                                                    <div className="flex-1 md:flex-none text-center md:text-left">
                                                        <span className="block text-[9px] md:text-[10px] font-bold tracking-widest uppercase text-[#a19e95] mb-0.5 md:mb-1">Reps</span>
                                                        <span className="font-mono-data font-bold text-[#1a1a1c] text-xs md:text-base">{ex.reps || '-'}</span>
                                                    </div>
                                                    <div className="flex-1 md:flex-none text-center md:text-left">
                                                        <span className="flex items-center justify-center md:justify-start gap-1 text-[9px] md:text-[10px] font-bold tracking-widest uppercase text-[#a19e95] mb-0.5 md:mb-1">
                                                            Rest
                                                        </span>
                                                        <div className="flex items-center justify-center md:justify-start gap-1 text-[#1a1a1c] text-xs md:text-base">
                                                            <Clock className="w-3 h-3 text-[#d84a22] hidden md:block" />
                                                            <span className="font-mono-data font-bold">{ex.restTime || '-'}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-end md:ml-2 md:border-l border-[#f2eee3] md:pl-4 gap-2">
                                                    <div className="flex flex-col gap-1 mr-2 md:mr-4">
                                                        <button
                                                            onClick={() => moveExercise(activeSection.id, idx, 'up')}
                                                            disabled={idx === 0}
                                                            className="text-[#a19e95] hover:text-[#1a1a1c] disabled:opacity-20 disabled:hover:text-[#a19e95] transition-colors p-1"
                                                        >
                                                            <ArrowUp className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={() => moveExercise(activeSection.id, idx, 'down')}
                                                            disabled={idx === activeSection.exercises.length - 1}
                                                            className="text-[#a19e95] hover:text-[#1a1a1c] disabled:opacity-20 disabled:hover:text-[#a19e95] transition-colors p-1"
                                                        >
                                                            <ArrowDown className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                    {ex.imageUrl && (
                                                        <button
                                                            onClick={() => setPreviewImage(ex.imageUrl!)}
                                                            className="w-10 h-10 rounded-full flex items-center justify-center text-[#d84a22] bg-[#d84a22]/5 hover:bg-[#d84a22]/10 transition-all border border-[#d84a22]/10"
                                                            title="Ver Equipamento"
                                                        >
                                                            <ImageIcon className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => openEditModal(ex)}
                                                        className="w-10 h-10 rounded-full flex items-center justify-center text-[#a19e95] hover:text-[#d84a22] hover:bg-[#d84a22]/5 transition-all border border-[#e6e2d6] md:border-transparent hover:border-[#d84a22]/20"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => removeExercise(activeSection.id, ex.id)}
                                                        className="w-10 h-10 rounded-full flex items-center justify-center text-[#a19e95] hover:text-red-500 hover:bg-red-50 transition-all border border-[#e6e2d6] md:border-transparent hover:border-red-100"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-3xl border border-[#f2eee3] shadow-sm h-full min-h-[400px] flex items-center justify-center">
                            <p className="text-[#a19e95] text-sm font-mono-data uppercase tracking-widest">
                                Selecione ou crie uma seção de treino
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal for adding exercise */}
            {isExerciseModalOpen && activeSection && (
                <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-[#1a1a1c]/40 backdrop-blur-md md:p-4">
                    <div className="bg-white rounded-t-3xl md:rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-[#f2eee3] max-h-[90dvh] flex flex-col animate-in slide-in-from-bottom-[100%] md:slide-in-from-bottom-8 duration-300">
                        {/* Mobile handle indicator */}
                        <div className="w-12 h-1.5 bg-[#e6e2d6] rounded-full mx-auto md:hidden my-3 shrink-0" />

                        <div className="p-4 md:p-6 border-b border-[#f2eee3] flex justify-between items-center bg-[#faf9f5]">
                            <h3 className="font-heading text-lg md:text-xl font-bold text-[#1a1a1c]">
                                {editingExerciseId ? "Editar Exercício" : "Adicionar Exercício"}
                            </h3>
                            <button
                                onClick={() => setIsExerciseModalOpen(false)}
                                className="text-[#a19e95] hover:text-[#1a1a1c] transition-colors p-2 rounded-full hover:bg-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 md:p-8 space-y-6 overflow-y-auto custom-scrollbar">
                            <div>
                                <label className="block text-xs font-bold tracking-widest uppercase text-[#a19e95] mb-2">Nome do Exercício</label>
                                <input
                                    type="text"
                                    placeholder="Ex: Supino Reto"
                                    value={newExercise.name}
                                    onChange={(e) => setNewExercise({ ...newExercise, name: e.target.value })}
                                    className="w-full bg-[#faf9f5] border border-[#e6e2d6] rounded-xl px-4 py-3 text-[#1a1a1c] placeholder-[#a19e95] focus:border-[#d84a22] focus:ring-1 focus:ring-[#d84a22] outline-none text-sm transition-all"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold tracking-widest uppercase text-[#a19e95] mb-2">Séries</label>
                                    <input
                                        type="number"
                                        placeholder="Ex: 4"
                                        value={newExercise.sets}
                                        onChange={(e) => setNewExercise({ ...newExercise, sets: e.target.value })}
                                        className="w-full bg-[#faf9f5] border border-[#e6e2d6] rounded-xl px-4 py-3 text-[#1a1a1c] placeholder-[#a19e95] focus:border-[#d84a22] focus:ring-1 focus:ring-[#d84a22] outline-none text-sm transition-all font-mono-data"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold tracking-widest uppercase text-[#a19e95] mb-2">Repetições</label>
                                    <input
                                        type="text"
                                        placeholder="Ex: 10-12"
                                        value={newExercise.reps}
                                        onChange={(e) => setNewExercise({ ...newExercise, reps: e.target.value })}
                                        className="w-full bg-[#faf9f5] border border-[#e6e2d6] rounded-xl px-4 py-3 text-[#1a1a1c] placeholder-[#a19e95] focus:border-[#d84a22] focus:ring-1 focus:ring-[#d84a22] outline-none text-sm transition-all font-mono-data"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold tracking-widest uppercase text-[#a19e95] mb-2">Tempo de Descanso</label>
                                <input
                                    type="text"
                                    placeholder="Ex: 90s ou 1:30"
                                    value={newExercise.restTime}
                                    onChange={(e) => setNewExercise({ ...newExercise, restTime: e.target.value })}
                                    className="w-full bg-[#faf9f5] border border-[#e6e2d6] rounded-xl px-4 py-3 text-[#1a1a1c] placeholder-[#a19e95] focus:border-[#d84a22] focus:ring-1 focus:ring-[#d84a22] outline-none text-sm transition-all font-mono-data"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold tracking-widest uppercase text-[#a19e95] mb-2">Imagem do Equipamento (Opcional)</label>
                                <div className="relative">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        id="exercise-image"
                                        onChange={(e) => {
                                            if (e.target.files && e.target.files[0]) {
                                                setImageFile(e.target.files[0]);
                                            }
                                        }}
                                        className="hidden"
                                    />
                                    <label
                                        htmlFor="exercise-image"
                                        className="flex items-center justify-center gap-2 w-full bg-[#faf9f5] border border-dashed border-[#d84a22]/30 rounded-xl px-4 py-6 text-[#1a1a1c] cursor-pointer hover:bg-[#d84a22]/5 hover:border-[#d84a22] transition-colors group"
                                    >
                                        {imageFile ? (
                                            <div className="flex flex-col items-center">
                                                <ImageIcon className="w-6 h-6 text-[#d84a22] mb-2" />
                                                <span className="text-sm font-bold text-[#1a1a1c]">{imageFile.name}</span>
                                                <span className="text-xs text-[#a19e95] mt-1">Clique para trocar a imagem</span>
                                            </div>
                                        ) : newExercise.imageUrl ? (
                                            <div className="flex flex-col items-center">
                                                <ImageIcon className="w-6 h-6 text-[#d84a22] mb-2" />
                                                <span className="text-sm font-bold text-[#1a1a1c]">Imagem Atual Salva</span>
                                                <span className="text-xs text-[#a19e95] mt-1">Clique para enviar uma nova</span>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center opacity-70 group-hover:opacity-100 transition-opacity">
                                                <Upload className="w-6 h-6 text-[#d84a22] mb-2" />
                                                <span className="text-sm font-bold text-[#1a1a1c]">Fazer upload de foto</span>
                                                <span className="text-[10px] text-[#a19e95] tracking-widest uppercase mt-1">PNG, JPG ou WEBP</span>
                                            </div>
                                        )}
                                    </label>
                                    {(imageFile || newExercise.imageUrl) && (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                setImageFile(null);
                                                setNewExercise({ ...newExercise, imageUrl: "" });
                                            }}
                                            className="absolute top-2 right-2 p-1.5 bg-white rounded-full shadow-sm text-red-500 hover:bg-red-50 transition-colors"
                                            title="Remover imagem"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold tracking-widest uppercase text-[#a19e95] mb-2">Observações (Opcional)</label>
                                <textarea
                                    placeholder="Ex: Focar na contração de pico..."
                                    value={newExercise.notes}
                                    onChange={(e) => setNewExercise({ ...newExercise, notes: e.target.value })}
                                    rows={2}
                                    className="w-full bg-[#faf9f5] border border-[#e6e2d6] rounded-xl px-4 py-3 text-[#1a1a1c] placeholder-[#a19e95] focus:border-[#d84a22] focus:ring-1 focus:ring-[#d84a22] outline-none text-sm transition-all resize-none"
                                />
                            </div>

                            <button
                                onClick={() => saveExercise(activeSection.id)}
                                disabled={!newExercise.name.trim() || isUploading}
                                className="w-full bg-[#1a1a1c] text-white rounded-xl py-4 font-bold text-sm hover:bg-[#d84a22] transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2 flex items-center justify-center gap-2"
                            >
                                {isUploading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Salvando...
                                    </>
                                ) : (
                                    editingExerciseId ? "Salvar Alterações" : "Adicionar ao Treino"
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Preview de Imagem */}
            {previewImage && (
                <div
                    className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#1a1a1c]/80 backdrop-blur-md"
                    onClick={() => setPreviewImage(null)}
                >
                    <div className="relative max-w-3xl w-full max-h-[90dvh] flex flex-col items-center justify-center" onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => setPreviewImage(null)}
                            className="absolute -top-12 md:top-2 right-0 md:-right-12 text-white hover:text-[#d84a22] transition-colors p-2"
                        >
                            <X className="w-8 h-8" />
                        </button>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={previewImage}
                            alt="Equipamento"
                            className="max-w-full max-h-[80dvh] rounded-2xl shadow-2xl object-contain border border-white/10"
                        />
                    </div>
                </div>
            )}

            {/* Hidden PDF Aesthetic Export Template */}
            <div
                id="pdf-content"
                className="w-[800px] bg-white text-[#1a1a1c] relative hidden font-sans"
            >
                <div className="px-16 py-20">
                    <div className="flex justify-between items-start mb-16 px-4">
                        <div>
                            <h1 className="text-3xl font-light tracking-tight text-[#1a1a1c]">
                                Protocolo de Treinamento
                            </h1>
                            <p className="text-sm text-[#a19e95] mt-2 font-light">
                                Haumea Physique
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] text-[#a19e95] uppercase tracking-widest font-mono mb-1">
                                Emissão
                            </p>
                            <p className="text-sm text-[#1a1a1c]">
                                {new Date().toLocaleDateString('pt-BR')}
                            </p>
                        </div>
                    </div>

                    <div className="space-y-16">
                        {sections.map((sec) => (
                            <div key={sec.id} className="relative z-10">
                                <h2 className="text-xl font-medium text-[#1a1a1c] border-b border-[#e6e2d6] pb-3 mb-6 px-4">
                                    {sec.name}
                                </h2>

                                <div className="space-y-4 px-4">
                                    {sec.exercises.map((ex, exIdx) => (
                                        <div key={ex.id} className="flex gap-4 items-baseline py-2 border-b border-[#faf9f5]">
                                            <div className="text-sm text-[#a19e95] w-6 shrink-0 font-mono">
                                                {(exIdx + 1).toString().padStart(2, '0')}
                                            </div>
                                            
                                            <div className="flex-1">
                                                <h3 className="text-base font-medium text-[#1a1a1c]">
                                                    {ex.name}
                                                </h3>
                                                {ex.notes && (
                                                    <p className="text-xs text-[#88888b] mt-1 font-light">
                                                        {ex.notes}
                                                    </p>
                                                )}
                                            </div>

                                            <div className="flex gap-8 text-right shrink-0">
                                                <div className="w-12">
                                                    <span className="block text-[8px] tracking-widest uppercase text-[#a19e95] mb-0.5">Séries</span>
                                                    <span className="font-mono text-[#1a1a1c] text-sm">{ex.sets || '-'}</span>
                                                </div>
                                                <div className="w-16">
                                                    <span className="block text-[8px] tracking-widest uppercase text-[#a19e95] mb-0.5">Reps</span>
                                                    <span className="font-mono text-[#1a1a1c] text-sm">{ex.reps || '-'}</span>
                                                </div>
                                                <div className="w-16">
                                                    <span className="block text-[8px] tracking-widest uppercase text-[#a19e95] mb-0.5">Descanso</span>
                                                    <span className="font-mono text-[#1a1a1c] text-sm">{ex.restTime || '-'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {sec.exercises.length === 0 && (
                                        <div className="py-2 text-[#a19e95] text-sm font-light">
                                            Nenhum exercício registrado nesta seção.
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-20 pt-6 border-t border-[#e6e2d6] text-center px-4">
                        <p className="text-[9px] tracking-widest uppercase text-[#a19e95]">
                            Documento gerado digitalmente • Haumea Physique
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
