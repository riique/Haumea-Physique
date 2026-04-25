"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { DownloadCloud, FileText, Plus, X, Upload, Loader2, Activity, Calendar, User as UserIcon, Edit3, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { collection, addDoc, getDocs, query, orderBy, Timestamp, where, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const EXAM_CATEGORIES = [
    {
        id: "hormonal", title: "1. Painel Hormonal", description: "Marcadores de recuperação, hipertrofia e eixo endócrino.", markers: [
            { id: "testosterona_total", label: "Testosterona Total", purpose: "Produção hormonal global" },
            { id: "testosterona_livre", label: "Testosterona Livre", purpose: "Fração biologicamente ativa" },
            { id: "shbg", label: "SHBG", purpose: "Impacta a fração livre de hormônios" },
            { id: "estradiol", label: "Estradiol (E2)", purpose: "Neuroproteção e saúde óssea" },
            { id: "prolactina", label: "Prolactina", purpose: "Supressão de T e libido" },
            { id: "cortisol", label: "Cortisol (Basal/Manhã)", purpose: "Estresse crônico e catabolismo" }
        ]
    },
    {
        id: "tireoide", title: "3. Tireoide", description: "Regulação do metabolismo basal e energia celular.", markers: [
            { id: "tsh", label: "TSH", purpose: "Sinalizador eixo hipófise-tireoide" },
            { id: "t4_livre", label: "T4 Livre", purpose: "Pró-hormônio principal" },
            { id: "t3_livre", label: "T3 Livre", purpose: "Hormônio ativo tireoidiano" }
        ]
    },
    {
        id: "glicose", title: "4. Metabolismo de Glicose", description: "Sensibilidade à insulina e glicação.", markers: [
            { id: "glicemia_jejum", label: "Glicemia de Jejum", purpose: "Níveis basais circulantes" },
            { id: "insulina_jejum", label: "Insulina de Jejum", purpose: "Demanda pancreática basal" },
            { id: "homa_ir", label: "HOMA-IR", purpose: "Índice de resistência" },
            { id: "hba1c", label: "Hemoglobina Glicada (HbA1c)", purpose: "Média glicêmica trimestral" }
        ]
    },
    {
        id: "filtro", title: "5. Filtro e a Depuração", description: "Saúde hepática e clearance renal.", markers: [
            { id: "tgo", label: "TGO (AST)", purpose: "Dano hepático ou muscular" },
            { id: "tgp", label: "TGP (ALT)", purpose: "Lesão celular hepática" },
            { id: "gama_gt", label: "Gama GT", purpose: "Toxicidade e fluxo biliar" },
            { id: "creatinina", label: "Creatinina", purpose: "Filtração glomerular" },
            { id: "ureia", label: "Ureia", purpose: "Catabolismo proteico" },
            { id: "cistatina_c", label: "Cistatina C", purpose: "Avaliação renal independente de massa" }
        ]
    },
    {
        id: "coracao", title: "6. Coração e o Músculo", description: "Dano celular e transporte lipídico.", markers: [
            { id: "cpk", label: "CPK", purpose: "Lesão e dano muscular pós-treino" },
            { id: "colesterol_total", label: "Colesterol Total", purpose: "Somatória lipídica circulante" },
            { id: "hdl", label: "HDL", purpose: "Transporte reverso. Impacto dietético." },
            { id: "ldl", label: "LDL", purpose: "Transportador principal aos tecidos" },
            { id: "triglicerideos", label: "Triglicerídeos", purpose: "Lipídios de circulação (Carb e Álcool)" }
        ]
    },
    {
        id: "nutrientes", title: "7. Nutrientes e Inflamação", description: "Estado inflamatório sistêmico e vitaminas.", markers: [
            { id: "hemograma", label: "Hemograma Completo", purpose: "Visão ampla de série vermelha e branca" },
            { id: "ferritina", label: "Ferritina", purpose: "Reserva de ferro / Inflamação aguda" },
            { id: "b12", label: "Vitamina B12", purpose: "Sistema nervoso central" },
            { id: "vit_d", label: "Vitamina D (25-OH)", purpose: "Pró-hormônio imunológico e performance" },
            { id: "pcr", label: "PCR-Ultrassensível", purpose: "Inflamação sistêmica de baixo grau" }
        ]
    },
    {
        id: "eletrolitos", title: "8. Eletrólitos", description: "A elétrica do corpo (hidratação e contração).", markers: [
            { id: "sodio", label: "Sódio", purpose: "Volume sanguíneo e impulsos" },
            { id: "potassio", label: "Potássio", purpose: "Contração cardíaca e muscular" },
            { id: "calcio", label: "Cálcio Iônico", purpose: "Fração ativa contrátil" },
            { id: "magnesio", label: "Magnésio", purpose: "Relaxamento e sono" }
        ]
    },
    {
        id: "urina", title: "9. Urina", description: "Avaliação do trato urinário.", markers: [
            { id: "eas", label: "EAS (Urina Tipo 1)", purpose: "Proteínas, glicose e infeção renal" }
        ]
    },
    {
        id: "ferro", title: "10. Ferro Sérico e Saturação", description: "Transporte de oxigênio avançado.", markers: [
            { id: "ferro_serico", label: "Ferro Sérico", purpose: "Nível circulante instantâneo" },
            { id: "transferrina", label: "Saturação de Transferrina", purpose: "Status dos transportadores" }
        ]
    }
];

export default function Exames() {
    const { user } = useAuth();
    const [exams, setExams] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [activeExam, setActiveExam] = useState<any | null>(null);

    // Form State
    const [medico, setMedico] = useState("");
    const [dataExame, setDataExame] = useState(new Date().toISOString().split("T")[0]);
    const [markersState, setMarkersState] = useState<Record<string, string>>({});
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    useEffect(() => {
        if (!user) return;
        fetchExams();
    }, [user]);

    const fetchExams = async () => {
        setLoading(true);
        try {
            const q = query(
                collection(db, `users/${user!.uid}/exams`),
                orderBy("date", "desc")
            );
            const snapshot = await getDocs(q);
            const loaded = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setExams(loaded);
            if (loaded.length > 0) setActiveExam(loaded[0]);
        } catch (error) {
            console.error("Erro ao puxar exames", error);
        } finally {
            setLoading(false);
        }
    };

    const handleMarkerChange = (id: string, value: string) => {
        setMarkersState(prev => ({ ...prev, [id]: value }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setPdfFile(e.target.files[0]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || submitting) return;

        setSubmitting(true);
        try {
            let pdfUrl = editingId ? activeExam?.pdfUrl : null;
            let pdfName = editingId ? activeExam?.pdfName : null;

            if (pdfFile) {
                const fileName = `${Date.now()}_${pdfFile.name}`;
                const storageRef = ref(storage, `exams/${user.uid}/${fileName}`);
                const uploadResult = await uploadBytes(storageRef, pdfFile);
                pdfUrl = await getDownloadURL(uploadResult.ref);
                pdfName = fileName;
            }

            // Clean empty markers
            const cleanMarkers = Object.fromEntries(
                Object.entries(markersState).filter(([_, v]) => v.trim() !== "")
            );

            const examData = {
                userId: user.uid,
                date: Timestamp.fromDate(new Date(`${dataExame}T12:00:00`)),
                medico: medico || "Não informado",
                pdfUrl,
                pdfName,
                markers: cleanMarkers
            };

            if (editingId) {
                await updateDoc(doc(db, `users/${user.uid}/exams`, editingId), {
                    ...examData,
                    updatedAt: Timestamp.now()
                });
            } else {
                await addDoc(collection(db, `users/${user.uid}/exams`), {
                    ...examData,
                    createdAt: Timestamp.now()
                });
            }

            await fetchExams();
            closeForm();
        } catch (error) {
            console.error(error);
            alert("Falha ao salvar. Verifique o console.");
        } finally {
            setSubmitting(false);
        }
    };

    const openEditForm = () => {
        if (!activeExam) return;
        setEditingId(activeExam.id);
        setMedico(activeExam.medico || "");
        setDataExame(format(activeExam.date.toDate(), "yyyy-MM-dd"));
        setMarkersState(activeExam.markers || {});
        setPdfFile(null);
        setIsFormOpen(true);
    };

    const handleDeleteClick = () => {
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!activeExam || !user) return;

        setDeleting(true);
        try {
            if (activeExam.pdfName) {
                try {
                    await deleteObject(ref(storage, `exams/${user.uid}/${activeExam.pdfName}`));
                } catch (e) {
                    console.log("PDF não encontrado ou acesso restrito.", e);
                }
            }
            await deleteDoc(doc(db, `users/${user.uid}/exams`, activeExam.id));
            setActiveExam(null);
            await fetchExams();
        } catch (error) {
            console.error(error);
            alert("Falha ao excluir.");
        } finally {
            setDeleting(false);
            setIsDeleteModalOpen(false);
        }
    };

    const closeForm = () => {
        setIsFormOpen(false);
        setEditingId(null);
        setMarkersState({});
        setMedico("");
        setDataExame(new Date().toISOString().split("T")[0]);
        setPdfFile(null);
    };

    if (loading) {
        return (
            <div className="max-w-[1400px] mx-auto px-12 pt-32 pb-24 flex items-center justify-center min-h-[60vh]">
                <Activity className="w-8 h-8 text-[#1a1a1c] animate-pulse" />
            </div>
        );
    }

    return (
        <div className="max-w-[1400px] mx-auto px-4 md:px-12 pb-24 pt-8 md:pt-12 relative">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 md:mb-16 gap-6">
                <Header title="Avaliações Médicas" subtitle="Hemograma, Hormônios e Glicemia" />
                {!isFormOpen && (
                    <button
                        onClick={() => setIsFormOpen(true)}
                        className="flex items-center gap-2 bg-[#1a1a1c] text-white px-6 py-3.5 rounded-full hover:bg-black transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Adicionar Exame</span>
                    </button>
                )}
            </div>

            {isFormOpen ? (
                <div className="bg-white border border-[#e6e2d6] rounded-t-3xl rounded-b-xl shadow-sm animate-in fade-in slide-in-from-bottom-8 duration-500 overflow-hidden">
                    <div className="border-b border-[#e6e2d6] bg-[#faf9f6] p-6 md:p-8 flex justify-between items-center sticky top-0 z-10">
                        <div>
                            <h2 className="font-heading text-xl md:text-2xl mb-1 text-[#1a1a1c]">{editingId ? "Editar Exame" : "Novo Registro de Exame"}</h2>
                            <p className="text-[10px] md:text-xs text-[#a19e95] font-mono-data uppercase tracking-widest">Preencha apenas o que foi coletado</p>
                        </div>
                        <button onClick={closeForm} className="p-2 md:p-3 bg-white rounded-full border border-[#e6e2d6] hover:bg-[#f2eee3] transition-colors">
                            <X className="w-4 md:w-5 h-4 md:h-5 text-[#88888b]" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 md:p-12 space-y-12 md:space-y-16">
                        {/* Meta Info */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
                            <div className="space-y-3 md:space-y-4">
                                <label className="text-xs font-bold uppercase tracking-widest text-[#1a1a1c] flex items-center gap-2">
                                    <Calendar className="w-4 h-4" /> Data da Coleta
                                </label>
                                <input
                                    type="date"
                                    required
                                    value={dataExame}
                                    onChange={(e) => setDataExame(e.target.value)}
                                    className="w-full border-b border-[#e6e2d6] bg-transparent py-4 font-mono-data text-sm focus:outline-none focus:border-[#1a1a1c] transition-colors"
                                />
                            </div>
                            <div className="space-y-4">
                                <label className="text-xs font-bold uppercase tracking-widest text-[#1a1a1c] flex items-center gap-2">
                                    <UserIcon className="w-4 h-4" /> Médico Solicitante
                                </label>
                                <input
                                    type="text"
                                    placeholder="Ex: Dr. Fulano"
                                    value={medico}
                                    onChange={(e) => setMedico(e.target.value)}
                                    className="w-full border-b border-[#e6e2d6] bg-transparent py-4 text-sm font-medium focus:outline-none focus:border-[#1a1a1c] transition-colors"
                                />
                            </div>
                            <div className="space-y-4">
                                <label className="text-xs font-bold uppercase tracking-widest text-[#1a1a1c] flex items-center gap-2">
                                    <FileText className="w-4 h-4" /> Laudo Original (PDF)
                                </label>
                                <div className="relative group">
                                    <input
                                        type="file"
                                        accept=".pdf"
                                        onChange={handleFileChange}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                    <div className="w-full border border-dashed border-[#e6e2d6] hover:border-[#a19e95] bg-[#faf9f6]/50 rounded-xl py-4 px-6 flex items-center justify-between transition-colors">
                                        <span className="text-xs text-[#a19e95] truncate font-mono-data max-w-[80%]">
                                            {pdfFile ? pdfFile.name : "Anexar arquivo PDF..."}
                                        </span>
                                        <Upload className={`w-4 h-4 ${pdfFile ? 'text-green-600' : 'text-[#a19e95]'}`} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Biomarkers */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-12 md:gap-x-16 md:gap-y-16">
                            {EXAM_CATEGORIES.map(category => (
                                <div key={category.id} className="space-y-8">
                                    <div className="border-b border-[#1a1a1c] pb-4">
                                        <h3 className="font-heading text-lg font-bold text-[#1a1a1c]">{category.title}</h3>
                                        <p className="text-[11px] text-[#a19e95] tracking-wide mt-1 leading-snug">{category.description}</p>
                                    </div>
                                    <div className="space-y-6">
                                        {category.markers.map(marker => (
                                            <div key={marker.id} className="group relative">
                                                <div className="flex flex-col">
                                                    <div className="flex justify-between items-baseline mb-2">
                                                        <label className="text-sm font-semibold text-[#1a1a1c] group-focus-within:text-black">
                                                            {marker.label}
                                                        </label>
                                                        <span className="text-[9px] text-[#a19e95] font-mono-data uppercase tracking-widest text-right max-w-[60%] leading-tight">
                                                            {marker.purpose}
                                                        </span>
                                                    </div>
                                                    <input
                                                        type="text"
                                                        placeholder="—"
                                                        value={markersState[marker.id] || ""}
                                                        onChange={(e) => handleMarkerChange(marker.id, e.target.value)}
                                                        className="w-full bg-[#faf9f6] border border-[#f2eee3] rounded-lg px-4 py-3 text-sm font-mono focus:bg-white focus:border-[#1a1a1c] focus:ring-0 outline-none transition-all shadow-sm placeholder:text-[#d4d1c9]"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="pt-8 border-t border-[#e6e2d6] flex justify-end gap-4 sticky bottom-0 bg-white/90 backdrop-blur-md p-4 md:p-6 -mx-6 md:-mx-12 -mb-6 md:-mb-12 shadow-[0_-10px_40px_rgba(0,0,0,0.03)] border-b rounded-b-xl hover:shadow-[0_-5px_30px_rgba(0,0,0,0.05)] transition-shadow">
                            <button
                                type="button"
                                onClick={closeForm}
                                className="px-6 md:px-8 py-3 md:py-4 text-[10px] md:text-xs font-bold uppercase tracking-widest text-[#88888b] hover:text-[#1a1a1c] transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="flex items-center justify-center gap-2 md:gap-3 bg-[#1a1a1c] text-white px-6 md:px-10 py-3 md:py-4 rounded-full hover:bg-black transition-all disabled:opacity-50 w-full md:w-auto"
                            >
                                {submitting ? <Loader2 className="w-4 h-4 animate-spin shrink-0" /> : <Activity className="w-4 h-4 shrink-0" />}
                                <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest truncate">
                                    {submitting ? "Processando..." : (editingId ? "Atualizar Exame" : "Salvar Exame")}
                                </span>
                            </button>
                        </div>
                    </form>
                </div>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
                    {/* List of past exams (Sidebar) */}
                    <div className="xl:col-span-3 space-y-4">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#a19e95] mb-6 flex items-center gap-2">
                            <Calendar className="w-3 h-3" /> Histórico
                        </h4>
                        {exams.length === 0 ? (
                            <div className="bg-[#faf9f6] border border-[#e6e2d6] rounded-2xl p-6 text-center shadow-sm">
                                <p className="text-xs text-[#a19e95] font-mono-data">Nenhum exame</p>
                            </div>
                        ) : (
                            exams.map(exam => (
                                <button
                                    key={exam.id}
                                    onClick={() => setActiveExam(exam)}
                                    className={`w-full text-left p-5 rounded-2xl border transition-all ${activeExam?.id === exam.id
                                        ? 'bg-white border-[#1a1a1c] shadow-[0_8px_30px_rgba(0,0,0,0.06)] scale-[1.02]'
                                        : 'bg-white border-[#f2eee3] hover:border-[#d4d1c9] shadow-sm'
                                        }`}
                                >
                                    <p className="font-heading font-bold text-[#1a1a1c] mb-1">
                                        {format(exam.date.toDate(), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                                    </p>
                                    <p className="text-[11px] text-[#88888b] font-mono-data truncate">
                                        {exam.medico || "S/ Médico"}
                                    </p>
                                    <div className="mt-3 text-[10px] text-[#a19e95] font-bold uppercase tracking-widest flex justify-between items-center">
                                        <span>{Object.keys(exam.markers || {}).length} marcadores</span>
                                        {exam.pdfUrl && <FileText className="w-3 h-3 text-green-600 opacity-60" />}
                                    </div>
                                </button>
                            ))
                        )}
                    </div>

                    {/* Active Exam Details */}
                    <div className="xl:col-span-9">
                        {activeExam ? (
                            <div className="bg-white rounded-[2rem] border border-[#e6e2d6] shadow-[0_4px_40px_rgba(0,0,0,0.02)] min-h-[600px] overflow-hidden">
                                <div className="px-6 md:px-10 py-8 md:py-10 border-b border-[#f2eee3] bg-[#faf9f6]/40 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                    <div>
                                        <h3 className="font-heading text-2xl md:text-3xl font-bold text-[#1a1a1c] tracking-tight mb-2">
                                            {format(activeExam.date.toDate(), "dd 'de' MMMM", { locale: ptBR })}
                                        </h3>
                                        <p className="text-xs md:text-sm text-[#88888b] flex items-center gap-2">
                                            Dr(a). {activeExam.medico || "Não informado"}
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                                        <button
                                            onClick={openEditForm}
                                            className="flex-1 md:flex-none flex items-center justify-center bg-white border border-[#e6e2d6] p-3 rounded-xl hover:border-[#1a1a1c] hover:shadow-sm transition-all group"
                                            title="Editar Exame"
                                        >
                                            <Edit3 className="w-4 h-4 text-[#a19e95] group-hover:text-[#1a1a1c] transition-colors" />
                                        </button>
                                        <button
                                            onClick={handleDeleteClick}
                                            disabled={deleting}
                                            className="flex-1 md:flex-none flex items-center justify-center bg-white border border-[#e6e2d6] p-3 rounded-xl hover:border-red-200 hover:bg-red-50 disabled:opacity-50 transition-all group"
                                            title="Excluir Exame"
                                        >
                                            {deleting ? <Loader2 className="w-4 h-4 text-red-500 animate-spin" /> : <Trash2 className="w-4 h-4 text-[#a19e95] group-hover:text-red-500 transition-colors" />}
                                        </button>
                                        {activeExam.pdfUrl && (
                                            <a
                                                href={activeExam.pdfUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="w-full md:w-auto flex items-center justify-center gap-3 bg-white border border-[#e6e2d6] text-[#1a1a1c] px-6 py-3 rounded-xl hover:border-[#1a1a1c] hover:shadow-sm transition-all group mt-2 md:mt-0"
                                            >
                                                <DownloadCloud className="w-4 h-4 text-[#a19e95] group-hover:text-[#1a1a1c] transition-colors" />
                                                <span className="text-[10px] font-bold uppercase tracking-widest">Baixar Laudo</span>
                                            </a>
                                        )}
                                    </div>
                                </div>

                                <div className="p-6 md:p-10 columns-1 md:columns-2 lg:columns-3 gap-10 space-y-10">
                                    {EXAM_CATEGORIES.map(category => {
                                        // only show categories that have at least one marker reported in this exam
                                        const filledMarkersInGroup = category.markers.filter(m => activeExam.markers?.[m.id]);
                                        if (filledMarkersInGroup.length === 0) return null;

                                        return (
                                            <div key={category.id} className="break-inside-avoid">
                                                <h4 className="font-heading text-[#1a1a1c] font-bold mb-4 flex items-center gap-2 text-sm border-b border-[#f2eee3] pb-2">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-[#1a1a1c]"></span>
                                                    {category.title.split('. ')[1] || category.title}
                                                </h4>
                                                <div className="space-y-4">
                                                    {filledMarkersInGroup.map(marker => (
                                                        <div key={marker.id} className="flex justify-between items-end border-b border-dashed border-[#f2eee3] pb-1">
                                                            <span className="text-xs text-[#a19e95] font-medium max-w-[60%] leading-tight">
                                                                {marker.label}
                                                            </span>
                                                            <span className="font-mono text-sm text-[#1a1a1c] font-semibold text-right">
                                                                {activeExam.markers[marker.id]}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {(!activeExam.markers || Object.keys(activeExam.markers).length === 0) && (
                                        <div className="col-span-full py-12 flex flex-col items-center justify-center opacity-40">
                                            <Activity className="w-8 h-8 mb-4 stroke-[1]" />
                                            <p className="text-xs uppercase tracking-widest font-mono-data">Sem dados metabólicos transcritos</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="h-full border border-dashed border-[#e6e2d6] rounded-[2rem] flex flex-col items-center justify-center p-12 text-[#a19e95] min-h-[600px] bg-[#faf9f6]/30">
                                <Activity className="w-10 h-10 opacity-20 mb-6 stroke-[1]" />
                                <p className="text-xs font-mono-data tracking-widest uppercase text-center max-w-[200px] leading-relaxed">
                                    Selecione ou arquive novos exames
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {isDeleteModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white max-w-sm w-full rounded-3xl p-6 md:p-8 border border-[#e6e2d6] shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-6 mx-auto">
                            <Trash2 className="w-5 h-5 text-red-500" />
                        </div>
                        <h3 className="font-heading text-xl font-bold text-center text-[#1a1a1c] mb-2">
                            Excluir Avaliação?
                        </h3>
                        <p className="text-center text-sm text-[#88888b] mb-8 leading-relaxed">
                            Essa ação é irreversível. O laudo em PDF e todos os marcadores mapeados dessa data serão removidos permanentemente.
                        </p>

                        <div className="flex gap-4">
                            <button
                                onClick={() => setIsDeleteModalOpen(false)}
                                disabled={deleting}
                                className="flex-1 px-4 md:px-6 py-3 md:py-3.5 rounded-full border border-[#e6e2d6] text-[#88888b] text-[10px] md:text-xs font-bold uppercase tracking-widest hover:bg-[#faf9f6] hover:text-[#1a1a1c] transition-all disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmDelete}
                                disabled={deleting}
                                className="flex-1 flex justify-center items-center gap-2 px-4 md:px-6 py-3 md:py-3.5 rounded-full bg-red-500 text-white text-[10px] md:text-xs font-bold uppercase tracking-widest hover:bg-red-600 shadow-[0_4px_15px_rgba(239,68,68,0.2)] transition-all disabled:opacity-50 disabled:hover:scale-100"
                            >
                                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Excluir"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
