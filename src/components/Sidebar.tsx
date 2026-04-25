"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Dumbbell,
    Apple,
    TrendingUp,
    Syringe,
    Pill,
    FileText,
    Activity,
    Settings,
    Menu,
    X,
    LogOut
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

export function Sidebar() {
    const pathname = usePathname();
    const { userData } = useAuth();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const handleLogout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Erro ao fazer logout:", error);
        }
    };

    const userName = userData?.username || "Atleta";
    const profileImageUrl = userData?.profileImageUrl;
    const userInitial = userName.charAt(0).toUpperCase();

    // Bloqueia o container real de scroll no mobile para evitar jitter no drawer.
    useEffect(() => {
        const root = document.documentElement;
        const body = document.body;
        const scrollContainer = document.querySelector<HTMLElement>("[data-app-scroll-container]");

        const previousRootOverflow = root.style.overflow;
        const previousBodyOverflow = body.style.overflow;
        const previousBodyTouchAction = body.style.touchAction;
        const previousBodyOverscrollBehavior = body.style.overscrollBehavior;
        const previousContainerOverflow = scrollContainer?.style.overflow ?? "";
        const previousContainerTouchAction = scrollContainer?.style.touchAction ?? "";
        const previousContainerOverscrollBehavior = scrollContainer?.style.overscrollBehavior ?? "";

        if (isMobileMenuOpen) {
            root.style.overflow = "hidden";
            body.style.overflow = "hidden";
            body.style.touchAction = "none";
            body.style.overscrollBehavior = "none";

            if (scrollContainer) {
                scrollContainer.style.overflow = "hidden";
                scrollContainer.style.touchAction = "none";
                scrollContainer.style.overscrollBehavior = "none";
            }
        } else {
            root.style.overflow = previousRootOverflow;
            body.style.overflow = previousBodyOverflow;
            body.style.touchAction = previousBodyTouchAction;
            body.style.overscrollBehavior = previousBodyOverscrollBehavior;

            if (scrollContainer) {
                scrollContainer.style.overflow = previousContainerOverflow;
                scrollContainer.style.touchAction = previousContainerTouchAction;
                scrollContainer.style.overscrollBehavior = previousContainerOverscrollBehavior;
            }
        }

        return () => {
            root.style.overflow = previousRootOverflow;
            body.style.overflow = previousBodyOverflow;
            body.style.touchAction = previousBodyTouchAction;
            body.style.overscrollBehavior = previousBodyOverscrollBehavior;

            if (scrollContainer) {
                scrollContainer.style.overflow = previousContainerOverflow;
                scrollContainer.style.touchAction = previousContainerTouchAction;
                scrollContainer.style.overscrollBehavior = previousContainerOverscrollBehavior;
            }
        };
    }, [isMobileMenuOpen]);

    // Fecha menu ao navegar
    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [pathname]);

    const routineItems = [
        { name: "Home", href: "/", icon: LayoutDashboard },
        { name: "Treinos", href: "/treinos", icon: Dumbbell },
        { name: "Dieta", href: "/dieta", icon: Apple },
        { name: "Suplementos", href: "/suplementos", icon: Pill },
    ];

    const metricsItems = [
        { name: "Evolução", href: "/evolucao", icon: TrendingUp },
        { name: "Bioimpedância", href: "/bioimpedancia", icon: Activity },
    ];

    const clinicalItems = [
        { name: "Esteroides", href: "/protocolos", icon: Syringe },
        { name: "Exames", href: "/exames", icon: FileText },
    ];

    const mobileMainTabs = [
        { name: "Home", href: "/", icon: LayoutDashboard },
        { name: "Treinos", href: "/treinos", icon: Dumbbell },
        { name: "Dieta", href: "/dieta", icon: Apple },
        { name: "Métricas", href: "/evolucao", icon: TrendingUp },
    ];

    const RenderDesktopGroup = ({ title, items }: { title: string; items: any[] }) => (
        <div className="mb-8">
            <h3 className="text-[9px] font-mono-data font-bold uppercase tracking-[0.2em] text-[#a19e95] mb-4 px-3 flex items-center gap-2">
                <span className="w-3 h-[1px] bg-[#d6d2c4]"></span>
                {title}
            </h3>
            <div className="space-y-0.5">
                {items.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                        <Link key={item.name} href={item.href}
                            className={`group flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-300 relative overflow-hidden ${isActive
                                ? "text-[#1a1a1c] font-bold"
                                : "text-[#7a7872] font-medium hover:text-[#1a1a1c]"
                                }`}
                        >
                            {isActive && (
                                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-1/2 bg-[#1a1a1c] rounded-r-full" />
                            )}
                            <Icon className={`w-[#1.125rem] h-[#1.125rem] transition-transform duration-300 ${isActive ? "stroke-[2.5px] scale-110" : "stroke-[1.5px] group-hover:scale-110"}`} />
                            <span className="text-[11px] uppercase tracking-wider z-10">{item.name}</span>
                            {isActive && (
                                <span className="absolute inset-0 bg-black/[0.03] rounded-lg -z-0" />
                            )}
                        </Link>
                    );
                })}
            </div>
        </div>
    );

    return (
        <>
            {/* ================= DESKTOP SIDEBAR ================= */}
            <aside className="hidden md:flex flex-col w-[280px] flex-shrink-0 h-[100dvh] bg-[#efeadd] border-r border-[#e6e2d6] relative z-20">
                {/* Brand Area */}
                <div className="flex-none px-8 py-10">
                    <Link href="/" className="inline-block group">
                        <h1 className="font-heading text-2xl font-black tracking-tighter text-[#1a1a1c] flex items-baseline">
                            HAUMEA
                            <span className="text-[#d84a22] font-sans group-hover:animate-pulse">.</span>
                        </h1>
                        <p className="text-[9px] font-mono-data uppercase tracking-[0.3em] text-[#a19e95] mt-1 pl-0.5">
                            Physique
                        </p>
                    </Link>
                </div>

                {/* Navigation Scroll Area */}
                <nav className="flex-1 overflow-y-auto custom-scrollbar px-5 pb-6">
                    <RenderDesktopGroup title="Rotina" items={routineItems} />
                    <RenderDesktopGroup title="Progresso" items={metricsItems} />
                    <RenderDesktopGroup title="Clínica" items={clinicalItems} />
                </nav>

                {/* Footer Area / User Profile */}
                <div className="flex-none p-5 border-t border-[#e6e2d6]">
                    <div className="bg-white/50 rounded-2xl p-3 flex flex-col gap-3">
                        <div className="flex items-center gap-3 px-2">
                            <div className="w-10 h-10 rounded-full bg-[#1a1a1c] flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
                                {profileImageUrl ? (
                                    <img src={profileImageUrl} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="font-heading font-black text-xs text-white">{userInitial}</span>
                                )}
                            </div>
                            <div className="flex flex-col justify-center overflow-hidden">
                                <span className="text-xs font-black uppercase tracking-wider text-[#1a1a1c] truncate">{userName}</span>
                                <span className="text-[9px] text-[#a19e95] font-mono-data tracking-widest uppercase">Atleta</span>
                            </div>
                        </div>

                        <div className="h-[1px] bg-[#e6e2d6]/60 w-full" />

                        <div className="flex gap-1">
                            <Link href="/configuracoes" className="flex-1 flex items-center justify-center gap-2 p-2 rounded-xl text-[#7a7872] hover:text-[#1a1a1c] hover:bg-black/5 transition-colors">
                                <Settings className="w-4 h-4 stroke-[1.5px]" />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Ajustes</span>
                            </Link>
                            <button onClick={handleLogout} className="p-2 rounded-xl text-[#7a7872] hover:text-[#d84a22] hover:bg-[#d84a22]/10 transition-colors" title="Sair">
                                <LogOut className="w-4 h-4 stroke-[1.5px]" />
                            </button>
                        </div>
                    </div>
                </div>
            </aside>

            {/* ================= MOBILE NAVIGATION ================= */}
            {/* Bottom App Bar */}
            <nav
                aria-hidden={isMobileMenuOpen}
                className={`md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#efeadd]/95 border-t border-[#e6e2d6] backdrop-blur-xl pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_40px_rgba(0,0,0,0.03)] transform-gpu transition-[transform,opacity] duration-200 ${isMobileMenuOpen ? "pointer-events-none translate-y-full opacity-0" : "translate-y-0 opacity-100"}`}
            >
                <div className="flex items-center justify-around px-2 py-2">
                    {mobileMainTabs.map((tab) => {
                        const active = pathname === tab.href;
                        return (
                            <Link
                                key={tab.name}
                                href={tab.href}
                                className="group flex flex-col items-center justify-center flex-1 h-14 gap-1 relative"
                            >
                                {active && (
                                    <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[2px] bg-[#1a1a1c] rounded-b-full shadow-[0_2px_8px_rgba(26,26,28,0.4)]" />
                                )}
                                <div className={`relative flex items-center justify-center transition-all duration-300 ${active ? "translate-y-[-2px]" : "group-hover:translate-y-[-2px]"}`}>
                                    <tab.icon className={`w-5 h-5 transition-colors duration-300 ${active ? "stroke-[2.5px] text-[#1a1a1c]" : "stroke-[1.5px] text-[#7a7872]"}`} />
                                </div>
                                <span className={`text-[9px] uppercase tracking-widest transition-colors duration-300 ${active ? "font-bold text-[#1a1a1c]" : "font-medium text-[#a19e95]"}`}>
                                    {tab.name}
                                </span>
                            </Link>
                        );
                    })}

                    <button
                        onClick={() => setIsMobileMenuOpen(true)}
                        aria-expanded={isMobileMenuOpen}
                        aria-controls="mobile-navigation-drawer"
                        className="group flex flex-col items-center justify-center flex-1 h-14 gap-1 relative"
                    >
                        {isMobileMenuOpen && (
                            <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[2px] bg-[#1a1a1c] rounded-b-full shadow-[0_2px_8px_rgba(26,26,28,0.4)]" />
                        )}
                        <div className={`relative flex items-center justify-center transition-all duration-300 ${isMobileMenuOpen ? "translate-y-[-2px]" : "group-hover:translate-y-[-2px]"}`}>
                            <Menu className={`w-5 h-5 transition-colors duration-300 ${isMobileMenuOpen ? "stroke-[2.5px] text-[#1a1a1c]" : "stroke-[1.5px] text-[#7a7872]"}`} />
                        </div>
                        <span className={`text-[9px] uppercase tracking-widest transition-colors duration-300 ${isMobileMenuOpen ? "font-bold text-[#1a1a1c]" : "font-medium text-[#a19e95]"}`}>
                            Menu
                        </span>
                    </button>
                </div>
            </nav>

            {/* Full Screen Menu Drawer (Mobile) */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 z-50 md:hidden flex justify-end flex-col overscroll-none">
                    <div
                        className="absolute inset-0 bg-[#1a1a1c]/32"
                        onClick={() => setIsMobileMenuOpen(false)}
                    />

                    <div
                        id="mobile-navigation-drawer"
                        className="relative bg-[#efeadd] rounded-t-[2.5rem] flex flex-col pt-3 pb-[calc(24px+env(safe-area-inset-bottom))] shadow-[0_-20px_60px_rgba(0,0,0,0.15)] h-[85svh] max-h-[85svh] min-h-0 transform-gpu will-change-transform overflow-hidden"
                    >
                        {/* Drawer Drag Handle */}
                        <div className="w-12 h-1.5 bg-[#d6d2c4] rounded-full mx-auto mb-6 shrink-0" />

                        {/* Profile Header */}
                        <div className="flex justify-between items-center px-8 pb-6 border-b border-[#e6e2d6]/60 shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-[#1a1a1c] overflow-hidden flex items-center justify-center shrink-0 shadow-lg">
                                    {profileImageUrl ? (
                                        <img src={profileImageUrl} alt="Avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="font-heading font-black text-sm text-white">{userInitial}</span>
                                    )}
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-black uppercase tracking-wider text-[#1a1a1c]">{userName}</span>
                                    <span className="text-[9px] text-[#a19e95] font-mono-data tracking-widest uppercase">Menu de Navegação</span>
                                </div>
                            </div>

                            <button
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="w-10 h-10 flex items-center justify-center bg-white/60 backdrop-blur-sm rounded-full text-[#7a7872] active:scale-95 transition-all shadow-sm border border-white/40"
                            >
                                <X className="w-5 h-5 stroke-[2px]" />
                            </button>
                        </div>

                        {/* Expandable Navigation List */}
                        <div className="flex-1 overflow-y-auto overscroll-contain custom-scrollbar px-6 py-6 pb-20">
                            <div className="space-y-8">
                                <RenderDesktopGroup title="Rotina" items={routineItems} />
                                <RenderDesktopGroup title="Progresso" items={metricsItems} />
                                <RenderDesktopGroup title="Clínica" items={clinicalItems} />
                            </div>
                        </div>

                        {/* Footer Settings */}
                        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#efeadd] via-[#efeadd] to-transparent pointer-events-none flex justify-center pb-[calc(24px+env(safe-area-inset-bottom))]">
                            <div className="pointer-events-auto flex items-center gap-3 w-full max-w-xs shadow-lg rounded-2xl bg-white p-2 border border-[#e6e2d6] backdrop-blur-lg">
                                <Link href="/configuracoes" className="flex-1 flex items-center justify-center gap-2 p-3 rounded-xl hover:bg-black/5 active:scale-[0.98] transition-all">
                                    <Settings className="w-4 h-4 text-[#1a1a1c]" />
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#1a1a1c]">Ajustes</span>
                                </Link>
                                <div className="w-[1px] h-8 bg-[#e6e2d6]"></div>
                                <button onClick={handleLogout} className="p-3 px-5 rounded-xl text-[#d84a22] hover:bg-[#d84a22]/10 active:scale-[0.98] transition-all">
                                    <LogOut className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
            )}
        </>
    );
}
