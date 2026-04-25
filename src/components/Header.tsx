interface HeaderProps {
    title: React.ReactNode;
    subtitle?: string;
    showDate?: boolean;
}

export function Header({ title, subtitle, showDate }: HeaderProps) {
    const currentDate = new Date().toLocaleDateString('pt-BR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    return (
        <header className="flex flex-col md:flex-row md:items-end justify-between mb-8 md:mb-16 gap-4">
            <div>
                <p className="text-[#a19e95] text-[10px] md:text-xs font-mono-data tracking-wider uppercase mb-2 md:mb-3">
                    {showDate ? currentDate : subtitle}
                </p>
                <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tighter text-[#1a1a1c]">
                    {title}
                </h2>
            </div>
        </header>
    );
}
