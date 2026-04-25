"use client";

import { useState, useRef, useEffect } from "react";
import { Header } from "@/components/Header";
import { User, LogOut, Loader2, Camera } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { auth, db, storage } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function Configuracoes() {
    const { user, userData, setUserData } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [loading, setLoading] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        username: "",
        email: "",
        birthDate: "",
        phone: ""
    });

    useEffect(() => {
        if (userData) {
            setFormData({
                username: userData.username || "",
                email: userData.email || "",
                birthDate: userData.birthDate || "",
                phone: userData.phone || ""
            });
            setPreviewUrl(userData.profileImageUrl || null);
        }
    }, [userData]);

    const handleLogout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Erro ao sair:", error);
        }
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImageFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleSave = async () => {
        if (!user) return;
        setLoading(true);
        try {
            let uploadedImageUrl = userData?.profileImageUrl || null;

            if (imageFile) {
                const fileExtension = imageFile.name.split('.').pop();
                const fileName = `profile-${Date.now()}.${fileExtension}`;
                const storageRef = ref(storage, `users/${user.uid}/profile/${fileName}`);
                await uploadBytes(storageRef, imageFile);
                uploadedImageUrl = await getDownloadURL(storageRef);
            }

            const updatedData = {
                ...userData,
                ...formData,
                profileImageUrl: uploadedImageUrl
            };

            await setDoc(doc(db, "users", user.uid), updatedData, { merge: true });
            setUserData(updatedData);

        } catch (error) {
            console.error("Erro ao salvar perfil:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-[1000px] mx-auto px-4 md:px-12 pb-24 pt-8 md:pt-12">
            <Header title="Configurações" subtitle="Ajustes do Sistema" />

            <div className="grid grid-cols-1 md:grid-cols-12 gap-12">

                {/* Navigation Sidebar */}
                <div className="md:col-span-4 space-y-2">
                    <button
                        className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-left transition-all bg-[#1a1a1c] text-white shadow-lg"
                    >
                        <User className="w-4 h-4 text-[#d84a22]" />
                        <span className="text-sm font-semibold tracking-wide">Perfil de Usuário</span>
                    </button>

                    <button
                        onClick={handleLogout}
                        className="w-full mt-8 flex items-center gap-4 px-4 py-4 rounded-2xl text-left transition-all text-[#d84a22] hover:bg-white hover:shadow-sm"
                    >
                        <LogOut className="w-4 h-4" />
                        <span className="text-sm font-semibold tracking-wide">Encerrar Sessão</span>
                    </button>
                </div>

                {/* Content Area */}
                <div className="md:col-span-8">
                    <div className="bg-white rounded-3xl p-6 md:p-10 border border-[#f2eee3] shadow-[0_4px_30px_rgba(0,0,0,0.03)] space-y-8">
                        <div>
                            <h3 className="font-heading text-xl md:text-2xl font-bold mb-6 md:mb-8">Perfil de Usuário</h3>

                            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 md:gap-8 mb-8 md:mb-10 pb-8 md:pb-10 border-b border-dashed border-[#e6e2d6] text-center sm:text-left">
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-24 h-24 rounded-full border-2 border-[#f2eee3] overflow-hidden bg-[#f4f2ea] flex items-center justify-center p-1 relative group cursor-pointer"
                                >
                                    <div className="w-full h-full rounded-full bg-[#e6e2d6] flex flex-col items-center justify-center overflow-hidden">
                                        {previewUrl ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={previewUrl} alt="Avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            <User className="text-[#a19e95] w-8 h-8 opacity-50 block" />
                                        )}
                                    </div>
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Camera className="w-6 h-6" />
                                    </div>
                                </div>
                                <div className="flex flex-col items-center sm:items-start">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        ref={fileInputRef}
                                        onChange={handleImageChange}
                                    />
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="bg-[#1a1a1c] text-white px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest shadow-sm hover:bg-black transition-colors"
                                    >
                                        Carregar Foto
                                    </button>
                                    <p className="text-[10px] md:text-xs text-[#a19e95] mt-3">JPG, GIF ou PNG. Máximo de 2MB.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-mono-data font-bold uppercase tracking-widest text-[#7a7872]">Nome de Usuário</label>
                                    <input
                                        type="text"
                                        value={formData.username}
                                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                        placeholder="Seu nome"
                                        className="w-full bg-[#f4f2ea] border border-transparent focus:border-[#1a1a1c] px-4 py-3 rounded-xl text-sm font-medium outline-none transition-all placeholder:text-[#a19e95]"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-mono-data font-bold uppercase tracking-widest text-[#7a7872]">E-mail</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        placeholder="seu@email.com"
                                        className="w-full bg-[#f4f2ea] border border-transparent focus:border-[#1a1a1c] px-4 py-3 rounded-xl text-sm font-medium outline-none transition-all placeholder:text-[#a19e95]"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-mono-data font-bold uppercase tracking-widest text-[#7a7872]">Data de Nascimento</label>
                                    <input
                                        type="text"
                                        value={formData.birthDate}
                                        onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                                        placeholder="DD / MM / AAAA"
                                        className="w-full bg-[#f4f2ea] border border-transparent focus:border-[#1a1a1c] px-4 py-3 rounded-xl text-sm font-mono-data outline-none transition-all placeholder:text-[#a19e95]"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-mono-data font-bold uppercase tracking-widest text-[#7a7872]">Telefone</label>
                                    <input
                                        type="text"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        placeholder="+55 (--) ----- ----"
                                        className="w-full bg-[#f4f2ea] border border-transparent focus:border-[#1a1a1c] px-4 py-3 rounded-xl text-sm font-mono-data outline-none transition-all placeholder:text-[#a19e95]"
                                    />
                                </div>
                            </div>

                            <div className="mt-8 md:mt-10 flex justify-center sm:justify-end">
                                <button
                                    onClick={handleSave}
                                    disabled={loading}
                                    className="w-full sm:w-auto bg-[#1a1a1c] text-white px-8 py-3.5 rounded-full text-[11px] md:text-sm font-bold shadow-[0_4px_15px_rgba(0,0,0,0.1)] hover:bg-[#3a3a3c] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 uppercase tracking-widest"
                                >
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                    Salvar Alterações
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
