"use client";

import { BarChart2, Activity, TrendingUp, AlertTriangle } from 'lucide-react';

export default function TechnicalAnalysisPanel({ technicals }) {
    if (!technicals) return null;

    const { indicators, signals, summary } = technicals;

    const summaryColor = summary.includes('Buy') ? 'var(--success)' :
        summary.includes('Sell') ? 'var(--danger)' : 'var(--warning)';

    return (
        <div style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <BarChart2 size={24} style={{ color: 'var(--accent)' }} />
                    <h3 className="text-h3" style={{ margin: 0 }}>Technical Analysis</h3>
                </div>
                <div style={{
                    padding: '6px 16px',
                    borderRadius: '8px',
                    background: summaryColor.replace('var(', 'rgba(').replace(')', ', 0.15)'),
                    color: summaryColor,
                    fontWeight: 700,
                    fontSize: '1rem',
                    letterSpacing: '0.05em',
                    border: `1px solid ${summaryColor.replace('var(', 'rgba(').replace(')', ', 0.3)')}`
                }}>
                    {summary.toUpperCase()}
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>

                {/* Moving Averages */}
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: 'var(--text-secondary)' }}>
                        <TrendingUp size={16} /> <span className="text-small" style={{ fontWeight: 600, letterSpacing: '0.05em' }}>TREND (MAs)</span>
                    </div>
                    <div className="metric-table">
                        <div className="metric-row">
                            <span className="metric-name">SMA (20)</span>
                            <span className="metric-value">{indicators.sma20?.toFixed(2) || 'N/A'}</span>
                        </div>
                        <div className="metric-row">
                            <span className="metric-name">SMA (50)</span>
                            <span className="metric-value">{indicators.sma50?.toFixed(2) || 'N/A'}</span>
                        </div>
                        <div className="metric-row">
                            <span className="metric-name">SMA (200)</span>
                            <span className="metric-value">{indicators.sma200?.toFixed(2) || 'N/A'}</span>
                        </div>
                        <div className="metric-row" style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                            <span className="metric-name" style={{ color: 'var(--text-secondary)' }}>Signal</span>
                            <span className="metric-value" style={{
                                color: signals.trend === 'Bullish' ? 'var(--success)' : 'var(--danger)'
                            }}>{signals.trend}</span>
                        </div>
                    </div>
                </div>

                {/* Relative Strength Index */}
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: 'var(--text-secondary)' }}>
                        <Activity size={16} /> <span className="text-small" style={{ fontWeight: 600, letterSpacing: '0.05em' }}>MOMENTUM (RSI)</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '8px' }}>
                        <span className="text-h2" style={{ color: 'var(--text-primary)' }}>{indicators.rsi14?.toFixed(1) || 'N/A'}</span>
                    </div>
                    <div className="progress-bar" style={{ marginBottom: '16px' }}>
                        <div className="progress-fill" style={{
                            width: `${Math.min(100, Math.max(0, indicators.rsi14 || 50))}%`,
                            background: indicators.rsi14 > 70 ? 'var(--danger)' : indicators.rsi14 < 30 ? 'var(--success)' : 'var(--warning)'
                        }}></div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="metric-name" style={{ color: 'var(--text-secondary)' }}>Signal</span>
                        <span className="metric-value" style={{
                            color: signals.momentum === 'Overbought' ? 'var(--danger)' : signals.momentum === 'Oversold' ? 'var(--success)' : 'var(--text-primary)'
                        }}>{signals.momentum}</span>
                    </div>
                </div>

                {/* Volatility / Bollinger Bands */}
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: 'var(--text-secondary)' }}>
                        <AlertTriangle size={16} /> <span className="text-small" style={{ fontWeight: 600, letterSpacing: '0.05em' }}>VOLATILITY (BB)</span>
                    </div>
                    <div className="metric-table">
                        <div className="metric-row">
                            <span className="metric-name">Upper Band</span>
                            <span className="metric-value">{indicators.bbUpper?.toFixed(2) || 'N/A'}</span>
                        </div>
                        <div className="metric-row">
                            <span className="metric-name">Mid Band (20)</span>
                            <span className="metric-value">{indicators.sma20?.toFixed(2) || 'N/A'}</span>
                        </div>
                        <div className="metric-row">
                            <span className="metric-name">Lower Band</span>
                            <span className="metric-value">{indicators.bbLower?.toFixed(2) || 'N/A'}</span>
                        </div>
                        <div className="metric-row" style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                            <span className="metric-name" style={{ color: 'var(--text-secondary)' }}>Signal</span>
                            <span className="metric-value" style={{
                                color: signals.volatility === 'Within Bands' ? 'var(--text-primary)' : 'var(--warning)'
                            }}>{signals.volatility}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
