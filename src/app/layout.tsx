import "./globals.css";
import type { Metadata } from "next";
import { LayoutWrapper } from "@/components/LayoutWrapper";
export const metadata: Metadata = {
    title: "Haumea Physique",
    description: "Premium fitness tracking platform",
    icons: {
        icon: "/icon.ico",
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="pt-BR">
            <body className="antialiased font-sans text-primary bg-[#f4f2ea]">
                <div className="flex h-[100dvh] w-full overflow-hidden">
                    <LayoutWrapper>
                        {children}
                    </LayoutWrapper>
                </div>
            </body>
        </html>
    );
}
