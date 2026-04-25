"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Plus, X, Loader2, Activity, FileText, UploadCloud, DownloadCloud, Scale, TrendingDown, TrendingUp, Minus, Trash2, Pencil, Code, Copy, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { db, storage } from "@/lib/firebase";
import { collection, addDoc, getDocs, query, orderBy, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

interface BioimpedanceEntry {
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

export default function Bioimpedancia() {
    const { user } = useAuth();
    const [records, setRecords] = useState<BioimpedanceEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Modal de exclusão
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [recordToDelete, setRecordToDelete] = useState<string | null>(null);

    // Comparação
    const [isComparing, setIsComparing] = useState(false);
    const [compareId1, setCompareId1] = useState<string>("");
    const [compareId2, setCompareId2] = useState<string>("");

    // Form states
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    const initialComposition = {
        bodyFat: "", skeletalMuscle: "", water: "", bmr: "",
        visceralFat: "", whr: "", fatFreeMass: "", protein: "", boneMass: ""
    };
    const [composition, setComposition] = useState(initialComposition);

    const initialPostural = {
        forwardHead: "", hunchback: "", apt: "", shoulderOffset: "",
        scoliosisRisk: "", shoulderRisk: "", kneeRisk: ""
    };
    const [postural, setPostural] = useState(initialPostural);

    const initialSegmental = {
        rightArmMuscle: "", leftArmMuscle: "", rightLegMuscle: "",
        leftLegMuscle: "", trunkMuscle: ""
    };
    const [segmental, setSegmental] = useState(initialSegmental);

    const [pdfFile, setPdfFile] = useState<File | null>(null);

    const [jsonModalOpen, setJsonModalOpen] = useState(false);
    const [jsonInput, setJsonInput] = useState("");
    const [copiedPrompt, setCopiedPrompt] = useState(false);

    const handleCopyPrompt = () => {
        const promptText = `Aja como um assistente de extração de dados médicos. Leia o laudo de bioimpedância e posturologia em anexo e extraia os dados estritamente no formato JSON abaixo. Retorne APENAS o JSON válido.
IMPORTANTE 1: NÃO INCLUA unidades de medida (kg, %, kcal, °, cm) nos valores numéricos. Mantenha apenas os NÚMEROS (use ponto para decimais).
IMPORTANTE 2: Para campos de risco em texto, TRADUZA para PORTUGUÊS (ex: "Baixo", "Médio", "Alto").

Formato esperado:
{
  "composition": {
    "bodyFat": "",
    "skeletalMuscle": "",
    "water": "",
    "bmr": "",
    "visceralFat": "",
    "whr": "",
    "fatFreeMass": "",
    "protein": "",
    "boneMass": ""
  },
  "postural": {
    "forwardHead": "",
    "hunchback": "",
    "apt": "",
    "shoulderOffset": "",
    "scoliosisRisk": "", // EXCLUSIVO TEXTO EM PORTUGUÊS (Baixo, Médio, Alto)
    "shoulderRisk": "", // EXCLUSIVO TEXTO EM PORTUGUÊS (Baixo, Médio, Alto)
    "kneeRisk": "" // Hiperextensão do Joelho (Apenas número, sem o grau)
  },
  "segmental": {
    "rightArmMuscle": "",
    "leftArmMuscle": "",
    "rightLegMuscle": "",
    "leftLegMuscle": "",
    "trunkMuscle": ""
  }
}`;
        navigator.clipboard.writeText(promptText);
        setCopiedPrompt(true);
        setTimeout(() => setCopiedPrompt(false), 2000);
    };

    const sanitizeValue = (key: string, val: any) => {
        if (val === null || val === undefined) return "";
        const strVal = String(val).trim();
        // Manter texto íntegro e forçar tradução nos campos de risco
        if (['scoliosisRisk', 'shoulderRisk'].includes(key)) {
            const lower = strVal.toLowerCase();
            if (lower.includes('low')) return 'Baixo';
            if (lower.includes('medium') || lower.includes('moderate')) return 'Médio';
            if (lower.includes('high')) return 'Alto';
            if (lower.includes('normal')) return 'Normal';
            return strVal;
        }
        // Para os campos numéricos, retira tudo que não for dígito, ponto, vírgula ou sinal negativo e troca vírgula por ponto
        return strVal.replace(/[^0-9.,-]/g, '').replace(',', '.');
    };

    const sanitizeObject = (obj: any) => {
        const result: any = {};
        for (const [k, v] of Object.entries(obj)) {
            result[k] = sanitizeValue(k, v);
        }
        return result;
    };

    const handleJsonSubmit = () => {
        try {
            const cleanJson = jsonInput.replace(/```json/gi, '').replace(/```/g, '').trim();
            const data = JSON.parse(cleanJson);
            
            if (data.composition) setComposition(prev => ({ ...prev, ...sanitizeObject(data.composition) }));
            if (data.postural) setPostural(prev => ({ ...prev, ...sanitizeObject(data.postural) }));
            if (data.segmental) setSegmental(prev => ({ ...prev, ...sanitizeObject(data.segmental) }));
            
            setJsonModalOpen(false);
            setJsonInput("");
        } catch (error) {
            alert("JSON inválido. Certifique-se de colar apenas o formato JSON.");
        }
    };

    useEffect(() => {
        if (!user) return;
        fetchRecords();
    }, [user]);

    const fetchRecords = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const q = query(
                collection(db, "users", user.uid, "bioimpedancias"),
                orderBy("timestamp", "desc")
            );
            const snap = await getDocs(q);
            const data: BioimpedanceEntry[] = [];
            snap.forEach((doc) => {
                data.push({ id: doc.id, ...doc.data() } as BioimpedanceEntry);
            });
            setRecords(data);
        } catch (error) {
            console.error("Erro ao buscar registros de bioimpedância:", error);
        } finally {
            setLoading(false);
        }
    };

    const toggleCompare = () => {
        if (!isComparing) {
            if (records.length >= 2) {
                setCompareId1(records[1].id);
                setCompareId2(records[0].id);
            } else if (records.length === 1) {
                setCompareId1(records[0].id);
                setCompareId2(records[0].id);
            }
            setIsComparing(true);
            setIsAdding(false);
        } else {
            setIsComparing(false);
        }
    };

    const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setPdfFile(e.target.files[0]);
        }
    };

    const removePdf = () => {
        setPdfFile(null);
    };

    const handleEdit = (record: BioimpedanceEntry) => {
        setEditingId(record.id);
        setDate(record.date);

        setComposition({
            bodyFat: record.composition?.bodyFat || "",
            skeletalMuscle: record.composition?.skeletalMuscle || "",
            water: record.composition?.water || "",
            bmr: record.composition?.bmr || "",
            visceralFat: record.composition?.visceralFat || "",
            whr: record.composition?.whr || "",
            fatFreeMass: record.composition?.fatFreeMass || "",
            protein: record.composition?.protein || "",
            boneMass: record.composition?.boneMass || ""
        });

        setPostural({
            forwardHead: record.postural?.forwardHead || "",
            hunchback: record.postural?.hunchback || "",
            apt: record.postural?.apt || "",
            shoulderOffset: record.postural?.shoulderOffset || "",
            scoliosisRisk: record.postural?.scoliosisRisk || "",
            shoulderRisk: record.postural?.shoulderRisk || "",
            kneeRisk: record.postural?.kneeRisk || ""
        });

        setSegmental({
            rightArmMuscle: record.segmental?.rightArmMuscle || "",
            leftArmMuscle: record.segmental?.leftArmMuscle || "",
            rightLegMuscle: record.segmental?.rightLegMuscle || "",
            leftLegMuscle: record.segmental?.leftLegMuscle || "",
            trunkMuscle: record.segmental?.trunkMuscle || ""
        });

        setIsAdding(true);
        setIsComparing(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const confirmDelete = (id: string) => {
        setRecordToDelete(id);
        setDeleteModalOpen(true);
    };

    const handleDelete = async () => {
        if (!user || !recordToDelete) return;

        try {
            await deleteDoc(doc(db, "users", user.uid, "bioimpedancias", recordToDelete));
            setDeleteModalOpen(false);
            setRecordToDelete(null);
            fetchRecords();
        } catch (error) {
            console.error("Erro ao deletar registro:", error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setSubmitting(true);

        try {
            let pdfUrlStr = "";
            let pdfNameStr = "";

            if (pdfFile) {
                const fileRef = ref(storage, `users/${user.uid}/bioimpedancias/${Date.now()}_${pdfFile.name}`);
                await uploadBytes(fileRef, pdfFile);
                pdfUrlStr = await getDownloadURL(fileRef);
                pdfNameStr = pdfFile.name;
            }

            const newRecord = {
                date,
                timestamp: new Date(date).getTime(),
                ...(pdfUrlStr && { pdfUrl: pdfUrlStr, pdfName: pdfNameStr }),
                composition,
                postural,
                segmental
            };

            if (editingId) {
                await updateDoc(doc(db, "users", user.uid, "bioimpedancias", editingId), newRecord);
            } else {
                await addDoc(collection(db, "users", user.uid, "bioimpedancias"), newRecord);
            }

            // Reset form
            setEditingId(null);
            setDate(new Date().toISOString().split('T')[0]);
            setComposition(initialComposition);
            setPostural(initialPostural);
            setSegmental(initialSegmental);
            setPdfFile(null);

            setIsAdding(false);
            fetchRecords();

        } catch (error) {
            console.error("Erro ao salvar registro:", error);
        } finally {
            setSubmitting(false);
        }
    };

    const compositionFields = [
        { key: 'bodyFat', label: 'Gordura Corporal (%)', type: 'number' },
        { key: 'skeletalMuscle', label: 'Muscular Esquelética', type: 'number', unit: 'kg' },
        { key: 'water', label: 'Água Corporal', type: 'number', unit: '%' },
        { key: 'bmr', label: 'Metabolismo Basal', type: 'number', unit: 'kcal' },
        { key: 'visceralFat', label: 'Gordura Visceral', type: 'number', unit: 'nível' },
        { key: 'whr', label: 'Cintura-Quadril', type: 'number', unit: 'índice' },
        { key: 'fatFreeMass', label: 'Livre de Gordura', type: 'number', unit: 'kg' },
        { key: 'protein', label: 'Proteína Corporal', type: 'number', unit: '%' },
        { key: 'boneMass', label: 'Massa Óssea', type: 'number', unit: 'kg' },
    ];

    const posturalFields = [
        { key: 'forwardHead', label: 'Proj. da Cabeça (°)', type: 'number' },
        { key: 'hunchback', label: 'Cifose (°)', type: 'number' },
        { key: 'apt', label: 'Inclin. Pélvica Ant. (°)', type: 'number' },
        { key: 'shoulderOffset', label: 'Desvio Centro Ombro (cm)', type: 'number' },
        { key: 'scoliosisRisk', label: 'Risco de Escoliose', type: 'text' },
        { key: 'shoulderRisk', label: 'Simetria dos Ombros', type: 'text' },
        { key: 'kneeRisk', label: 'Hiperextensão Joelho (°)', type: 'number' },
    ];

    const segmentalFields = [
        { key: 'rightArmMuscle', label: 'Braço Dir. (kg)', type: 'number' },
        { key: 'leftArmMuscle', label: 'Braço Esq. (kg)', type: 'number' },
        { key: 'rightLegMuscle', label: 'Perna Dir. (kg)', type: 'number' },
        { key: 'leftLegMuscle', label: 'Perna Esq. (kg)', type: 'number' },
        { key: 'trunkMuscle', label: 'Tronco (kg)', type: 'number' },
    ];

    const renderFormSection = (title: string, fields: any[], state: any, setState: any) => (
        <section>
            <div className="mb-6 w-full flex items-center gap-6">
                <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-[#a19e95] shrink-0">{title}</span>
                <div className="h-[1px] flex-1 bg-gradient-to-r from-[#e6e2d6] to-transparent"></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {fields.map(f => (
                    <div key={f.key} className="flex flex-col">
                        <label className="text-xs font-mono-data text-[#7a7872] mb-1">
                            {f.label} {f.unit ? <span className="text-[#a19e95] text-[10px]">({f.unit})</span> : ""}
                        </label>
                        <input
                            type={f.type || 'text'}
                            step={f.type === 'number' ? '0.1' : undefined}
                            value={state[f.key as keyof typeof state]}
                            onChange={(e) => setState({ ...state, [f.key]: e.target.value })}
                            placeholder={f.type === 'number' ? '0.0' : '-'}
                            className="w-full bg-[#f4f2ea] border border-transparent focus:border-[#d84a22] rounded-lg px-3 py-2 text-[#1a1a1c] outline-none text-sm placeholder-[#a19e95] transition-colors"
                        />
                    </div>
                ))}
            </div>
        </section>
    );

    if (loading) {
        return (
            <div className="max-w-[1400px] mx-auto px-12 pt-12 flex justify-center items-center h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-[#1a1a1c]" />
            </div>
        );
    }

    return (
        <div className="max-w-[1400px] mx-auto px-4 md:px-12 pb-24 pt-8 md:pt-12">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-12 md:mb-16 gap-6">
                <Header title="Bioimpedância" subtitle="Inbody & Posturologia" />

                <div className="flex items-center gap-3 w-full sm:w-auto mb-0 sm:mb-16 flex-col sm:flex-row">
                    {!isAdding && !isComparing && records.length >= 2 && (
                        <button
                            onClick={toggleCompare}
                            className="flex items-center gap-2 border border-[#e6e2d6] bg-white text-[#1a1a1c] px-6 py-3 rounded-full hover:bg-[#f4f2ea] transition-colors shadow-sm w-full sm:w-auto justify-center"
                        >
                            <Scale className="w-4 h-4 text-[#d84a22]" />
                            <span className="text-sm font-bold uppercase tracking-wider text-[#d84a22]">Comparar</span>
                        </button>
                    )}

                    {!isAdding && isComparing && (
                        <button
                            onClick={toggleCompare}
                            className="flex items-center gap-2 border border-[#e6e2d6] bg-white text-[#1a1a1c] px-6 py-3 rounded-full hover:bg-[#f4f2ea] transition-colors shadow-sm w-full sm:w-auto justify-center"
                        >
                            <X className="w-4 h-4" />
                            <span className="text-sm font-bold uppercase tracking-wider">Sair da Comparação</span>
                        </button>
                    )}

                    {!isAdding && !isComparing && (
                        <button
                            onClick={() => setIsAdding(true)}
                            className="flex items-center gap-2 bg-[#1a1a1c] text-white px-6 py-3 rounded-full hover:bg-black transition-colors shadow-[0_4px_20px_rgba(0,0,0,0.1)] w-full sm:w-auto justify-center"
                        >
                            <Plus className="w-4 h-4" />
                            <span className="text-sm font-bold uppercase tracking-wider">Novo Registro</span>
                        </button>
                    )}

                    {isAdding && (
                        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                            <button
                                onClick={() => setJsonModalOpen(true)}
                                className="flex items-center gap-2 border border-[#d84a22] text-[#d84a22] px-6 py-3 rounded-full hover:bg-[#d84a22] hover:text-white transition-colors w-full sm:w-auto justify-center shadow-sm"
                            >
                                <Code className="w-4 h-4" />
                                <span className="text-sm font-bold uppercase tracking-wider">Inserir JSON</span>
                            </button>
                            <button
                                onClick={() => {
                                    setIsAdding(false);
                                    setEditingId(null);
                                    setDate(new Date().toISOString().split('T')[0]);
                                    setComposition(initialComposition);
                                    setPostural(initialPostural);
                                    setSegmental(initialSegmental);
                                }}
                                className="flex items-center gap-2 border border-[#e6e2d6] text-[#1a1a1c] px-6 py-3 rounded-full hover:bg-[#f4f2ea] transition-colors w-full sm:w-auto justify-center"
                            >
                                <X className="w-4 h-4" />
                                <span className="text-sm font-bold uppercase tracking-wider">Cancelar</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {isComparing && (
                <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 mb-16">
                    <div className="bg-white rounded-3xl p-6 md:p-10 border border-[#d84a22]/20 shadow-[0_8px_30px_rgba(216,74,34,0.05)] relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#d84a22] to-transparent"></div>

                        <div className="flex flex-col md:flex-row gap-8 justify-between items-center mb-10">
                            <div className="w-full md:w-[45%]">
                                <label className="block text-[10px] font-mono-data tracking-widest text-[#a19e95] uppercase mb-2">Registro Inicial (A)</label>
                                <select
                                    value={compareId1}
                                    onChange={(e) => setCompareId1(e.target.value)}
                                    className="w-full bg-[#f4f2ea] border-none rounded-xl px-4 py-3 text-[#1a1a1c] outline-none text-sm font-bold cursor-pointer"
                                >
                                    {records.map(r => (
                                        <option key={r.id} value={r.id}>
                                            {new Date(r.date).toLocaleDateString("pt-BR")} {r.composition?.bodyFat ? `- ${r.composition.bodyFat}% BF` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="w-12 h-12 rounded-full bg-[#f4f2ea] flex items-center justify-center shrink-0 text-[#a19e95] shadow-sm">
                                <Scale className="w-5 h-5 text-[#d84a22]" />
                            </div>

                            <div className="w-full md:w-[45%]">
                                <label className="block text-[10px] font-mono-data tracking-widest text-[#a19e95] uppercase mb-2">Registro Final (B)</label>
                                <select
                                    value={compareId2}
                                    onChange={(e) => setCompareId2(e.target.value)}
                                    className="w-full bg-[#f4f2ea] border-none rounded-xl px-4 py-3 text-[#1a1a1c] outline-none text-sm font-bold cursor-pointer"
                                >
                                    {records.map(r => (
                                        <option key={r.id} value={r.id}>
                                            {new Date(r.date).toLocaleDateString("pt-BR")} {r.composition?.bodyFat ? `- ${r.composition.bodyFat}% BF` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Comparação dos Campos */}
                        {(() => {
                            const rec1 = records.find(r => r.id === compareId1);
                            const rec2 = records.find(r => r.id === compareId2);

                            if (!rec1 || !rec2) return null;

                            const isPositiveIncrease: Record<string, boolean> = {
                                bodyFat: false, skeletalMuscle: true, water: true, bmr: true,
                                visceralFat: false, whr: false, fatFreeMass: true, protein: true, boneMass: true,
                                forwardHead: false, hunchback: false, apt: false, shoulderOffset: false, kneeRisk: false,
                                rightArmMuscle: true, leftArmMuscle: true, rightLegMuscle: true, leftLegMuscle: true, trunkMuscle: true,
                            };

                            const renderDiffRow = (title: string, fields: any[], section: 'composition' | 'postural' | 'segmental') => {
                                const activeFields = fields.filter(f => rec1[section]?.[f.key as keyof any] || rec2[section]?.[f.key as keyof any]);

                                if (activeFields.length === 0) return null;

                                return (
                                    <div className="mb-10 last:mb-0">
                                        <h4 className="text-[10px] uppercase font-bold tracking-widest text-[#1a1a1c] border-b border-[#e6e2d6] pb-2 mb-4">{title}</h4>
                                        <div className="grid grid-cols-1 gap-3">
                                            {activeFields.map(f => {
                                                const str1 = rec1[section]?.[f.key as keyof any] as string;
                                                const str2 = rec2[section]?.[f.key as keyof any] as string;

                                                let diffElement = <div className="text-[#a19e95]"><Minus className="w-4 h-4" /></div>;

                                                if (f.type === 'number') {
                                                    const val1 = parseFloat(str1);
                                                    const val2 = parseFloat(str2);

                                                    if (!isNaN(val1) && !isNaN(val2)) {
                                                        const diff = val2 - val1;
                                                        if (diff !== 0) {
                                                            const isGood = isPositiveIncrease[f.key] ? diff > 0 : diff < 0;
                                                            const color = isGood ? 'text-emerald-600' : 'text-rose-600';
                                                            const bgColor = isGood ? 'bg-emerald-50' : 'bg-rose-50';
                                                            const Icon = diff > 0 ? TrendingUp : TrendingDown;

                                                            diffElement = (
                                                                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${bgColor} ${color}`}>
                                                                    <Icon className="w-3.5 h-3.5" />
                                                                    <span className="font-mono-data text-xs font-bold whitespace-nowrap">{diff > 0 ? '+' : ''}{diff.toFixed(1)}</span>
                                                                </div>
                                                            );
                                                        } else {
                                                            diffElement = <span className="text-[#a19e95] font-mono-data text-[10px] uppercase font-bold bg-[#f4f2ea] px-3 py-1 rounded-full">Igual</span>;
                                                        }
                                                    }
                                                } else {
                                                    // Text comparison
                                                    if (str1 && str2 && str1 !== str2) {
                                                        diffElement = <span className="text-[#d84a22] font-mono-data text-[10px] uppercase font-bold bg-[#d84a22]/10 px-3 py-1 rounded-full">Mudou</span>;
                                                    } else if (str1 || str2) {
                                                        diffElement = <span className="text-[#a19e95] font-mono-data text-[10px] uppercase font-bold bg-[#f4f2ea] px-3 py-1 rounded-full">Igual</span>;
                                                    }
                                                }

                                                return (
                                                    <div key={f.key} className="flex flex-col md:flex-row md:items-center justify-between bg-[#f4f2ea]/50 hover:bg-[#f4f2ea] transition-colors px-5 py-4 rounded-2xl gap-4">
                                                        <div className="w-full md:w-1/3">
                                                            <span className="text-xs text-[#7a7872]">{f.label}</span>
                                                        </div>

                                                        <div className="flex items-center justify-between md:justify-end w-full md:w-2/3 gap-4 md:gap-8">
                                                            <div className="flex flex-col items-end min-w-[60px]">
                                                                <span className="text-[10px] text-[#a19e95] font-mono-data mb-1 uppercase">(A)</span>
                                                                <span className="font-mono-data font-bold text-sm text-[#1a1a1c] whitespace-nowrap">{str1 || '-'} <span className="text-[10px] text-[#7a7872] font-normal">{f.unit || ''}</span></span>
                                                            </div>

                                                            <div className="bg-[#e6e2d6] w-px h-6 mx-2 hidden md:block"></div>

                                                            <div className="flex flex-col items-end min-w-[60px]">
                                                                <span className="text-[10px] text-[#a19e95] font-mono-data mb-1 uppercase">(B)</span>
                                                                <span className="font-mono-data font-bold text-sm text-[#1a1a1c] whitespace-nowrap">{str2 || '-'} <span className="text-[10px] text-[#7a7872] font-normal">{f.unit || ''}</span></span>
                                                            </div>

                                                            <div className="w-20 md:w-24 flex justify-end shrink-0">
                                                                {diffElement}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            };

                            return (
                                <div className="mt-8 border-t border-[#f2eee3] pt-8">
                                    {renderDiffRow("Composição Corporal", compositionFields, 'composition')}
                                    {renderDiffRow("Saúde Postural", posturalFields, 'postural')}
                                    {renderDiffRow("Análise Segmentar", segmentalFields, 'segmental')}
                                </div>
                            );
                        })()}
                    </div>
                </div>
            )}

            {isAdding && (
                <div className="bg-white rounded-3xl p-6 md:p-10 border border-[#f2eee3] shadow-sm mb-12 md:mb-16 animate-in slide-in-from-top-4 fade-in duration-500">
                    <form onSubmit={handleSubmit}>
                        <h3 className="font-heading text-xl md:text-2xl font-bold mb-8">
                            {editingId ? "Editar Registro de Bioimpedância" : "Novo Registro de Bioimpedância"}
                        </h3>

                        <div className="space-y-12">
                            {/* Dados Principais e Arquivo */}
                            <section>
                                <div className="mb-4 w-full flex items-center gap-6">
                                    <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-[#a19e95] shrink-0">Dados Iniciais e Arquivo</span>
                                    <div className="h-[1px] flex-1 bg-gradient-to-r from-[#e6e2d6] to-transparent"></div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div>
                                        <label className="block text-xs font-mono-data text-[#1a1a1c] mb-1">Data do Exame</label>
                                        <input
                                            type="date"
                                            required
                                            value={date}
                                            onChange={(e) => setDate(e.target.value)}
                                            className="w-full bg-[#f4f2ea] border-none rounded-xl px-4 py-3 text-[#1a1a1c] outline-none text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-mono-data text-[#1a1a1c] mb-1">Anexar PDF (Laudo Completo)</label>
                                        <div className="relative">
                                            {pdfFile ? (
                                                <div className="flex items-center justify-between w-full bg-[#f4f2ea] rounded-xl px-4 py-3 text-sm border border-[#e6e2d6]">
                                                    <div className="flex items-center gap-2 overflow-hidden">
                                                        <FileText className="w-4 h-4 text-[#d84a22] shrink-0" />
                                                        <span className="truncate text-[#1a1a1c] font-medium">{pdfFile.name}</span>
                                                    </div>
                                                    <button type="button" onClick={removePdf} className="p-1 hover:bg-[#e6e2d6] rounded-full transition-colors ml-2 shrink-0">
                                                        <X className="w-4 h-4 text-[#7a7872]" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <label className="flex items-center gap-3 w-full bg-[#f4f2ea] rounded-xl px-4 py-3 text-sm cursor-pointer hover:bg-[#e6e2d6]/50 transition-colors border border-dashed border-[#a19e95]">
                                                    <UploadCloud className="w-4 h-4 text-[#a19e95]" />
                                                    <span className="text-[#7a7872]">Selecionar arquivo .pdf</span>
                                                    <input
                                                        type="file"
                                                        accept=".pdf"
                                                        className="hidden"
                                                        onChange={handlePdfChange}
                                                    />
                                                </label>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Composição Corporal */}
                            {renderFormSection("Composição Corporal e Metabolismo", compositionFields, composition, setComposition)}

                            {/* Saúde Postural */}
                            {renderFormSection("Saúde Postural", posturalFields, postural, setPostural)}

                            {/* Análise Segmentar */}
                            {renderFormSection("Análise Segmentar (Simetria)", segmentalFields, segmental, setSegmental)}

                        </div>

                        <div className="mt-12 flex justify-end pt-8 border-t border-[#f2eee3]">
                            <button
                                type="submit"
                                disabled={submitting}
                                className="flex items-center gap-2 bg-[#1a1a1c] text-white px-8 py-4 rounded-full font-bold uppercase tracking-wider text-sm hover:bg-black transition-colors disabled:opacity-70 shadow-[0_4px_15px_rgba(0,0,0,0.1)]"
                            >
                                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Activity className="w-5 h-5" />}
                                Salvar Registro
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Linha do Tempo */}
            {!isComparing && (
                <div className="space-y-12">
                    {records.length === 0 && !isAdding && (
                        <div className="bg-white rounded-3xl p-16 flex flex-col items-center justify-center border border-[#f2eee3] shadow-sm mb-16 h-[300px]">
                            <Activity className="w-12 h-12 text-[#e6e2d6] mb-4" />
                            <p className="text-sm font-mono-data tracking-widest uppercase text-[#a19e95]">
                                Nenhum registro de bioimpedância encontrado
                            </p>
                        </div>
                    )}

                    {records.map((record) => {
                        const hasComposition = Object.values(record.composition || {}).some(v => v !== "");
                        const hasPostural = Object.values(record.postural || {}).some(v => v !== "");
                        const hasSegmental = Object.values(record.segmental || {}).some(v => v !== "");

                        return (
                            <div key={record.id} className="bg-white rounded-3xl p-6 md:p-8 border border-[#f2eee3] shadow-sm relative overflow-hidden flex flex-col gap-8 md:gap-10">

                                <div className="flex flex-col xl:flex-row gap-8 md:gap-10">

                                    <div className="w-full xl:w-[320px] shrink-0 space-y-6 flex-shrink-0">
                                        <div>
                                            <div className="flex justify-between items-start mb-4">
                                                <span className="text-[10px] font-mono-data tracking-widest uppercase text-[#1a1a1c] font-bold bg-[#f4f2ea] border border-[#e6e2d6] px-3 py-1.5 rounded-full inline-block shadow-sm">
                                                    {new Date(record.date).toLocaleDateString("pt-BR", { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </span>
                                                <div className="flex gap-2">
                                                    <button onClick={() => handleEdit(record)} title="Editar" className="p-2 text-[#7a7872] hover:text-[#1a1a1c] hover:bg-[#f4f2ea] rounded-full transition-colors">
                                                        <Pencil className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => confirmDelete(record.id)} title="Excluir" className="p-2 text-[#7a7872] hover:text-red-500 hover:bg-red-50 rounded-full transition-colors">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-1 mb-6">
                                                <div className="flex items-end gap-2">
                                                    <h3 className="font-heading text-4xl font-bold text-[#1a1a1c]">
                                                        {record.composition?.bodyFat ? <>{record.composition.bodyFat}<span className="text-xl text-[#7a7872] ml-1">%</span></> : "--"}
                                                    </h3>
                                                </div>
                                                <span className="text-[10px] font-mono-data tracking-widest text-[#a19e95] uppercase">Gordura Corporal</span>
                                            </div>

                                            {record.pdfUrl && (
                                                <div className="bg-[#f4f2ea] border border-[#e6e2d6] px-4 py-4 rounded-xl flex flex-col gap-3">
                                                    <div className="flex items-center gap-2 shrink-0 max-w-full">
                                                        <FileText className="w-4 h-4 text-[#d84a22] shrink-0" />
                                                        <span className="text-[#1a1a1c] font-medium text-xs truncate" title={record.pdfName}>{record.pdfName || "Laudo.pdf"}</span>
                                                    </div>
                                                    <a
                                                        href={record.pdfUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center justify-center gap-2 bg-[#1a1a1c] text-white hover:bg-black transition-colors px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider w-full shadow-sm"
                                                    >
                                                        <DownloadCloud className="w-4 h-4" />
                                                        Baixar Laudo
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Dados da Bio em Grade */}
                                    <div className="w-full flex-[1] min-w-0 grid grid-cols-1 lg:grid-cols-3 gap-6">

                                        {/* Composição */}
                                        {hasComposition && (
                                            <div className="bg-[#f4f2ea] p-5 rounded-2xl h-fit">
                                                <h4 className="text-[10px] uppercase font-bold tracking-widest text-[#1a1a1c] border-b border-[#e6e2d6] pb-2 mb-3">Composição Corporal</h4>
                                                <div className="space-y-2">
                                                    {compositionFields.map(f => {
                                                        const val = record.composition?.[f.key as keyof typeof record.composition];
                                                        if (!val) return null;
                                                        return (
                                                            <div key={f.key} className="flex justify-between items-center bg-white/50 px-3 py-2 rounded-lg">
                                                                <span className="text-[11px] text-[#7a7872] leading-tight truncate mr-2">{f.label}</span>
                                                                <span className="font-mono-data font-bold text-xs whitespace-nowrap text-[#1a1a1c]">{val} {f.unit ? f.unit : ''}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* Saúde Postural */}
                                        {hasPostural && (
                                            <div className="bg-[#f4f2ea] p-5 rounded-2xl h-fit">
                                                <h4 className="text-[10px] uppercase font-bold tracking-widest text-[#1a1a1c] border-b border-[#e6e2d6] pb-2 mb-3">Saúde Postural</h4>
                                                <div className="space-y-2">
                                                    {posturalFields.map(f => {
                                                        const val = record.postural?.[f.key as keyof typeof record.postural];
                                                        if (!val) return null;
                                                        return (
                                                            <div key={f.key} className="flex justify-between items-center bg-white/50 px-3 py-2 rounded-lg">
                                                                <span className="text-[11px] text-[#7a7872] leading-tight truncate mr-2">{f.label}</span>
                                                                <span className="font-mono-data font-bold text-xs whitespace-nowrap text-[#1a1a1c]">{val}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* Segmentar */}
                                        {hasSegmental && (
                                            <div className="bg-[#f4f2ea] p-5 rounded-2xl h-fit">
                                                <h4 className="text-[10px] uppercase font-bold tracking-widest text-[#1a1a1c] border-b border-[#e6e2d6] pb-2 mb-3">Análise Segmentar</h4>
                                                <div className="space-y-2">
                                                    {segmentalFields.map(f => {
                                                        const val = record.segmental?.[f.key as keyof typeof record.segmental];
                                                        if (!val) return null;
                                                        return (
                                                            <div key={f.key} className="flex justify-between items-center bg-white/50 px-3 py-2 rounded-lg">
                                                                <span className="text-[11px] text-[#7a7872] leading-tight truncate mr-2">{f.label}</span>
                                                                <span className="font-mono-data font-bold text-xs whitespace-nowrap text-[#1a1a1c]">{val} kg</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Modal de Confirmação de Exclusão */}
            {deleteModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
                        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-6">
                            <Trash2 className="w-6 h-6 text-red-500" />
                        </div>
                        <h3 className="font-heading text-xl font-bold text-[#1a1a1c] mb-2">Excluir Registro?</h3>
                        <p className="text-sm text-[#7a7872] mb-8">Esta ação não pode ser desfeita. Todos os dados desta bioimpedância serão permanentemente removidos.</p>

                        <div className="flex gap-3 w-full">
                            <button
                                onClick={() => {
                                    setDeleteModalOpen(false);
                                    setRecordToDelete(null);
                                }}
                                className="flex-1 px-4 py-3 rounded-full border border-[#e6e2d6] text-[#1a1a1c] font-bold text-sm hover:bg-[#f4f2ea] transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleDelete}
                                className="flex-1 px-4 py-3 rounded-full bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition-colors shadow-sm"
                            >
                                Excluir
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de JSON */}
            {jsonModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl p-6 md:p-8 max-w-2xl w-full shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex flex-col">
                                <h3 className="font-heading text-xl font-bold text-[#1a1a1c] flex items-center gap-2">
                                    <Code className="w-5 h-5 text-[#d84a22]" /> Inserir via JSON
                                </h3>
                                <p className="text-sm text-[#7a7872] mt-1">Gere o retorno na IA e cole aqui para preencher automaticamente.</p>
                            </div>
                            <button onClick={() => setJsonModalOpen(false)} className="p-2 text-[#7a7872] hover:bg-[#f4f2ea] rounded-full transition-colors self-start">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="mb-4 flex flex-col items-start gap-4">
                            <button 
                                type="button" 
                                onClick={handleCopyPrompt}
                                className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider bg-[#1a1a1c] text-white px-5 py-3 rounded-xl hover:bg-black transition-colors shadow-sm w-full md:w-auto justify-center"
                            >
                                {copiedPrompt ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                                {copiedPrompt ? "Prompt Copiado!" : "Copiar Prompt para a IA"}
                            </button>
                        </div>

                        <textarea
                            value={jsonInput}
                            onChange={(e) => setJsonInput(e.target.value)}
                            placeholder='Cole o JSON retornado pela IA aqui...'
                            className="w-full h-56 bg-[#f4f2ea] border border-[#e6e2d6] focus:border-[#d84a22] rounded-2xl p-4 text-[#1a1a1c] outline-none text-sm font-mono-data resize-none transition-colors mb-6 shadow-inner"
                        />

                        <div className="flex gap-3 w-full">
                            <button
                                onClick={() => setJsonModalOpen(false)}
                                className="flex-1 px-4 py-3 rounded-full border border-[#e6e2d6] text-[#1a1a1c] font-bold text-sm hover:bg-[#f4f2ea] transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleJsonSubmit}
                                className="flex-1 px-4 py-3 rounded-full bg-[#d84a22] text-white font-bold text-sm hover:bg-[#c23e1a] transition-colors shadow-sm flex items-center justify-center gap-2"
                            >
                                <Check className="w-4 h-4" />
                                Confirmar Dados
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
