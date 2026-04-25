"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import {
    Syringe,
    Plus,
    Trash2,
    X,
    ShieldPlus,
    Activity,
    AlertCircle,
    CheckCircle2,
    Loader2,
    Dna
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

interface ProtocolItem {
    id: string;
    substanceName: string;
    ester?: string;
    dosageMg: number;
    frequency: string; // e.g. "2x / Semana", "TSD", "DSDN"
    route: "injetavel" | "oral" | "transdermico";
    type: "ergogenic" | "support" | "peptide";
}

interface ProtocolData {
    currentPhase: "TRT" | "Cruise" | "Blast" | "PCT" | "Off";
    items: ProtocolItem[];
    lastUpdated: string;
}

const PHASES = [
    { value: "Off", label: "Natty / Off", color: "bg-[#e6e2d6] text-[#7a7872]" },
    { value: "TRT", label: "Tratamento de Reposição (TRT)", color: "bg-blue-100 text-blue-800" },
    { value: "Cruise", label: "Cruise (Manutenção)", color: "bg-green-100 text-green-800" },
    { value: "Blast", label: "Blast (Alta Performance)", color: "bg-[#1a1a1c] text-white" },
    { value: "PCT", label: "Controle Pós-Ciclo (TPC)", color: "bg-amber-100 text-amber-800" },
];

const PRESET_FREQUENCIES = [
    "1x / Semana",
    "2x / Semana",
    "3x / Semana",
    "Dia Sim, Dia Não (DSDN)",
    "Todo Santo Dia (TSD)",
    "15 em 15 dias",
    "Mensal"
];

export default function Protocolos() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [protocol, setProtocol] = useState<ProtocolData>({
        currentPhase: "Off",
        items: [],
        lastUpdated: new Date().toISOString()
    });

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newItem, setNewItem] = useState<Partial<ProtocolItem>>({
        type: "ergogenic",
        substanceName: "",
        ester: "",
        dosageMg: 0,
        frequency: PRESET_FREQUENCIES[0],
        route: "injetavel"
    });

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        const fetchProtocol = async () => {
            try {
                const docRef = doc(db, "users", user.uid, "medical", "protocol");
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    setProtocol(docSnap.data() as ProtocolData);
                }
            } catch (error) {
                console.error("Erro ao carregar protocolo:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchProtocol();
    }, [user]);

    const saveProtocol = async (newProtocol: ProtocolData) => {
        if (!user) return;
        try {
            const docRef = doc(db, "users", user.uid, "medical", "protocol");
            await setDoc(docRef, newProtocol, { merge: true });
        } catch (error) {
            console.error("Erro ao salvar protocolo:", error);
        }
    };

    const handlePhaseChange = (phase: ProtocolData["currentPhase"]) => {
        const updated = { ...protocol, currentPhase: phase, lastUpdated: new Date().toISOString() };
        setProtocol(updated);
        saveProtocol(updated);
    };

    const handleAddItem = () => {
        if (!newItem.substanceName || !newItem.frequency) return;

        const item: ProtocolItem = {
            id: Date.now().toString(),
            substanceName: newItem.substanceName,
            ester: newItem.ester || "",
            dosageMg: Number(newItem.dosageMg) || 0,
            frequency: newItem.frequency,
            route: newItem.route as ProtocolItem["route"],
            type: newItem.type as ProtocolItem["type"],
        };

        const updated = {
            ...protocol,
            items: [...protocol.items, item],
            lastUpdated: new Date().toISOString()
        };

        setProtocol(updated);
        saveProtocol(updated);
        setIsModalOpen(false);
        setNewItem({ type: "ergogenic", substanceName: "", ester: "", dosageMg: 0, frequency: PRESET_FREQUENCIES[0], route: "injetavel" });
    };

    const handleRemoveItem = (id: string) => {
        const updatedItems = protocol.items.filter(i => i.id !== id);
        const updated = { ...protocol, items: updatedItems, lastUpdated: new Date().toISOString() };
        setProtocol(updated);
        saveProtocol(updated);
    };

    const ergogenics = protocol.items.filter(i => i.type === "ergogenic");
    const supports = protocol.items.filter(i => i.type === "support");
    const peptides = protocol.items.filter(i => i.type === "peptide");

    if (loading) {
        return (
            <div className="max-w-[1400px] mx-auto px-12 pt-12 flex justify-center items-center h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-[#1a1a1c]" />
            </div>
        );
    }

    return (
        <div className="max-w-[1400px] mx-auto px-4 md:px-12 pb-24 pt-8 md:pt-12 relative animate-in fade-in duration-500">
            <Header
                title="Protocolo"
                subtitle="Gestão rigorosa de compostos e recursos ergogênicos"
            />

            {/* Warning Banner */}
            <div className="mb-10 bg-[#1a1a1c] rounded-2xl p-6 border border-[#2a2a2c] flex items-start gap-4">
                <AlertCircle className="w-6 h-6 text-[#d84a22] shrink-0 mt-0.5" />
                <div>
                    <h4 className="text-white font-bold text-sm mb-1 font-heading tracking-wide">AVISO CLÍNICO</h4>
                    <p className="text-[#a19e95] text-xs leading-relaxed max-w-3xl">
                        Este módulo foi desenhado estritamente para controle individual e informativo. O uso de hormônios,
                        peptídeos e fármacos sem prescrição médica acarreta riscos severos à saúde. Mantenha acompanhamento com
                        um endocrinologista e monitore o perfil androgênico e lipídico regularmente.
                    </p>
                </div>
            </div>

            {/* Phase Selector */}
            <section className="bg-white border border-[#f2eee3] rounded-3xl p-6 md:p-8 mb-8 md:mb-10 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
                    <div>
                        <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#a19e95] flex items-center gap-2 mb-2">
                            <Activity className="w-3 h-3 text-[#d84a22]" /> Status do Protocolo
                        </span>
                        <h3 className="font-heading text-2xl font-bold text-[#1a1a1c]">Fase Atual</h3>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        {PHASES.map((p) => {
                            const isSelected = protocol.currentPhase === p.value;
                            return (
                                <button
                                    key={p.value}
                                    onClick={() => handlePhaseChange(p.value as any)}
                                    className={`px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300 border ${isSelected ? p.color + ' border-transparent shadow-sm scale-105' : 'bg-transparent text-[#a19e95] border-[#e6e2d6] hover:border-[#1a1a1c] hover:text-[#1a1a1c]'}`}
                                >
                                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5 inline mr-1.5 align-text-bottom" />}
                                    {p.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
                <div className="w-full h-[1px] bg-gradient-to-r from-[#e6e2d6] via-[#e6e2d6]/50 to-transparent mb-6"></div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <p className="text-[10px] md:text-xs text-[#88888b] font-mono-data uppercase tracking-widest">
                        Última Atualização: {new Date(protocol.lastUpdated).toLocaleDateString("pt-BR")}
                    </p>
                    <button
                        onClick={() => {
                            setNewItem({ ...newItem, type: "ergogenic" });
                            setIsModalOpen(true);
                        }}
                        className="flex items-center gap-2 bg-[#1a1a1c] text-white px-5 py-2.5 rounded-full hover:bg-[#3a3a3c] transition-colors w-full sm:w-auto justify-center"
                    >
                        <Plus className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-wider">Novo Composto</span>
                    </button>
                </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                {/* Ergogenics */}
                <div className="bg-white rounded-3xl p-8 border border-[#f2eee3] shadow-sm relative overflow-hidden group">
                    <div className="absolute -right-8 -top-8 w-40 h-40 bg-[#f4f2ea] rounded-full blur-3xl opacity-50 group-hover:bg-[#d84a22]/5 transition-colors duration-700"></div>

                    <div className="relative z-10 flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[#f4f2ea] flex items-center justify-center text-[#1a1a1c]">
                                <Syringe className="w-5 h-5" />
                            </div>
                            <h4 className="font-heading text-xl font-bold text-[#1a1a1c]">Base Androgênica</h4>
                        </div>
                    </div>

                    <div className="space-y-4 relative z-10">
                        {ergogenics.length === 0 ? (
                            <div className="py-8 text-center border-2 border-dashed border-[#e6e2d6] rounded-2xl">
                                <p className="text-xs text-[#a19e95] font-mono-data uppercase tracking-widest">Nenhum composto ativo</p>
                            </div>
                        ) : (
                            ergogenics.map(item => (
                                <div key={item.id} className="p-5 rounded-2xl border border-[#e6e2d6] hover:border-[#1a1a1c] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#faf9f5]">
                                    <div>
                                        <div className="flex items-baseline gap-2 mb-1">
                                            <h5 className="font-bold text-[#1a1a1c] text-base">{item.substanceName}</h5>
                                            {item.ester && <span className="text-[10px] uppercase font-bold text-[#88888b] bg-white px-2 py-0.5 rounded border border-[#e6e2d6]">{item.ester}</span>}
                                        </div>
                                        <p className="text-[11px] font-mono-data text-[#a19e95] uppercase tracking-wider flex items-center gap-2">
                                            <span className="text-[#1a1a1c] font-bold">{item.frequency}</span>
                                            <span className="w-1 h-1 rounded-full bg-[#e6e2d6]"></span>
                                            <span className="text-[#88888b]">{item.route}</span>
                                        </p>
                                    </div>
                                    <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-auto w-full">
                                        <div className="text-right flex-1 sm:flex-none">
                                            <span className="font-mono-data text-2xl font-bold text-[#1a1a1c]">{item.dosageMg}</span>
                                            <span className="text-[10px] font-bold text-[#d84a22] ml-1 uppercase">Mg</span>
                                        </div>
                                        <button
                                            onClick={() => handleRemoveItem(item.id)}
                                            className="text-[#a19e95] hover:text-red-500 transition-colors p-2 bg-white rounded-lg border border-transparent hover:border-red-100"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Peptides */}
                <div className="bg-white rounded-3xl p-6 md:p-8 border border-[#f2eee3] shadow-sm relative overflow-hidden group">
                    <div className="absolute -right-8 -top-8 w-40 h-40 bg-[#f4f2ea] rounded-full blur-3xl opacity-50 group-hover:bg-purple-500/5 transition-colors duration-700"></div>

                    <div className="relative z-10 flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                                <Dna className="w-5 h-5" />
                            </div>
                            <h4 className="font-heading text-xl font-bold text-[#1a1a1c]">Peptídeos</h4>
                        </div>
                        <button
                            onClick={() => {
                                setNewItem({ ...newItem, type: "peptide" });
                                setIsModalOpen(true);
                            }}
                            className="text-[10px] font-bold uppercase tracking-widest text-[#a19e95] hover:text-[#1a1a1c] transition-colors flex items-center gap-1"
                        >
                            <Plus className="w-3 h-3" /> Add Peptídeo
                        </button>
                    </div>

                    <div className="space-y-4 relative z-10">
                        {peptides.length === 0 ? (
                            <div className="py-8 text-center border-2 border-dashed border-[#e6e2d6] rounded-2xl">
                                <p className="text-xs text-[#a19e95] font-mono-data uppercase tracking-widest">Nenhum peptídeo registrado</p>
                            </div>
                        ) : (
                            peptides.map(item => (
                                <div key={item.id} className="p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white hover:shadow-sm transition-all border-[#e6e2d6] hover:border-purple-200">
                                    <div>
                                        <h5 className="font-bold text-[#1a1a1c] text-sm mb-1">{item.substanceName}</h5>
                                        <p className="text-[10px] font-mono-data text-[#88888b] uppercase tracking-wider flex items-center gap-2">
                                            <span className="text-purple-700 font-bold">{item.frequency}</span>
                                            <span className="w-1 h-1 rounded-full bg-[#e6e2d6]"></span>
                                            <span>{item.route}</span>
                                        </p>
                                    </div>
                                    <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-auto w-full">
                                        <div className="text-right flex-1 sm:flex-none">
                                            <span className="font-mono-data text-xl font-bold text-[#1a1a1c]">{item.dosageMg}</span>
                                            <span className="text-[10px] font-bold text-[#a19e95] ml-1 uppercase">Mcg/Mg</span>
                                        </div>
                                        <button
                                            onClick={() => handleRemoveItem(item.id)}
                                            className="text-[#a19e95] hover:text-red-500 transition-colors p-2"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Support Meds */}
                <div className="bg-white rounded-3xl p-6 md:p-8 border border-[#f2eee3] shadow-sm relative overflow-hidden group">
                    <div className="absolute -right-8 -top-8 w-40 h-40 bg-[#f4f2ea] rounded-full blur-3xl opacity-50 group-hover:bg-blue-500/5 transition-colors duration-700"></div>

                    <div className="relative z-10 flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                                <ShieldPlus className="w-5 h-5" />
                            </div>
                            <h4 className="font-heading text-xl font-bold text-[#1a1a1c]">Fármacos de Proteção</h4>
                        </div>
                        <button
                            onClick={() => {
                                setNewItem({ ...newItem, type: "support" });
                                setIsModalOpen(true);
                            }}
                            className="text-[10px] font-bold uppercase tracking-widest text-[#a19e95] hover:text-[#1a1a1c] transition-colors flex items-center gap-1"
                        >
                            <Plus className="w-3 h-3" /> Add Protetor
                        </button>
                    </div>

                    <div className="space-y-4 relative z-10">
                        {supports.length === 0 ? (
                            <div className="py-8 text-center border-2 border-dashed border-[#e6e2d6] rounded-2xl">
                                <p className="text-xs text-[#a19e95] font-mono-data uppercase tracking-widest">Nenhum protetor registrado</p>
                            </div>
                        ) : (
                            supports.map(item => (
                                <div key={item.id} className="p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white hover:shadow-sm transition-all border-[#e6e2d6] hover:border-blue-200">
                                    <div>
                                        <h5 className="font-bold text-[#1a1a1c] text-sm mb-1">{item.substanceName}</h5>
                                        <p className="text-[10px] font-mono-data text-[#88888b] uppercase tracking-wider flex items-center gap-2">
                                            <span className="text-blue-700 font-bold">{item.frequency}</span>
                                            <span className="w-1 h-1 rounded-full bg-[#e6e2d6]"></span>
                                            <span>{item.route}</span>
                                        </p>
                                    </div>
                                    <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-auto w-full">
                                        <div className="text-right flex-1 sm:flex-none">
                                            <span className="font-mono-data text-xl font-bold text-[#1a1a1c]">{item.dosageMg}</span>
                                            <span className="text-[10px] font-bold text-[#a19e95] ml-1 uppercase">Mg</span>
                                        </div>
                                        <button
                                            onClick={() => handleRemoveItem(item.id)}
                                            className="text-[#a19e95] hover:text-red-500 transition-colors p-2"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-200 md:p-4">
                    <div className="bg-white rounded-t-3xl md:rounded-[2rem] w-full max-w-lg p-6 md:p-8 shadow-2xl relative animate-in slide-in-from-bottom-[100%] md:zoom-in-95 duration-300 border border-[#e6e2d6] max-h-[90dvh] overflow-y-auto custom-scrollbar">
                        {/* Mobile handle indicator */}
                        <div className="w-12 h-1.5 bg-[#e6e2d6] rounded-full mx-auto md:hidden mb-6 shrink-0" />

                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="absolute top-6 right-6 p-2 text-[#a19e95] hover:text-[#1a1a1c] hover:bg-[#f4f2ea] transition-colors rounded-full hidden md:block"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="flex items-center gap-3 mb-6 pr-8 md:pr-0">
                            <div className={`p-2 rounded-lg py-2 px-2 shrink-0
                                ${newItem.type === 'ergogenic' ? 'bg-[#f4f2ea] text-[#1a1a1c]' :
                                    newItem.type === 'peptide' ? 'bg-purple-50 text-purple-600' :
                                        'bg-blue-50 text-blue-600'}
                            `}>
                                {newItem.type === 'ergogenic' ? <Syringe className="w-5 h-5" /> :
                                    newItem.type === 'peptide' ? <Dna className="w-5 h-5" /> :
                                        <ShieldPlus className="w-5 h-5" />}
                            </div>
                            <h4 className="font-heading text-xl md:text-2xl font-bold text-[#1a1a1c] truncate">
                                {newItem.type === 'ergogenic' ? 'Androgênico / Base' :
                                    newItem.type === 'peptide' ? 'Adicionar Peptídeo' :
                                        'Adicionar Protetor'}
                            </h4>
                        </div>

                        <div className="space-y-4 md:space-y-5">
                            <div>
                                <label className="block text-[10px] font-bold tracking-widest uppercase text-[#88888b] mb-1.5 ml-1">Substância</label>
                                <input
                                    type="text"
                                    placeholder={newItem.type === 'ergogenic' ? "Ex: Testosterona" : newItem.type === 'peptide' ? "Ex: GH, HCG" : "Ex: Anastrozol"}
                                    value={newItem.substanceName}
                                    onChange={(e) => setNewItem({ ...newItem, substanceName: e.target.value })}
                                    className="w-full bg-[#f8f7f4] border border-[#e6e2d6] rounded-xl px-4 py-3 md:py-3.5 text-[#1a1a1c] focus:border-[#1a1a1c] focus:bg-white outline-none text-sm transition-all placeholder-[#c0beb5]"
                                />
                            </div>

                            {newItem.type === 'ergogenic' && (
                                <div>
                                    <label className="block text-[10px] font-bold tracking-widest uppercase text-[#88888b] mb-1.5 ml-1">Éster / Complemento (Opcional)</label>
                                    <input
                                        type="text"
                                        placeholder="Ex: Enantato, Durateston..."
                                        value={newItem.ester}
                                        onChange={(e) => setNewItem({ ...newItem, ester: e.target.value })}
                                        className="w-full bg-[#f8f7f4] border border-[#e6e2d6] rounded-xl px-4 py-3 md:py-3.5 text-[#1a1a1c] focus:border-[#1a1a1c] focus:bg-white outline-none text-sm transition-all placeholder-[#c0beb5]"
                                    />
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-3 md:gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold tracking-widest uppercase text-[#88888b] mb-1.5 ml-1">Dosagem (Mg)</label>
                                    <input
                                        type="number"
                                        placeholder="Ex: 250"
                                        value={newItem.dosageMg || ""}
                                        onChange={(e) => setNewItem({ ...newItem, dosageMg: e.target.value ? Number(e.target.value) : 0 })}
                                        className="w-full bg-[#f8f7f4] border border-[#e6e2d6] rounded-xl px-4 py-3 md:py-3.5 text-[#1a1a1c] focus:border-[#1a1a1c] focus:bg-white outline-none text-sm transition-all placeholder-[#c0beb5] font-mono-data"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold tracking-widest uppercase text-[#88888b] mb-1.5 ml-1">Frequência</label>
                                    <select
                                        value={newItem.frequency}
                                        onChange={(e) => setNewItem({ ...newItem, frequency: e.target.value })}
                                        className="w-full bg-[#f8f7f4] border border-[#e6e2d6] rounded-xl px-4 py-3 md:py-3.5 text-[#1a1a1c] focus:border-[#1a1a1c] focus:bg-white outline-none text-[12px] md:text-sm transition-all appearance-none cursor-pointer"
                                    >
                                        {PRESET_FREQUENCIES.map(f => (
                                            <option key={f} value={f}>{f}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold tracking-widest uppercase text-[#88888b] mb-1.5 ml-1">Via de Administração</label>
                                <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
                                    {['injetavel', 'oral', 'transdermico'].map((routeValue) => (
                                        <button
                                            key={routeValue}
                                            onClick={() => setNewItem({ ...newItem, route: routeValue as any })}
                                            className={`flex-1 py-3 md:py-3 rounded-xl text-[10px] md:text-xs font-bold uppercase tracking-wider transition-all border ${newItem.route === routeValue
                                                ? 'bg-[#1a1a1c] text-white border-[#1a1a1c]'
                                                : 'bg-white text-[#a19e95] border-[#e6e2d6] hover:border-[#1a1a1c] hover:text-[#1a1a1c]'
                                                }`}
                                        >
                                            {routeValue === 'injetavel' ? 'Injetável' : routeValue === 'oral' ? 'Oral' : 'Transdérmico'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-4 md:pt-6">
                                <button
                                    onClick={handleAddItem}
                                    disabled={!newItem.substanceName || !newItem.frequency}
                                    className="w-full bg-[#1a1a1c] text-white rounded-xl py-4 flex items-center justify-center gap-2 text-sm font-bold uppercase tracking-widest hover:bg-[#d84a22] hover:shadow-lg hover:shadow-[#d84a22]/20 transition-all disabled:opacity-50 disabled:hover:bg-[#1a1a1c] disabled:hover:shadow-none"
                                >
                                    <CheckCircle2 className="w-5 h-5" />
                                    Registrar Composto
                                </button>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="w-full mt-2 bg-transparent text-[#a19e95] rounded-xl py-3 flex items-center justify-center text-xs font-bold uppercase tracking-widest md:hidden"
                                >
                                    Cancelar e Fechar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
