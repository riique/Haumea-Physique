"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

function ContentWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading) {
            if (!user && pathname !== "/login") {
                router.push("/login");
            } else if (user && pathname === "/login") {
                router.push("/");
            }
        }
    }, [user, loading, pathname, router]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[100dvh] w-full bg-[#f4f2ea]">
                <div className="w-8 h-8 rounded-full border-4 border-[#1a1a1c] border-t-transparent animate-spin"></div>
            </div>
        );
    }

    if (pathname === "/login") {
        return <main data-app-scroll-container className="flex-1 h-full overflow-y-auto relative">{children}</main>;
    }

    // Render dashboard layout for authenticated users
    if (!user) return null; // Avoid flicker before redirect

    return (
        <>
            <Sidebar />
            <main data-app-scroll-container className="flex-1 h-full overflow-y-auto relative pb-[72px] md:pb-0">
                {children}
            </main>
        </>
    );
}

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <ContentWrapper>{children}</ContentWrapper>
        </AuthProvider>
    );
}
