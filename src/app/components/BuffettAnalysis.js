"use client";

import { Shield, CheckCircle, XCircle } from 'lucide-react';

export default function BuffettAnalysis({ buffett }) {
    if (!buffett) return null;

    return (
        <div style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <Shield size={24} style={{ color: 'var(--success)' }} />
                <h3 className="text-h3" style={{ margin: 0 }}>Buffett Value Investing Analysis</h3>
            </div>

            <p className="text-body" style={{ marginBottom: '20px' }}>
                Evaluates long-term hold potential based on Warren Buffett's principles: Economic Moat (ROE), Conservative Debt, High Profitability, and Margin of Safety.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                {buffett.metrics.map((m, i) => (
                    <div key={i} style={{
                        background: 'rgba(255,255,255,0.02)',
                        border: `1px solid ${m.passed ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                        borderRadius: '8px', padding: '16px'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <span style={{ fontWeight: 600 }}>{m.name}</span>
                            {m.passed ? <CheckCircle size={18} color="var(--success)" /> : <XCircle size={18} color="var(--danger)" />}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span className="text-small" style={{ color: 'var(--text-secondary)' }}>Current:</span>
                            <span style={{ fontWeight: 600, color: m.passed ? 'var(--success)' : 'var(--danger)' }}>{m.value}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span className="text-small" style={{ color: 'var(--text-secondary)' }}>Target:</span>
                            <span className="text-small">{m.target}</span>
                        </div>
                        <p className="text-small" style={{ color: 'var(--text-secondary)', marginTop: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px' }}>
                            {m.desc}
                        </p>
                    </div>
                ))}
            </div>

            <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <span className="text-small" style={{ color: 'var(--text-secondary)' }}>Intrinsic Value (Graham Number)</span>
                    <div className="text-h2" style={{ marginTop: '4px' }}>
                        ${buffett.grahamNumber.toFixed(2)}
                    </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <span className="text-small" style={{ color: 'var(--text-secondary)' }}>Value Investing Verdict</span>
                    <div className="text-h3" style={{
                        marginTop: '4px',
                        color: buffett.score >= 75 ? 'var(--success)' : (buffett.score >= 50 ? 'var(--warning)' : 'var(--danger)')
                    }}>
                        {buffett.verdict} ({buffett.score}/100)
                    </div>
                </div>
            </div>
        </div>
    );
}
