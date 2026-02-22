"use client";

import { TrendingUp, TrendingDown, Minus, Award, AlertTriangle } from 'lucide-react';

/**
 * EarningsTracker — Visual beat/miss timeline
 *
 * Props:
 *  - earnings: { quarters, beatRate, avgSurprise, streak }
 */
export default function EarningsTracker({ earnings }) {
    if (!earnings || !earnings.quarters || earnings.quarters.length === 0) return null;

    const { quarters, beatRate, avgSurprise, streak } = earnings;

    return (
        <div className="earnings-tracker">
            {/* Summary Stats */}
            <div className="earnings-summary">
                <div className="earnings-stat">
                    <Award size={18} style={{ color: beatRate >= 75 ? 'var(--success)' : beatRate >= 50 ? 'var(--warning)' : 'var(--danger)' }} />
                    <div>
                        <span className="earnings-stat-value" style={{ color: beatRate >= 75 ? 'var(--success)' : beatRate >= 50 ? 'var(--warning)' : 'var(--danger)' }}>
                            {beatRate !== null ? `${beatRate}%` : 'N/A'}
                        </span>
                        <span className="earnings-stat-label">Beat Rate</span>
                    </div>
                </div>
                <div className="earnings-stat">
                    <TrendingUp size={18} style={{ color: avgSurprise > 0 ? 'var(--success)' : 'var(--danger)' }} />
                    <div>
                        <span className="earnings-stat-value" style={{ color: avgSurprise > 0 ? 'var(--success)' : 'var(--danger)' }}>
                            {avgSurprise !== null ? `${avgSurprise > 0 ? '+' : ''}${avgSurprise}%` : 'N/A'}
                        </span>
                        <span className="earnings-stat-label">Avg Surprise</span>
                    </div>
                </div>
                {streak && (
                    <div className="earnings-stat">
                        {streak.type === 'beat' ? <TrendingUp size={18} style={{ color: 'var(--success)' }} /> : <TrendingDown size={18} style={{ color: 'var(--danger)' }} />}
                        <div>
                            <span className="earnings-stat-value" style={{ color: streak.type === 'beat' ? 'var(--success)' : 'var(--danger)' }}>
                                {streak.count}x {streak.type === 'beat' ? 'Beat' : streak.type === 'miss' ? 'Miss' : 'Met'}
                            </span>
                            <span className="earnings-stat-label">Current Streak</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Quarter Timeline */}
            <div className="earnings-timeline">
                {quarters.map((q, i) => (
                    <div key={i} className={`earnings-quarter ${q.result}`}>
                        <div className="earnings-quarter-header">
                            <span className="earnings-quarter-label">{q.quarter}</span>
                            <span className={`earnings-result-badge ${q.result}`}>
                                {q.result === 'beat' ? <TrendingUp size={12} /> : q.result === 'miss' ? <TrendingDown size={12} /> : <Minus size={12} />}
                                {q.result.toUpperCase()}
                            </span>
                        </div>
                        <div className="earnings-quarter-data">
                            <div className="earnings-eps-row">
                                <span className="text-small">Estimate</span>
                                <span style={{ fontWeight: 600 }}>{q.estimate !== null ? `$${q.estimate.toFixed(2)}` : 'N/A'}</span>
                            </div>
                            <div className="earnings-eps-row">
                                <span className="text-small">Actual</span>
                                <span style={{ fontWeight: 700, color: q.result === 'beat' ? 'var(--success)' : q.result === 'miss' ? 'var(--danger)' : 'var(--text-primary)' }}>
                                    {q.actual !== null ? `$${q.actual.toFixed(2)}` : 'N/A'}
                                </span>
                            </div>
                            {q.surprisePct !== null && (
                                <div className="earnings-eps-row">
                                    <span className="text-small">Surprise</span>
                                    <span style={{ fontWeight: 600, color: q.surprisePct >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                                        {q.surprisePct >= 0 ? '+' : ''}{q.surprisePct}%
                                    </span>
                                </div>
                            )}
                        </div>
                        {/* Visual bar */}
                        <div className="earnings-surprise-bar">
                            <div
                                className="earnings-surprise-fill"
                                style={{
                                    width: `${Math.min(100, Math.abs(q.surprisePct || 0) * 2 + 10)}%`,
                                    background: q.result === 'beat' ? 'var(--success)' : q.result === 'miss' ? 'var(--danger)' : 'var(--text-secondary)'
                                }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
