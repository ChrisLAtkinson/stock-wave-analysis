"use client";

import { DollarSign, Star, Compass, Target } from 'lucide-react';

export default function FairValuePanel({ valuation }) {
    if (!valuation) return null;

    const formatPrice = (price) => {
        if (!price && price !== 0) return 'N/A';
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);
    };

    const confColor = (pct) => {
        if (pct >= 5) return 'var(--success)';
        if (pct <= -5) return 'var(--danger)';
        return 'var(--warning)';
    };

    const renderStars = (count, color) => {
        const stars = [];
        for (let i = 0; i < 5; i++) {
            stars.push(
                <Star
                    key={i}
                    size={16}
                    fill={i < count ? color : 'transparent'}
                    color={i < count ? color : 'rgba(255,255,255,0.2)'}
                />
            );
        }
        return <div style={{ display: 'flex', gap: '2px' }}>{stars}</div>;
    };

    return (
        <div style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                <Target size={24} style={{ color: '#38bdf8' }} />
                <h3 className="text-h3" style={{ margin: 0 }}>Institutional Fair Value Models</h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>

                {/* CFRA Rating */}
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: 'var(--text-secondary)' }}>
                        <Compass size={16} /> <span className="text-small" style={{ fontWeight: 600, letterSpacing: '0.05em' }}>CFRA RATING</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span className="text-h3">{valuation.cfra.label}</span>
                    </div>
                    {renderStars(valuation.cfra.stars, '#f59e0b')}
                    <p className="text-small" style={{ color: 'var(--text-secondary)', marginTop: '8px', lineHeight: '1.4' }}>
                        Quantitative equity rating based on trailing fundamental momentum and valuation ratios.
                    </p>
                </div>

                {/* Morningstar Fair Value Estimate */}
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: 'var(--text-secondary)' }}>
                            <Star size={16} /> <span className="text-small" style={{ fontWeight: 600, letterSpacing: '0.05em' }}>MSTAR FAIR VALUE</span>
                        </div>
                        {renderStars(valuation.morningstar.stars, '#facc15')}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '8px' }}>
                        <span className="text-h2" style={{ color: 'var(--text-primary)' }}>{formatPrice(valuation.morningstar.fairValue)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span className="text-small" style={{ color: 'var(--text-secondary)' }}>Moat Premium</span>
                        <span className="text-small" style={{ fontWeight: 600 }}>{valuation.morningstar.moat}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span className="text-small" style={{ color: 'var(--text-secondary)' }}>Implied Upside</span>
                        <span className="text-small" style={{
                            fontWeight: 600,
                            color: confColor(valuation.morningstar.upside)
                        }}>
                            {valuation.morningstar.upside >= 0 ? '+' : ''}{valuation.morningstar.upside.toFixed(2)}%
                        </span>
                    </div>
                </div>

                {/* DCF Analysis */}
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: 'var(--text-secondary)' }}>
                        <DollarSign size={16} /> <span className="text-small" style={{ fontWeight: 600, letterSpacing: '0.05em' }}>DCF MODEL (5YR)</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '8px' }}>
                        <span className="text-h2" style={{ color: 'var(--text-primary)' }}>{formatPrice(valuation.dcf.fairValue)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span className="text-small" style={{ color: 'var(--text-secondary)' }}>Current Price</span>
                        <span className="text-small">{formatPrice(valuation.currentPrice)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span className="text-small" style={{ color: 'var(--text-secondary)' }}>Model Upside</span>
                        <span className="text-small" style={{
                            fontWeight: 600,
                            color: confColor(valuation.dcf.upside)
                        }}>
                            {valuation.dcf.upside >= 0 ? '+' : ''}{valuation.dcf.upside.toFixed(2)}%
                        </span>
                    </div>
                </div>

            </div>
        </div>
    );
}
