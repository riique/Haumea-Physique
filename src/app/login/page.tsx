"use client";

import { useState } from "react";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";

export default function LoginPage() {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [username, setUsername] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            if (isLogin) {
                await signInWithEmailAndPassword(auth, email, password);
                router.push("/");
            } else {
                if (!username.trim()) throw new Error("Nome de usuário é obrigatório.");
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                await updateProfile(userCredential.user, { displayName: username });
                await setDoc(doc(db, "users", userCredential.user.uid), {
                    username,
                    email,
                    createdAt: new Date().toISOString()
                });
                router.push("/");
            }
        } catch (err: any) {
            setError(err.message || "Ocorreu um erro. Tente novamente.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#f4f2ea] p-4">
            <div className="w-full max-w-md bg-white p-12 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-[#e6e2d6]">
                <div className="mb-10 text-center">
                    <h1 className="font-heading text-4xl font-semibold tracking-tighter text-[#1a1a1c] mb-2">
                        Haumea Physique
                    </h1>
                    <p className="text-[#a19e95] text-sm font-mono-data tracking-wider uppercase">
                        {isLogin ? "Acesse sua conta" : "Junte-se à elite"}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {!isLogin && (
                        <div>
                            <label className="block text-xs font-mono-data uppercase tracking-wider text-[#a19e95] mb-2">
                                Nome de Usuário
                            </label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full bg-[#f4f2ea] border-none rounded-xl px-4 py-3 text-[#1a1a1c] placeholder-[#a19e95] focus:ring-1 focus:ring-[#1a1a1c] transition-all outline-none"
                                placeholder="Seu nome"
                                required={!isLogin}
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-mono-data uppercase tracking-wider text-[#a19e95] mb-2">
                            Email
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-[#f4f2ea] border-none rounded-xl px-4 py-3 text-[#1a1a1c] placeholder-[#a19e95] focus:ring-1 focus:ring-[#1a1a1c] transition-all outline-none"
                            placeholder="seu@email.com"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-mono-data uppercase tracking-wider text-[#a19e95] mb-2">
                            Senha
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-[#f4f2ea] border-none rounded-xl px-4 py-3 text-[#1a1a1c] placeholder-[#a19e95] focus:ring-1 focus:ring-[#1a1a1c] transition-all outline-none"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    {error && <p className="text-red-500 text-sm py-2">{error}</p>}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-[#1a1a1c] text-white rounded-xl px-4 py-4 flex items-center justify-center gap-2 hover:bg-[#2a2a2c] transition-colors disabled:opacity-70 group"
                    >
                        {loading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                <span className="font-medium text-sm tracking-wide">
                                    {isLogin ? "Entrar" : "Criar Conta"}
                                </span>
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-8 text-center">
                    <button
                        onClick={() => {
                            setIsLogin(!isLogin);
                            setError("");
                        }}
                        className="text-sm text-[#8a877c] hover:text-[#1a1a1c] transition-colors"
                    >
                        {isLogin
                            ? "Ainda não tem uma conta? Registre-se"
                            : "Já possui uma conta? Entre aqui"}
                    </button>
                </div>
            </div>
        </div>
    );
}
