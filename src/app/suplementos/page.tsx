"use client";

import { useState, useEffect, type DragEvent } from "react";
import { Header } from "@/components/Header";
import {
    Pill,
    Plus,
    Trash2,
    X,
    CheckCircle2,
    Circle,
    Loader2,
    Clock,
    Info,
    LineChart,
    Zap,
    Edit2,
    GripVertical
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

interface Supplement {
    id: string;
    name: string;
    quantity: string;
    time: string;
    checked?: boolean;
}

export default function Suplementos() {
    const { user } = useAuth();
    const [supplements, setSupplements] = useState<Supplement[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSupplementModalOpen, setIsSupplementModalOpen] = useState(false);
    const [editingSupplementId, setEditingSupplementId] = useState<string | null>(null);
    const [draggedSupplementId, setDraggedSupplementId] = useState<string | null>(null);
    const [dragOverSupplementId, setDragOverSupplementId] = useState<string | null>(null);

    const [supplementForm, setSupplementForm] = useState({
        name: "",
        quantity: "",
        time: ""
    });

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        const fetchSupplements = async () => {
            try {
                const docRef = doc(db, "users", user.uid, "supplements", "plan");
                const docSnap = await getDoc(docRef);
                const today = new Date().toISOString().split("T")[0];

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    let loaded: Supplement[] = data.items || [];

                    if (data.lastResetDate !== today) {
                        loaded = loaded.map(supplement => ({ ...supplement, checked: false }));
                        await setDoc(docRef, { items: loaded, lastResetDate: today }, { merge: true });
                    }

                    setSupplements(loaded);
                }
            } catch (error) {
                console.error("Erro ao carregar suplementos:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchSupplements();
    }, [user]);

    const saveToFirebase = async (updated: Supplement[]) => {
        if (!user) return;

        try {
            const today = new Date().toISOString().split("T")[0];
            const docRef = doc(db, "users", user.uid, "supplements", "plan");
            await setDoc(docRef, { items: updated, lastResetDate: today }, { merge: true });
        } catch (error) {
            console.error("Erro ao salvar suplementos:", error);
        }
    };

    const closeSupplementModal = () => {
        setIsSupplementModalOpen(false);
        setEditingSupplementId(null);
        setSupplementForm({ name: "", quantity: "", time: "" });
    };

    const openCreateModal = () => {
        setEditingSupplementId(null);
        setSupplementForm({ name: "", quantity: "", time: "" });
        setIsSupplementModalOpen(true);
    };

    const openEditModal = (supplement: Supplement) => {
        setEditingSupplementId(supplement.id);
        setSupplementForm({
            name: supplement.name,
            quantity: supplement.quantity,
            time: supplement.time
        });
        setIsSupplementModalOpen(true);
    };

    const saveSupplement = () => {
        if (!supplementForm.name.trim() || !supplementForm.time.trim()) return;

        const normalizedSupplement = {
            name: supplementForm.name.trim(),
            quantity: supplementForm.quantity.trim(),
            time: supplementForm.time.trim()
        };

        const updated = editingSupplementId
            ? supplements.map(supplement => supplement.id === editingSupplementId
                ? { ...supplement, ...normalizedSupplement }
                : supplement)
            : [
                ...supplements,
                {
                    id: Date.now().toString(),
                    ...normalizedSupplement,
                    checked: false
                }
            ];

        setSupplements(updated);
        saveToFirebase(updated);
        closeSupplementModal();
    };

    const removeSupplement = (id: string) => {
        const updated = supplements.filter(supplement => supplement.id !== id);
        setSupplements(updated);
        saveToFirebase(updated);
    };

    const toggleCheck = (id: string) => {
        const updated = supplements.map(supplement =>
            supplement.id === id ? { ...supplement, checked: !supplement.checked } : supplement
        );
        setSupplements(updated);
        saveToFirebase(updated);
    };

    const reorderSupplements = (sourceId: string, targetId: string) => {
        if (sourceId === targetId) return;

        const sourceIndex = supplements.findIndex(supplement => supplement.id === sourceId);
        const targetIndex = supplements.findIndex(supplement => supplement.id === targetId);

        if (sourceIndex === -1 || targetIndex === -1) return;

        const updated = [...supplements];
        const [movedItem] = updated.splice(sourceIndex, 1);
        updated.splice(targetIndex, 0, movedItem);

        setSupplements(updated);
        saveToFirebase(updated);
    };

    const handleDragStart = (supplementId: string) => {
        setDraggedSupplementId(supplementId);
    };

    const handleDragOver = (event: DragEvent<HTMLDivElement>, supplementId: string) => {
        event.preventDefault();

        if (dragOverSupplementId !== supplementId) {
            setDragOverSupplementId(supplementId);
        }
    };

    const handleDrop = (event: DragEvent<HTMLDivElement>, supplementId: string) => {
        event.preventDefault();

        if (draggedSupplementId) {
            reorderSupplements(draggedSupplementId, supplementId);
        }

        setDraggedSupplementId(null);
        setDragOverSupplementId(null);
    };

    const handleDragEnd = () => {
        setDraggedSupplementId(null);
        setDragOverSupplementId(null);
    };

    if (loading) {
        return (
            <div className="max-w-[1400px] mx-auto px-12 pt-12 flex justify-center items-center h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-[#1a1a1c]" />
            </div>
        );
    }

    const totalSupplements = supplements.length;
    const checkedSupplements = supplements.filter(supplement => supplement.checked).length;
    const progressPercentage = totalSupplements > 0 ? (checkedSupplements / totalSupplements) * 100 : 0;

    return (
        <div className="max-w-[1400px] mx-auto px-4 md:px-12 pb-24 pt-8 md:pt-12 relative animate-in fade-in duration-300">
            <Header
                title="Protocolo de Suplementos"
                subtitle="Gerencie seu uso diario de ergogenicos e vitaminas"
            />

            <section className="bg-white border border-[#f2eee3] rounded-3xl p-6 md:p-8 mb-8 md:mb-10 shadow-sm relative overflow-hidden flex flex-col md:flex-row gap-6 md:gap-8 justify-between items-start md:items-center group">
                <div className="relative z-10 w-full md:w-auto md:flex-1 min-w-[200px]">
                    <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#a19e95] flex items-center gap-2 mb-2">
                        <LineChart className="w-3 h-3 text-[#d84a22]" /> Consumo Diario
                    </span>
                    <div className="flex items-baseline gap-2">
                        <h3 className="font-heading text-4xl md:text-5xl font-bold tracking-tight text-[#1a1a1c]">
                            {checkedSupplements}
                        </h3>
                        <span className="font-heading text-2xl md:text-3xl font-bold text-[#a19e95]">
                            /{totalSupplements}
                        </span>
                        <span className="ml-1 text-[10px] md:text-sm font-medium text-[#88888b] uppercase tracking-wider">Doses</span>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 md:gap-10 relative z-10 w-full md:w-auto items-stretch sm:items-center">
                    <div className="flex gap-4">
                        <div className="flex flex-col gap-2 p-5 bg-[#f4f2ea] rounded-2xl min-w-[140px] border border-[#e6e2d6]">
                            <span className="text-[10px] font-bold tracking-widest uppercase text-[#a19e95]">Adesao</span>
                            <div className="flex items-end gap-2">
                                <span className="font-mono-data text-2xl font-bold text-[#1a1a1c]">
                                    {Math.round(progressPercentage)}%
                                </span>
                            </div>
                            <div className="w-full bg-[#1a1a1c]/10 h-1.5 rounded-full overflow-hidden mt-1">
                                <div
                                    className="bg-[#d84a22] h-full rounded-full transition-all duration-1000 ease-out"
                                    style={{ width: `${progressPercentage}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col items-stretch sm:items-end gap-2">
                        <button
                            onClick={openCreateModal}
                            className="flex items-center justify-center sm:justify-start gap-2 bg-[#1a1a1c] text-white px-6 py-4 rounded-xl hover:bg-[#3a3a3c] transition-all"
                        >
                            <Plus className="w-5 h-5" />
                            <span className="text-[11px] md:text-sm font-bold uppercase tracking-wider">Novo Suplemento</span>
                        </button>
                        {supplements.length > 1 && (
                            <span className="text-[10px] font-mono-data tracking-widest uppercase text-[#a19e95] text-center sm:text-right">
                                Arraste os cards para reordenar
                            </span>
                        )}
                    </div>
                </div>
            </section>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {supplements.length === 0 ? (
                    <div className="col-span-full py-20 flex flex-col items-center justify-center border-2 border-dashed border-[#e6e2d6] rounded-3xl bg-[#f4f2ea]/50 text-center">
                        <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center mb-6 shadow-sm">
                            <Pill className="w-8 h-8 text-[#a19e95]" />
                        </div>
                        <h3 className="font-heading text-xl font-bold text-[#1a1a1c] mb-2">Sem suplementos ainda</h3>
                        <p className="text-[#88888b] text-sm max-w-sm mb-6 font-mono-data tracking-wide">
                            Adicione seu primeiro suplemento, vitamina ou ergogenico ao protocolo diario.
                        </p>
                        <button
                            onClick={openCreateModal}
                            className="bg-white border border-[#e6e2d6] text-[#1a1a1c] px-6 py-3 rounded-full hover:bg-[#1a1a1c] hover:text-white transition-all text-xs font-bold uppercase tracking-widest flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Comecar
                        </button>
                    </div>
                ) : (
                    supplements.map(supplement => (
                        <div
                            key={supplement.id}
                            draggable
                            onDragStart={() => handleDragStart(supplement.id)}
                            onDragOver={(event) => handleDragOver(event, supplement.id)}
                            onDrop={(event) => handleDrop(event, supplement.id)}
                            onDragEnd={handleDragEnd}
                            onClick={() => toggleCheck(supplement.id)}
                            className={`group relative bg-white p-6 rounded-2xl border transition-all duration-300 cursor-grab active:cursor-grabbing overflow-hidden ${supplement.checked
                                ? "border-[#d84a22] shadow-[0_4px_20px_-4px_rgba(216,74,34,0.1)]"
                                : "border-[#e6e2d6] hover:border-[#1a1a1c] hover:shadow-lg"
                                } ${draggedSupplementId === supplement.id ? "opacity-50 scale-[0.98]" : ""} ${dragOverSupplementId === supplement.id && draggedSupplementId !== supplement.id
                                ? "border-[#1a1a1c] ring-1 ring-[#1a1a1c]/10"
                                : ""
                                }`}
                        >
                            <div className="flex items-start justify-between mb-6 relative z-10">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${supplement.checked ? "bg-[#d84a22] text-white" : "bg-[#f4f2ea] text-[#1a1a1c]"
                                    }`}>
                                    <Zap className="w-6 h-6" />
                                </div>

                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={(event) => event.stopPropagation()}
                                        className="text-[#a19e95] hover:text-[#1a1a1c] transition-colors p-2 cursor-grab active:cursor-grabbing"
                                        title="Arrastar para reordenar"
                                    >
                                        <GripVertical className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            openEditModal(supplement);
                                        }}
                                        className="text-[#a19e95] hover:text-[#1a1a1c] transition-colors p-2"
                                        title="Editar suplemento"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            removeSupplement(supplement.id);
                                        }}
                                        className="text-[#a19e95] hover:text-red-500 md:opacity-0 md:group-hover:opacity-100 transition-opacity p-2"
                                        title="Excluir suplemento"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            toggleCheck(supplement.id);
                                        }}
                                        className={`p-1 hover:scale-110 transition-transform ${supplement.checked ? "text-[#d84a22]" : "text-[#e6e2d6]"}`}
                                        title={supplement.checked ? "Desmarcar dose" : "Marcar dose"}
                                    >
                                        {supplement.checked ? <CheckCircle2 className="w-6 h-6 fill-[#d84a22]/10" /> : <Circle className="w-6 h-6 hover:text-[#1a1a1c]" />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <h4 className={`font-heading font-bold text-lg mb-1 leading-tight transition-all ${supplement.checked ? "text-[#1a1a1c] opacity-60 line-through decoration-2" : "text-[#1a1a1c]"
                                    }`}>
                                    {supplement.name}
                                </h4>

                                <div className={`flex flex-col gap-2 mt-4 text-xs font-mono-data tracking-wide uppercase transition-all ${supplement.checked ? "opacity-60" : "text-[#88888b]"
                                    }`}>
                                    <div className="flex items-center gap-2">
                                        <Info className="w-3.5 h-3.5" />
                                        <span className="font-bold">{supplement.quantity || "Dose unica"}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-3.5 h-3.5" />
                                        <span className={supplement.checked ? "" : "text-[#d84a22] font-bold"}>
                                            {supplement.time}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {isSupplementModalOpen && (
                <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 md:p-4">
                    <div className="bg-white rounded-t-3xl md:rounded-3xl w-full max-w-md p-6 md:p-8 shadow-2xl relative animate-in slide-in-from-bottom-[100%] md:zoom-in-95 duration-200 flex flex-col max-h-[90dvh]">
                        <div className="w-12 h-1.5 bg-[#e6e2d6] rounded-full mx-auto md:hidden mb-6 mt-2 shrink-0" />

                        <div className="overflow-y-auto custom-scrollbar">
                            <button
                                onClick={closeSupplementModal}
                                className="absolute top-6 right-6 p-2 text-[#a19e95] hover:text-[#1a1a1c] transition-colors rounded-full hover:bg-[#f4f2ea] hidden md:block"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <div className="w-12 h-12 rounded-xl bg-[#f4f2ea] flex items-center justify-center mb-6">
                                <Pill className="w-6 h-6 text-[#1a1a1c]" />
                            </div>

                            <h4 className="font-heading text-2xl font-bold text-[#1a1a1c] mb-1">
                                {editingSupplementId ? "Editar Suplemento" : "Novo Suplemento"}
                            </h4>
                            <p className="text-xs text-[#a19e95] font-mono-data tracking-widest uppercase mb-8">
                                {editingSupplementId ? "Atualize o item selecionado" : "Adicione um item ao seu plano"}
                            </p>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-bold tracking-widest uppercase text-[#88888b] mb-1.5 ml-1">
                                        Nome do Produto
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Ex: Creatina Creapure, Whey Isolado..."
                                        value={supplementForm.name}
                                        onChange={(event) => setSupplementForm({ ...supplementForm, name: event.target.value })}
                                        className="w-full bg-[#f4f2ea] border-none rounded-xl px-4 py-3 text-[#1a1a1c] outline-none text-sm placeholder-[#a19e95] focus:ring-1 focus:ring-[#1a1a1c] transition-shadow"
                                        autoFocus
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-bold tracking-widest uppercase text-[#88888b] mb-1.5 ml-1">
                                            Quantidade / Dose
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Ex: 5g, 1 Scoop"
                                            value={supplementForm.quantity}
                                            onChange={(event) => setSupplementForm({ ...supplementForm, quantity: event.target.value })}
                                            className="w-full bg-[#f4f2ea] border-none rounded-xl px-4 py-3 text-[#1a1a1c] outline-none text-sm placeholder-[#a19e95] focus:ring-1 focus:ring-[#1a1a1c] transition-shadow"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold tracking-widest uppercase text-[#88888b] mb-1.5 ml-1">
                                            Horario / Momento
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Ex: 08:30 ou Pos-Treino"
                                            value={supplementForm.time}
                                            onChange={(event) => setSupplementForm({ ...supplementForm, time: event.target.value })}
                                            className="w-full bg-[#f4f2ea] border-none rounded-xl px-4 py-3 text-[#1a1a1c] outline-none text-sm placeholder-[#a19e95] focus:ring-1 focus:ring-[#1a1a1c] transition-shadow"
                                        />
                                    </div>
                                </div>

                                <div className="pt-4 md:pt-6">
                                    <button
                                        onClick={saveSupplement}
                                        className="w-full bg-[#1a1a1c] text-white rounded-xl py-4 flex items-center justify-center text-sm font-bold uppercase tracking-widest hover:bg-[#d84a22] transition-colors"
                                    >
                                        {editingSupplementId ? "Salvar Alteracoes" : "Adicionar ao Protocolo"}
                                    </button>
                                    <button
                                        onClick={closeSupplementModal}
                                        className="w-full mt-2 bg-transparent text-[#a19e95] rounded-xl py-3 flex items-center justify-center text-xs font-bold uppercase tracking-widest md:hidden"
                                    >
                                        Cancelar e Fechar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
