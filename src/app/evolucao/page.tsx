"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Camera, Image as ImageIcon, Plus, X, UploadCloud, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { db, storage } from "@/lib/firebase";
import { collection, addDoc, getDocs, query, orderBy } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

interface EvolutionEntry {
    id: string;
    date: string;
    timestamp: number;
    weight: string;
    bodyFat: string;
    photos: {
        front?: string;
        side?: string;
        back?: string;
        frontDoubleBiceps?: string;
        backDoubleBiceps?: string;
        sideChest?: string;
        absAndThigh?: string;
        frontLatSpread?: string;
        extra?: string[];
        extraPoses?: string[]; // new field
    };
    measures: {
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
    };
}

export default function Evolucao() {
    const { user } = useAuth();
    const [evolutions, setEvolutions] = useState<EvolutionEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form states
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [weight, setWeight] = useState("");
    const [bodyFat, setBodyFat] = useState("");

    const initialMeasures = {
        neck: "", shoulders: "", chest: "", waist: "", abdomen: "", hips: "",
        rightArmRelaxed: "", rightArmFlexed: "", leftArmRelaxed: "", leftArmFlexed: "",
        rightForearm: "", leftForearm: "",
        rightThigh: "", leftThigh: "",
        rightCalf: "", leftCalf: "",
    };
    const [measures, setMeasures] = useState(initialMeasures);

    type PhotoKeys = 'front' | 'side' | 'back' | 'frontDoubleBiceps' | 'backDoubleBiceps' | 'sideChest' | 'absAndThigh' | 'frontLatSpread';
    const [files, setFiles] = useState<Record<PhotoKeys, File | null>>({
        front: null, side: null, back: null, frontDoubleBiceps: null, backDoubleBiceps: null, sideChest: null, absAndThigh: null, frontLatSpread: null
    });
    const [previews, setPreviews] = useState<Partial<Record<PhotoKeys, string>>>({});

    // Extras for standard
    const [extraFiles, setExtraFiles] = useState<File[]>([]);
    const [extraPreviews, setExtraPreviews] = useState<string[]>([]);

    // Extras for specific poses
    const [extraPosesFiles, setExtraPosesFiles] = useState<File[]>([]);
    const [extraPosesPreviews, setExtraPosesPreviews] = useState<string[]>([]);

    useEffect(() => {
        if (!user) return;
        fetchEvolutions();
    }, [user]);

    const fetchEvolutions = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const q = query(
                collection(db, "users", user.uid, "evolutions"),
                orderBy("timestamp", "desc")
            );
            const snap = await getDocs(q);
            const data: EvolutionEntry[] = [];
            snap.forEach((doc) => {
                data.push({ id: doc.id, ...doc.data() } as EvolutionEntry);
            });
            setEvolutions(data);
        } catch (error) {
            console.error("Erro ao buscar evoluções:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: PhotoKeys) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setFiles(prev => ({ ...prev, [type]: file }));
            setPreviews(prev => ({ ...prev, [type]: URL.createObjectURL(file) }));
        }
    };

    const removeFile = (type: PhotoKeys) => {
        setFiles(prev => ({ ...prev, [type]: null }));
        setPreviews(prev => ({ ...prev, [type]: undefined }));
    };

    const handleExtraFilesChange = (e: React.ChangeEvent<HTMLInputElement>, isPose: boolean = false) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files);
            const newPreviews = newFiles.map(file => URL.createObjectURL(file));

            if (isPose) {
                setExtraPosesFiles(prev => [...prev, ...newFiles]);
                setExtraPosesPreviews(prev => [...prev, ...newPreviews]);
            } else {
                setExtraFiles(prev => [...prev, ...newFiles]);
                setExtraPreviews(prev => [...prev, ...newPreviews]);
            }
        }
    };

    const removeExtraFile = (index: number, isPose: boolean = false) => {
        if (isPose) {
            setExtraPosesFiles(prev => prev.filter((_, i) => i !== index));
            setExtraPosesPreviews(prev => prev.filter((_, i) => i !== index));
        } else {
            setExtraFiles(prev => prev.filter((_, i) => i !== index));
            setExtraPreviews(prev => prev.filter((_, i) => i !== index));
        }
    };

    const uploadPhoto = async (file: File | null, type: string): Promise<string | undefined> => {
        if (!file || !user) return undefined;
        try {
            const fileRef = ref(storage, `users/${user.uid}/evolutions/${Date.now()}_${type}_${file.name}`);
            await uploadBytes(fileRef, file);
            return await getDownloadURL(fileRef);
        } catch (error) {
            console.error("Erro ao fazer upload da foto:", error);
            return undefined;
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setSubmitting(true);

        try {
            const frontUrl = await uploadPhoto(files.front, 'front');
            const sideUrl = await uploadPhoto(files.side, 'side');
            const backUrl = await uploadPhoto(files.back, 'back');
            const frontDoubleBicepsUrl = await uploadPhoto(files.frontDoubleBiceps, 'frontDoubleBiceps');
            const backDoubleBicepsUrl = await uploadPhoto(files.backDoubleBiceps, 'backDoubleBiceps');
            const sideChestUrl = await uploadPhoto(files.sideChest, 'sideChest');
            const absAndThighUrl = await uploadPhoto(files.absAndThigh, 'absAndThigh');
            const frontLatSpreadUrl = await uploadPhoto(files.frontLatSpread, 'frontLatSpread');

            // Extras padrão
            const extraUrls: string[] = [];
            for (let i = 0; i < extraFiles.length; i++) {
                const url = await uploadPhoto(extraFiles[i], `extra_${i}`);
                if (url) extraUrls.push(url);
            }

            // Extras poses
            const extraPosesUrls: string[] = [];
            for (let i = 0; i < extraPosesFiles.length; i++) {
                const url = await uploadPhoto(extraPosesFiles[i], `extraPoses_${i}`);
                if (url) extraPosesUrls.push(url);
            }

            const newEvolution = {
                date,
                timestamp: new Date(date).getTime(),
                weight,
                bodyFat,
                photos: {
                    ...(frontUrl && { front: frontUrl }),
                    ...(sideUrl && { side: sideUrl }),
                    ...(backUrl && { back: backUrl }),
                    ...(frontDoubleBicepsUrl && { frontDoubleBiceps: frontDoubleBicepsUrl }),
                    ...(backDoubleBicepsUrl && { backDoubleBiceps: backDoubleBicepsUrl }),
                    ...(sideChestUrl && { sideChest: sideChestUrl }),
                    ...(absAndThighUrl && { absAndThigh: absAndThighUrl }),
                    ...(frontLatSpreadUrl && { frontLatSpread: frontLatSpreadUrl }),
                    ...(extraUrls.length > 0 && { extra: extraUrls }),
                    ...(extraPosesUrls.length > 0 && { extraPoses: extraPosesUrls })
                },
                measures
            };

            await addDoc(collection(db, "users", user.uid, "evolutions"), newEvolution);

            // Reset form
            setDate(new Date().toISOString().split('T')[0]);
            setWeight("");
            setBodyFat("");
            setMeasures(initialMeasures);
            setFiles({ front: null, side: null, back: null, frontDoubleBiceps: null, backDoubleBiceps: null, sideChest: null, absAndThigh: null, frontLatSpread: null });
            setPreviews({});
            setExtraFiles([]);
            setExtraPreviews([]);
            setExtraPosesFiles([]);
            setExtraPosesPreviews([]);

            setIsAdding(false);
            fetchEvolutions();

        } catch (error) {
            console.error("Erro ao salvar evolução:", error);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="max-w-[1400px] mx-auto px-12 pt-12 flex justify-center items-center h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-[#1a1a1c]" />
            </div>
        );
    }

    const measureGroups = [
        {
            title: "Tronco e Quadril",
            fields: [
                { key: 'neck', label: 'Pescoço' },
                { key: 'shoulders', label: 'Ombro' },
                { key: 'chest', label: 'Tórax' },
                { key: 'waist', label: 'Cintura' },
                { key: 'abdomen', label: 'Abdômen' },
                { key: 'hips', label: 'Quadril (Glúteos)' },
            ]
        },
        {
            title: "Membros Superiores",
            fields: [
                { key: 'rightArmRelaxed', label: 'Braço Dir. (Relaxado)' },
                { key: 'rightArmFlexed', label: 'Braço Dir. (Flexionado)' },
                { key: 'leftArmRelaxed', label: 'Braço Esq. (Relaxado)' },
                { key: 'leftArmFlexed', label: 'Braço Esq. (Flexionado)' },
                { key: 'rightForearm', label: 'Antebraço Dir.' },
                { key: 'leftForearm', label: 'Antebraço Esq.' },
            ]
        },
        {
            title: "Membros Inferiores",
            fields: [
                { key: 'rightThigh', label: 'Coxa Dir.' },
                { key: 'leftThigh', label: 'Coxa Esq.' },
                { key: 'rightCalf', label: 'Panturrilha Dir.' },
                { key: 'leftCalf', label: 'Panturrilha Esq.' },
            ]
        }
    ];

    const defaultPhotosMap = [
        { key: 'front', label: 'Frente' },
        { key: 'side', label: 'Perfil' },
        { key: 'back', label: 'Costas' },
    ];

    const posePhotosMap = [
        { key: 'frontDoubleBiceps', label: 'Frente Duplo Bíceps' },
        { key: 'backDoubleBiceps', label: 'Costas Duplo Bíceps' },
        { key: 'sideChest', label: 'Peitoral de Lado' },
        { key: 'absAndThigh', label: 'Abdominal e Coxa' },
        { key: 'frontLatSpread', label: 'Frente Flex. Abd/Dorsal' },
    ];

    return (
        <div className="max-w-[1400px] mx-auto px-4 md:px-12 pb-24 pt-8 md:pt-12">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-12 md:mb-16 gap-6">
                <Header title="Evolução" subtitle="Registro Dinâmico de Progresso" />
                {!isAdding ? (
                    <button
                        onClick={() => setIsAdding(true)}
                        className="flex items-center gap-2 bg-[#1a1a1c] text-white px-6 py-3 rounded-full hover:bg-black transition-colors mb-0 sm:mb-16 shadow-[0_4px_20px_rgba(0,0,0,0.1)] w-full sm:w-auto justify-center"
                    >
                        <Plus className="w-4 h-4" />
                        <span className="text-sm font-bold uppercase tracking-wider">Novo Registro</span>
                    </button>
                ) : (
                    <button
                        onClick={() => setIsAdding(false)}
                        className="flex items-center gap-2 border border-[#e6e2d6] text-[#1a1a1c] px-6 py-3 rounded-full hover:bg-[#f4f2ea] transition-colors mb-0 sm:mb-16 w-full sm:w-auto justify-center"
                    >
                        <X className="w-4 h-4" />
                        <span className="text-sm font-bold uppercase tracking-wider">Cancelar</span>
                    </button>
                )}
            </div>

            {isAdding && (
                <div className="bg-white rounded-3xl p-6 md:p-10 border border-[#f2eee3] shadow-sm mb-12 md:mb-16 animate-in slide-in-from-top-4 fade-in duration-500">
                    <form onSubmit={handleSubmit}>
                        <h3 className="font-heading text-xl md:text-2xl font-bold mb-8">Novo Registro de Evolução</h3>

                        <div className="space-y-12">
                            {/* Dados Básicos */}
                            <section>
                                <div className="mb-4 w-full flex items-center gap-6">
                                    <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-[#a19e95] shrink-0">Dados Principais</span>
                                    <div className="h-[1px] flex-1 bg-gradient-to-r from-[#e6e2d6] to-transparent"></div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div>
                                        <label className="block text-xs font-mono-data text-[#1a1a1c] mb-1">Data</label>
                                        <input
                                            type="date"
                                            required
                                            value={date}
                                            onChange={(e) => setDate(e.target.value)}
                                            className="w-full bg-[#f4f2ea] border-none rounded-xl px-4 py-3 text-[#1a1a1c] outline-none text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-mono-data text-[#1a1a1c] mb-1">Peso Atual (kg)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={weight}
                                            onChange={(e) => setWeight(e.target.value)}
                                            placeholder="0.0"
                                            className="w-full bg-[#f4f2ea] border-none rounded-xl px-4 py-3 text-[#1a1a1c] outline-none text-sm placeholder-[#a19e95]"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-mono-data text-[#1a1a1c] mb-1">Percentual Gordura (%)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={bodyFat}
                                            onChange={(e) => setBodyFat(e.target.value)}
                                            placeholder="0.0"
                                            className="w-full bg-[#f4f2ea] border-none rounded-xl px-4 py-3 text-[#1a1a1c] outline-none text-sm placeholder-[#a19e95]"
                                        />
                                    </div>
                                </div>
                            </section>

                            {/* Medidas */}
                            <section>
                                <div className="mb-6 w-full flex items-center gap-6">
                                    <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-[#a19e95] shrink-0">Circunferências (cm)</span>
                                    <div className="h-[1px] flex-1 bg-gradient-to-r from-[#e6e2d6] to-transparent"></div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
                                    {measureGroups.map((group, idx) => (
                                        <div key={idx} className="space-y-4">
                                            <h5 className="font-heading font-semibold text-[#1a1a1c] mb-4">{group.title}</h5>
                                            <div className="space-y-3">
                                                {group.fields.map((field) => (
                                                    <div key={field.key} className="flex flex-col">
                                                        <label className="text-xs font-mono-data text-[#7a7872] mb-1">{field.label}</label>
                                                        <input
                                                            type="number"
                                                            step="0.1"
                                                            value={measures[field.key as keyof typeof measures]}
                                                            onChange={(e) => setMeasures({ ...measures, [field.key]: e.target.value })}
                                                            placeholder="0.0"
                                                            className="w-full bg-[#f4f2ea] border border-transparent focus:border-[#d84a22] rounded-lg px-3 py-2 text-[#1a1a1c] outline-none text-sm placeholder-[#a19e95] transition-colors"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            {/* Fotos Padrões */}
                            <section>
                                <div className="mb-6 w-full flex items-center gap-6">
                                    <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-[#1a1a1c] shrink-0">1. Fotos Padrões</span>
                                    <div className="h-[1px] flex-1 bg-gradient-to-r from-[#e6e2d6] to-transparent"></div>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                    {defaultPhotosMap.map((photo) => {
                                        const type = photo.key as PhotoKeys;
                                        return (
                                            <div key={photo.key} className="relative aspect-[3/4] bg-[#f4f2ea] rounded-2xl overflow-hidden border border-dashed border-[#e6e2d6] group">
                                                {previews[type] ? (
                                                    <div className="w-full h-full relative">
                                                        <img src={previews[type]} alt={photo.label} className="w-full h-full object-cover" />
                                                        <button
                                                            type="button"
                                                            onClick={() => removeFile(type)}
                                                            className="absolute top-2 right-2 bg-black/50 text-white p-1.5 rounded-full hover:bg-red-500 transition-colors"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 pt-6 pb-2 px-3">
                                                            <span className="text-white text-[10px] font-mono-data tracking-widest uppercase font-bold">{photo.label}</span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-[#e6e2d6]/30 transition-colors">
                                                        <UploadCloud className="w-6 h-6 text-[#a19e95] mb-2" />
                                                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#7a7872]">{photo.label}</span>
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            className="hidden"
                                                            onChange={(e) => handleFileChange(e, type)}
                                                        />
                                                    </label>
                                                )}
                                            </div>
                                        );
                                    })}

                                    {/* Extras Padrão */}
                                    {extraPreviews.map((preview, idx) => (
                                        <div key={`extra-${idx}`} className="relative aspect-[3/4] bg-[#f4f2ea] rounded-2xl overflow-hidden border border-[#e6e2d6] group">
                                            <div className="w-full h-full relative">
                                                <img src={preview} alt={`Extra Padrão ${idx + 1}`} className="w-full h-full object-cover" />
                                                <button
                                                    type="button"
                                                    onClick={() => removeExtraFile(idx, false)}
                                                    className="absolute top-2 right-2 bg-black/50 text-white p-1.5 rounded-full hover:bg-red-500 transition-colors"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 pt-6 pb-2 px-3">
                                                    <span className="text-white text-[10px] font-mono-data tracking-widest uppercase font-bold">Extra Padrão {idx + 1}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Botão Adicionar Extra Padrão */}
                                    <label className="relative aspect-[3/4] bg-white rounded-2xl overflow-hidden border border-dashed border-[#e6e2d6] group flex flex-col items-center justify-center cursor-pointer hover:border-[#1a1a1c] transition-colors">
                                        <Plus className="w-6 h-6 text-[#a19e95] group-hover:text-[#1a1a1c] transition-colors mb-2" />
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#7a7872] group-hover:text-[#1a1a1c] transition-colors text-center px-2">Adicionar<br />Foto Extra</span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            multiple
                                            className="hidden"
                                            onChange={(e) => handleExtraFilesChange(e, false)}
                                        />
                                    </label>
                                </div>
                            </section>

                            {/* Fotos Poses */}
                            <section>
                                <div className="mb-6 w-full flex items-center gap-6">
                                    <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-[#1a1a1c] shrink-0">2. Poses Específicas</span>
                                    <div className="h-[1px] flex-1 bg-gradient-to-r from-[#e6e2d6] to-transparent"></div>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                    {posePhotosMap.map((photo) => {
                                        const type = photo.key as PhotoKeys;
                                        return (
                                            <div key={photo.key} className="relative aspect-[3/4] bg-[#f4f2ea] rounded-2xl overflow-hidden border border-dashed border-[#e6e2d6] group">
                                                {previews[type] ? (
                                                    <div className="w-full h-full relative">
                                                        <img src={previews[type]} alt={photo.label} className="w-full h-full object-cover" />
                                                        <button
                                                            type="button"
                                                            onClick={() => removeFile(type)}
                                                            className="absolute top-2 right-2 bg-black/50 text-white p-1.5 rounded-full hover:bg-red-500 transition-colors"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 pt-6 pb-2 px-3">
                                                            <span className="text-white text-[10px] font-mono-data tracking-widest uppercase font-bold">{photo.label}</span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-[#e6e2d6]/30 transition-colors">
                                                        <UploadCloud className="w-6 h-6 text-[#a19e95] mb-2" />
                                                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#7a7872] leading-tight text-center px-2">{photo.label}</span>
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            className="hidden"
                                                            onChange={(e) => handleFileChange(e, type)}
                                                        />
                                                    </label>
                                                )}
                                            </div>
                                        );
                                    })}

                                    {/* Extras Poses */}
                                    {extraPosesPreviews.map((preview, idx) => (
                                        <div key={`extraPoses-${idx}`} className="relative aspect-[3/4] bg-[#f4f2ea] rounded-2xl overflow-hidden border border-[#e6e2d6] group">
                                            <div className="w-full h-full relative">
                                                <img src={preview} alt={`Extra Pose ${idx + 1}`} className="w-full h-full object-cover" />
                                                <button
                                                    type="button"
                                                    onClick={() => removeExtraFile(idx, true)}
                                                    className="absolute top-2 right-2 bg-black/50 text-white p-1.5 rounded-full hover:bg-red-500 transition-colors"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 pt-6 pb-2 px-3">
                                                    <span className="text-white text-[10px] font-mono-data tracking-widest uppercase font-bold">Extra Pose {idx + 1}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Botão Adicionar Extra Pose */}
                                    <label className="relative aspect-[3/4] bg-white rounded-2xl overflow-hidden border border-dashed border-[#e6e2d6] group flex flex-col items-center justify-center cursor-pointer hover:border-[#1a1a1c] transition-colors">
                                        <Plus className="w-6 h-6 text-[#a19e95] group-hover:text-[#1a1a1c] transition-colors mb-2" />
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#7a7872] group-hover:text-[#1a1a1c] transition-colors text-center px-2">Adicionar<br />Pose Extra</span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            multiple
                                            className="hidden"
                                            onChange={(e) => handleExtraFilesChange(e, true)}
                                        />
                                    </label>
                                </div>
                            </section>
                        </div>

                        <div className="mt-12 flex justify-end pt-8 border-t border-[#f2eee3]">
                            <button
                                type="submit"
                                disabled={submitting}
                                className="flex items-center gap-2 bg-[#1a1a1c] text-white px-8 py-4 rounded-full font-bold uppercase tracking-wider text-sm hover:bg-black transition-colors disabled:opacity-70 shadow-[0_4px_15px_rgba(0,0,0,0.1)]"
                            >
                                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
                                Salvar Evolução
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Linha do Tempo */}
            <div className="space-y-12">
                {evolutions.length === 0 && !isAdding && (
                    <div className="bg-white rounded-3xl p-16 flex flex-col items-center justify-center border border-[#f2eee3] shadow-sm mb-16 h-[300px]">
                        <ImageIcon className="w-12 h-12 text-[#e6e2d6] mb-4" />
                        <p className="text-sm font-mono-data tracking-widest uppercase text-[#a19e95]">
                            Nenhum registro de evolução encontrado
                        </p>
                    </div>
                )}

                {evolutions.map((evo) => {
                    const hasDefaultPhotos = defaultPhotosMap.some(p => evo.photos[p.key as keyof typeof evo.photos]) || (evo.photos.extra && evo.photos.extra.length > 0);
                    const hasPosePhotos = posePhotosMap.some(p => evo.photos[p.key as keyof typeof evo.photos]) || (evo.photos.extraPoses && evo.photos.extraPoses.length > 0);
                    const hasPhotos = hasDefaultPhotos || hasPosePhotos;
                    const hasMeasures = Object.values(evo.measures || {}).some(v => v !== "");

                    return (
                        <div key={evo.id} className="bg-white rounded-3xl p-6 md:p-8 border border-[#f2eee3] shadow-sm relative overflow-hidden flex flex-col gap-8 md:gap-10">

                            {/* Linha superior: Meta Info e Fotos */}
                            <div className="flex flex-col-reverse lg:flex-row gap-8 md:gap-10">
                                {/* Info Section */}
                                <div className="w-full lg:w-[350px] shrink-0 space-y-6 flex-shrink-0">
                                    <div>
                                        <span className="text-[10px] font-mono-data tracking-widest uppercase text-[#1a1a1c] font-bold bg-[#f4f2ea] border border-[#e6e2d6] px-3 py-1.5 rounded-full inline-block mb-4 shadow-sm">
                                            {new Date(evo.date).toLocaleDateString("pt-BR", { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </span>
                                        <div className="flex items-end gap-6">
                                            <div>
                                                <h3 className="font-heading text-4xl font-bold text-[#1a1a1c]">
                                                    {evo.weight ? <>{evo.weight}<span className="text-xl text-[#7a7872] ml-1">kg</span></> : "--"}
                                                </h3>
                                                <span className="text-[10px] font-mono-data tracking-widest text-[#a19e95] uppercase">Peso</span>
                                            </div>
                                            {evo.bodyFat && (
                                                <div className="mb-1">
                                                    <span className="font-heading text-2xl font-bold text-[#d84a22]">{evo.bodyFat}%</span>
                                                    <span className="block text-[10px] font-mono-data tracking-widest text-[#a19e95] uppercase">Gordura</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {hasMeasures && (
                                        <div className="bg-[#f4f2ea] p-5 rounded-2xl">
                                            <h4 className="text-[10px] uppercase font-bold tracking-widest text-[#88888b] mb-4">Medidas Cadastradas</h4>

                                            <div className="space-y-4">
                                                {measureGroups.map(group => {
                                                    const hasFieldsInGroup = group.fields.some(f => evo.measures[f.key as keyof typeof evo.measures]);
                                                    if (!hasFieldsInGroup) return null;

                                                    return (
                                                        <div key={group.title}>
                                                            <h5 className="text-[9px] font-bold uppercase text-[#1a1a1c] border-b border-[#e6e2d6] pb-1 mb-2">
                                                                {group.title}
                                                            </h5>
                                                            <div className="space-y-1.5 pl-2 border-l-2 border-[#e6e2d6]">
                                                                {group.fields.map(f => {
                                                                    const val = evo.measures[f.key as keyof typeof evo.measures];
                                                                    if (!val) return null;
                                                                    return (
                                                                        <div key={f.key} className="flex justify-between items-center">
                                                                            <span className="text-[11px] text-[#7a7872] leading-tight">{f.label}</span>
                                                                            <span className="font-mono-data font-bold text-xs">{val} cm</span>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Seção Padrões */}
                                <div className="w-full flex-[1] min-w-0">
                                    <div className="mb-4">
                                        <h4 className="text-[10px] uppercase font-bold tracking-widest text-[#1a1a1c]">1. Fotos Padrões</h4>
                                    </div>
                                    <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar w-full">
                                        {!hasDefaultPhotos && (
                                            <div className="w-full min-h-[300px] bg-[#f4f2ea] rounded-2xl border border-dashed border-[#e6e2d6] flex flex-col items-center justify-center">
                                                <ImageIcon className="w-6 h-6 text-[#a19e95] mb-2" />
                                                <p className="text-[10px] font-mono-data tracking-widest uppercase text-[#a19e95]">Nenhuma foto anexada</p>
                                            </div>
                                        )}
                                        {defaultPhotosMap.map(photo => {
                                            const url = evo.photos[photo.key as keyof typeof evo.photos] as string | undefined;
                                            if (!url) return null;
                                            return (
                                                <div key={photo.key} className="shrink-0 w-56 relative aspect-[3/4] bg-[#e6e2d6] rounded-2xl overflow-hidden group cursor-pointer shadow-sm">
                                                    <img src={url} alt={photo.label} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                                                        <span className="text-white text-[10px] font-mono-data tracking-widest uppercase font-bold">{photo.label}</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {evo.photos.extra?.map((url, idx) => (
                                            <div key={idx} className="shrink-0 w-56 relative aspect-[3/4] bg-[#e6e2d6] rounded-2xl overflow-hidden group cursor-pointer shadow-sm border border-[#e6e2d6]">
                                                <img src={url} alt={`Extra ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                                                    <span className="text-white text-[10px] font-mono-data tracking-widest uppercase font-bold">Extra Padrão {idx + 1}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Segunda Linha Horizontal (Poses, Esticando na largura máxima dentro do card) Se houver alguma. */}
                            {hasPosePhotos && (
                                <div className="border-t border-[#f2eee3] pt-8 mt-2 w-full">
                                    <div className="mb-4">
                                        <h4 className="text-[10px] uppercase font-bold tracking-widest text-[#1a1a1c]">2. Poses Específicas</h4>
                                    </div>
                                    <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar w-full">
                                        {posePhotosMap.map(photo => {
                                            const url = evo.photos[photo.key as keyof typeof evo.photos] as string | undefined;
                                            if (!url) return null;
                                            return (
                                                <div key={photo.key} className="shrink-0 w-56 relative aspect-[3/4] bg-[#e6e2d6] rounded-2xl overflow-hidden group cursor-pointer shadow-sm">
                                                    <img src={url} alt={photo.label} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                                                        <span className="text-white text-[10px] font-mono-data tracking-widest uppercase font-bold">{photo.label}</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {evo.photos.extraPoses?.map((url, idx) => (
                                            <div key={idx} className="shrink-0 w-56 relative aspect-[3/4] bg-[#e6e2d6] rounded-2xl overflow-hidden group cursor-pointer shadow-sm border border-[#e6e2d6]">
                                                <img src={url} alt={`Extra Pose ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                                                    <span className="text-white text-[10px] font-mono-data tracking-widest uppercase font-bold">Extra Pose {idx + 1}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                        </div>
                    )
                })}
            </div>
        </div>
    );
}
