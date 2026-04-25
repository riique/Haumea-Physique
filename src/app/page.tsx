"use client";

import {
    Dumbbell,
    ArrowUpRight,
    ArrowDownRight,
    Stethoscope,
    Activity,
} from "lucide-react";
import { Header } from "@/components/Header";
import { useAuth } from "@/contexts/AuthContext";

export default function Dashboard() {
    const { userData } = useAuth();
    const userName = userData?.username || "Atleta";

    return (
        <div className="max-w-[1400px] mx-auto px-4 md:px-12 pb-24 pt-8 md:pt-12">
            <Header
                title={<>Bom dia, <span className="text-[#7a7872]">{userName}</span></>}
                showDate
            />

            {/* KPI CARDS */}
            <div className="mb-8 w-full flex items-center gap-6">
                <span className="text-[10px] font-mono-data font-bold tracking-[0.2em] uppercase text-[#a19e95] shrink-0">
                    Visão Geral
                </span>
                <div className="h-[1px] flex-1 bg-gradient-to-r from-[#e6e2d6] via-[#e6e2d6]/50 to-transparent"></div>
            </div>
            <section className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6 mb-16 md:mb-20">
                {/* Card 1: Último Treino */}
                <div className="bg-white p-6 rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.03)] border border-[#f2eee3] flex flex-col justify-between h-[160px]">
                    <div className="flex justify-between items-start">
                        <span className="text-[11px] font-semibold tracking-widest uppercase text-[#a19e95]">Treino</span>
                        <Dumbbell className="w-4 h-4 text-[#d84a22] stroke-[2px]" />
                    </div>
                    <div>
                        <h3 className="font-heading text-xl font-bold mb-1">-</h3>
                        <p className="text-xs text-[#7a7872] flex items-center gap-1">
                            Sem dados recentes
                        </p>
                    </div>
                </div>

                {/* Card 2: Peso */}
                <div className="bg-white p-6 rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.03)] border border-[#f2eee3] flex flex-col justify-between h-[160px]">
                    <div className="flex justify-between items-start">
                        <span className="text-[11px] font-semibold tracking-widest uppercase text-[#a19e95]">Peso Atual</span>
                        <ArrowDownRight className="w-4 h-4 text-[#43965c] stroke-[2px]" />
                    </div>
                    <div className="flex items-baseline gap-1">
                        <h3 className="font-mono-data text-3xl font-bold tracking-tight">-</h3>
                        <span className="text-sm font-medium text-[#a19e95]">kg</span>
                    </div>
                    <p className="text-[10px] uppercase font-mono-data text-[#43965c] mt-2">-</p>
                </div>

                {/* Card 3: % Gordura */}
                <div className="bg-white p-5 md:p-6 rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.03)] border border-[#f2eee3] flex flex-col justify-between h-[140px] md:h-[160px]">
                    <div className="flex justify-between items-start">
                        <span className="text-[10px] md:text-[11px] font-semibold tracking-widest uppercase text-[#a19e95] line-clamp-1">% Gordura</span>
                        <ArrowDownRight className="w-4 h-4 text-[#43965c] stroke-[2px] shrink-0 ml-2" />
                    </div>
                    <div>
                        <div className="flex items-baseline gap-1">
                            <h3 className="font-mono-data text-2xl md:text-3xl font-bold tracking-tight">-</h3>
                            <span className="text-xs md:text-sm font-medium text-[#a19e95]">%</span>
                        </div>
                        <div className="w-full bg-[#f4f2ea] h-1.5 mt-3 md:mt-4 rounded-full overflow-hidden">
                            <div className="bg-[#e6e2d6] h-full rounded-full" style={{ width: '0%' }}></div>
                        </div>
                    </div>
                </div>

                {/* Card 4: Próximo Exame */}
                <div className="bg-white p-6 rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.03)] border border-[#f2eee3] flex flex-col justify-between h-[160px]">
                    <div className="flex justify-between items-start">
                        <span className="text-[11px] font-semibold tracking-widest uppercase text-[#a19e95]">Próx. Exame</span>
                        <Stethoscope className="w-4 h-4 text-[#d84a22] stroke-[2px]" />
                    </div>
                    <div>
                        <h3 className="font-heading text-xl font-bold mb-1">-</h3>
                        <p className="text-xs text-[#7a7872] flex items-center gap-1">
                            Sem agendamento
                        </p>
                    </div>
                </div>

                {/* Card 5: Últimas Medidas */}
                <div className="bg-white p-6 rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.03)] border border-[#f2eee3] flex flex-col justify-between h-[160px]">
                    <div className="flex justify-between items-start">
                        <span className="text-[11px] font-semibold tracking-widest uppercase text-[#a19e95]">Medidas</span>
                        <Activity className="w-4 h-4 text-[#1a1a1c] stroke-[2px]" />
                    </div>
                    <div>
                        <h3 className="font-mono-data text-xl font-bold">-</h3>
                        <p className="text-[11px] leading-tight text-[#7a7872] mt-1 line-clamp-2">
                            Nenhuma medida registrada.
                        </p>
                    </div>
                </div>
            </section>

            {/* VISUAL SECTIONS (EVOLUTION) */}
            <div className="mb-8 w-full flex items-center gap-6">
                <span className="text-[10px] font-mono-data font-bold tracking-[0.2em] uppercase text-[#a19e95] shrink-0">
                    Evolução & Progresso
                </span>
                <div className="h-[1px] flex-1 bg-gradient-to-r from-[#e6e2d6] via-[#e6e2d6]/50 to-transparent"></div>
            </div>
            <section className="grid grid-cols-1 xl:grid-cols-3 gap-6 md:gap-8">
                {/* Chart Area */}
                <div className="xl:col-span-2 bg-white rounded-3xl p-6 md:p-8 border border-[#f2eee3] shadow-sm flex flex-col relative overflow-hidden h-[350px] md:h-[400px]">
                    <div className="flex justify-between items-center mb-10 z-10 relative">
                        <div>
                            <h3 className="font-heading text-xl font-bold mb-1">Trajetória de Peso</h3>
                            <p className="text-xs text-[#7a7872]">Evolução nos últimos 6 meses</p>
                        </div>
                        <div className="flex gap-2">
                            {['1M', '3M', '6M', '1Y'].map((span, i) => (
                                <button
                                    key={span}
                                    className={`px-3 py-1 rounded-full text-[10px] font-mono-data uppercase font-bold transition-colors ${i === 2 ? 'bg-[#1a1a1c] text-white' : 'text-[#a19e95] hover:bg-[#f4f2ea]'
                                        }`}
                                >
                                    {span}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 w-full relative flex items-center justify-center">
                        <p className="text-[#a19e95] text-sm uppercase font-mono-data tracking-wider">Acrescente dados para visualizar o gráfico</p>
                    </div>
                </div>

                {/* Photos & Compare Panel */}
                <div className="bg-white rounded-3xl p-6 md:p-8 border border-[#f2eee3] shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="font-heading text-xl font-bold">Progresso Visual</h3>
                            <button className="text-[#d84a22] text-xs font-bold uppercase tracking-widest hover:underline decoration-2 underline-offset-4">
                                Adicionar fotos
                            </button>
                        </div>

                        {/* Photos Grid */}
                        <div className="flex flex-col items-center justify-center h-[200px] bg-[#f4f2ea] rounded-2xl border border-dashed border-[#e6e2d6] mb-8">
                            <p className="text-[#a19e95] text-xs uppercase font-mono-data tracking-widest">Sem fotos registradas</p>
                        </div>
                    </div>

                    {/* Mini Compare Table */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-dashed border-[#e6e2d6]">
                            <span className="text-xs font-semibold tracking-wide text-[#7a7872]">Cintura</span>
                            <div className="flex gap-4 font-mono-data text-sm">
                                <span className="font-bold">-</span>
                            </div>
                        </div>
                        <div className="flex items-center justify-between pb-1">
                            <span className="text-xs font-semibold tracking-wide text-[#7a7872]">Braço Relax.</span>
                            <div className="flex gap-4 font-mono-data text-sm">
                                <span className="font-bold">-</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
