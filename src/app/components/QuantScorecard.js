"use client";

import { Shield, TrendingUp, DollarSign, BarChart3, Heart, Zap } from 'lucide-react';

const PILLAR_ICONS = {
    Value: DollarSign,
    Growth: TrendingUp,
    Profitability: BarChart3,
    'Financial Health': Heart,
    Momentum: Zap
};

const PILLAR_COLORS = {
    Value: '#3b82f6',
    Growth: '#10b981',
    Profitability: '#8b5cf6',
    'Financial Health': '#f59e0b',
    Momentum: '#ef4444'
};

// ── SVG Radar Chart ──
function RadarChart({ pillars }) {
    const size = 240;
    const center = size / 2;
    const radius = 90;
    const levels = 5;
    const angleStep = (2 * Math.PI) / pillars.length;

    // Build polygon points for the data
    const dataPoints = pillars.map((p, i) => {
        const score = (p.score || 0) / 100;
        const angle = i * angleStep - Math.PI / 2;
        return {
            x: center + radius * score * Math.cos(angle),
            y: center + radius * score * Math.sin(angle)
        };
    });
    const dataPath = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';

    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block', margin: '0 auto' }}>
            {/* Background grid */}
            {Array.from({ length: levels }, (_, l) => {
                const r = radius * ((l + 1) / levels);
                const points = pillars.map((_, i) => {
                    const angle = i * angleStep - Math.PI / 2;
                    return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
                }).join(' ');
                return <polygon key={l} points={points} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />;
            })}

            {/* Axis lines */}
            {pillars.map((_, i) => {
                const angle = i * angleStep - Math.PI / 2;
                return (
                    <line
                        key={i}
                        x1={center}
                        y1={center}
                        x2={center + radius * Math.cos(angle)}
                        y2={center + radius * Math.sin(angle)}
                        stroke="rgba(255,255,255,0.06)"
                        strokeWidth="1"
                    />
                );
            })}

            {/* Data area */}
            <path d={dataPath} fill="rgba(59, 130, 246, 0.15)" stroke="#3b82f6" strokeWidth="2" />

            {/* Data points */}
            {dataPoints.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r="4" fill={PILLAR_COLORS[pillars[i].pillar] || '#3b82f6'} stroke="#0a0f18" strokeWidth="2" />
            ))}

            {/* Labels */}
            {pillars.map((p, i) => {
                const angle = i * angleStep - Math.PI / 2;
                const labelR = radius + 28;
                const x = center + labelR * Math.cos(angle);
                const y = center + labelR * Math.sin(angle);
                return (
                    <text
                        key={i}
                        x={x}
                        y={y}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill={PILLAR_COLORS[p.pillar] || '#94a3b8'}
                        fontSize="11"
                        fontWeight="600"
                        fontFamily="Inter, sans-serif"
                    >
                        {p.pillar}
                    </text>
                );
            })}
        </svg>
    );
}

// ── Score Bar ──
function ScoreBar({ score, color }) {
    return (
        <div style={{ height: '6px', width: '100%', background: 'rgba(255,255,255,0.06)', borderRadius: '99px', overflow: 'hidden' }}>
            <div style={{
                height: '100%',
                width: `${score || 0}%`,
                background: color,
                borderRadius: '99px',
                transition: 'width 0.6s ease'
            }} />
        </div>
    );
}

// ── Metric Row ──
function MetricRow({ metric }) {
    const val = metric.value;
    const displayVal = val == null ? 'N/A' :
        metric.unit === '%' ? `${val.toFixed(1)}%` :
            metric.unit === '$' ? (Math.abs(val) >= 1e9 ? `$${(val / 1e9).toFixed(1)}B` : Math.abs(val) >= 1e6 ? `$${(val / 1e6).toFixed(1)}M` : `$${val.toFixed(2)}`) :
                `${val.toFixed(2)}${metric.unit}`;

    const scoreColor = metric.score == null ? 'var(--text-secondary)' :
        metric.score >= 70 ? 'var(--success)' :
            metric.score >= 40 ? 'var(--warning)' : 'var(--danger)';

    return (
        <div className="metric-row">
            <span className="metric-name">{metric.name}</span>
            <span className="metric-ideal">{metric.ideal}</span>
            <span className="metric-value">{displayVal}</span>
            <span className="metric-score" style={{ color: scoreColor }}>{metric.score ?? '–'}</span>
        </div>
    );
}

/**
 * QuantScorecard Component
 *
 * Props:
 *  - quant: { compositeScore, grade, gradeColor, pillars: [...], weights }
 */
export default function QuantScorecard({ quant }) {
    if (!quant || !quant.pillars) return null;

    return (
        <div className="quant-scorecard">
            {/* Header with grade */}
            <div className="quant-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Shield size={22} style={{ color: 'var(--accent)' }} />
                    <h3 className="text-h3">Quant Scorecard</h3>
                </div>
                <div className="quant-grade-badge" style={{ borderColor: quant.gradeColor, color: quant.gradeColor }}>
                    <span className="quant-grade-letter">{quant.grade}</span>
                    <span className="quant-grade-score">{quant.compositeScore}/100</span>
                </div>
            </div>

            {/* Radar Chart + Pillar Summary */}
            <div className="quant-overview">
                <div className="quant-radar">
                    <RadarChart pillars={quant.pillars} />
                </div>
                <div className="quant-pillar-list">
                    {quant.pillars.map((p, i) => {
                        const Icon = PILLAR_ICONS[p.pillar] || Shield;
                        const color = PILLAR_COLORS[p.pillar] || '#3b82f6';
                        return (
                            <div key={i} className="quant-pillar-row">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '140px' }}>
                                    <Icon size={16} style={{ color }} />
                                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{p.pillar}</span>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <ScoreBar score={p.score} color={color} />
                                </div>
                                <span style={{ fontWeight: 700, fontSize: '0.9rem', minWidth: '36px', textAlign: 'right', color }}>{p.score ?? '–'}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Detailed Metrics per Pillar */}
            <div className="quant-details">
                {quant.pillars.map((p, i) => {
                    const Icon = PILLAR_ICONS[p.pillar] || Shield;
                    const color = PILLAR_COLORS[p.pillar] || '#3b82f6';
                    return (
                        <div key={i} className="quant-detail-card">
                            <div className="quant-detail-header">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Icon size={16} style={{ color }} />
                                    <span style={{ fontWeight: 600 }}>{p.pillar}</span>
                                </div>
                                <span style={{ fontWeight: 700, color }}>{p.score ?? '–'}/100</span>
                            </div>
                            <p className="text-small" style={{ marginBottom: '12px', lineHeight: '1.5' }}>{p.description}</p>
                            <div className="metric-table">
                                <div className="metric-row metric-row-header">
                                    <span className="metric-name">Metric</span>
                                    <span className="metric-ideal">Ideal</span>
                                    <span className="metric-value">Actual</span>
                                    <span className="metric-score">Score</span>
                                </div>
                                {p.metrics.map((m, j) => (
                                    <MetricRow key={j} metric={m} />
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
