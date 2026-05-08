"use client";

interface MetricLineChartProps {
    title: string;
    subtitle: string;
    unit?: string;
    color?: string;
    points: Array<{ label: string; value: number }>;
}

export function MetricLineChart({
    title,
    subtitle,
    unit = "",
    color = "#d84a22",
    points
}: MetricLineChartProps) {
    const values = points.map(point => point.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const width = 720;
    const height = 220;
    const paddingX = 36;
    const paddingY = 24;

    const coordinates = points.map((point, index) => {
        const x = points.length === 1
            ? width / 2
            : paddingX + (index / (points.length - 1)) * (width - paddingX * 2);
        const y = height - paddingY - ((point.value - min) / range) * (height - paddingY * 2);
        return { ...point, x, y };
    });

    const path = coordinates.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
    const gradientId = `chartFill-${title.replace(/[^a-z0-9]/gi, "")}`;

    return (
        <div className="h-full min-h-[320px] rounded-3xl border border-[#f2eee3] bg-white p-6 shadow-sm md:p-8">
            <div className="mb-8 flex items-start justify-between gap-4">
                <div>
                    <h3 className="font-heading text-xl font-bold text-[#1a1a1c]">{title}</h3>
                    <p className="mt-1 text-xs font-mono-data uppercase tracking-widest text-[#a19e95]">{subtitle}</p>
                </div>
                {points.length > 0 && (
                    <div className="rounded-2xl bg-[#f4f2ea] px-4 py-3 text-right">
                        <span className="block font-mono-data text-2xl font-bold text-[#1a1a1c]">
                            {points[points.length - 1].value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
                            <span className="ml-1 text-xs text-[#a19e95]">{unit}</span>
                        </span>
                        <span className="text-[9px] font-bold uppercase tracking-widest text-[#88888b]">Atual</span>
                    </div>
                )}
            </div>

            {points.length < 2 ? (
                <div className="flex h-[220px] items-center justify-center rounded-2xl border border-dashed border-[#e6e2d6] bg-[#f4f2ea]/60 text-center">
                    <p className="max-w-xs text-xs font-mono-data uppercase tracking-widest text-[#a19e95]">
                        Adicione pelo menos dois registros para desenhar a tendência.
                    </p>
                </div>
            ) : (
                <div className="relative overflow-hidden rounded-2xl bg-[#fdfbf6]">
                    <svg viewBox={`0 0 ${width} ${height}`} className="h-[220px] w-full">
                        <defs>
                            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                                <stop offset="0%" stopColor={color} stopOpacity="0.18" />
                                <stop offset="100%" stopColor={color} stopOpacity="0" />
                            </linearGradient>
                        </defs>

                        {[0, 1, 2, 3].map(index => {
                            const y = paddingY + index * ((height - paddingY * 2) / 3);
                            return (
                                <line
                                    key={index}
                                    x1={paddingX}
                                    x2={width - paddingX}
                                    y1={y}
                                    y2={y}
                                    stroke="#e6e2d6"
                                    strokeDasharray="4 8"
                                    strokeWidth="1"
                                />
                            );
                        })}

                        <path
                            d={`${path} L ${coordinates[coordinates.length - 1].x} ${height - paddingY} L ${coordinates[0].x} ${height - paddingY} Z`}
                            fill={`url(#${gradientId})`}
                        />
                        <path d={path} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />

                        {coordinates.map(point => (
                            <g key={`${point.label}-${point.value}`}>
                                <circle cx={point.x} cy={point.y} r="5" fill="#fff" stroke={color} strokeWidth="3" />
                                <text x={point.x} y={height - 5} textAnchor="middle" fill="#8a877c" fontSize="12" fontFamily="monospace">
                                    {point.label}
                                </text>
                            </g>
                        ))}
                    </svg>
                </div>
            )}
        </div>
    );
}
