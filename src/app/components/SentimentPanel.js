"use client";

import { Newspaper, MessageCircle, TrendingUp, TrendingDown, ArrowRight, ExternalLink } from 'lucide-react';

const LABEL_CONFIG = {
    very_bullish: { text: 'Very Bullish', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' },
    bullish: { text: 'Bullish', color: '#34d399', bg: 'rgba(52, 211, 153, 0.10)' },
    neutral: { text: 'Neutral', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.10)' },
    bearish: { text: 'Bearish', color: '#f87171', bg: 'rgba(248, 113, 113, 0.10)' },
    very_bearish: { text: 'Very Bearish', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)' }
};

function SentimentGauge({ score, label }) {
    const cfg = LABEL_CONFIG[label] || LABEL_CONFIG.neutral;
    // score ranges from -100 to +100, map to 0-100% for the gauge
    const pct = Math.round((score + 100) / 2);

    return (
        <div className="sentiment-gauge-container">
            <div className="sentiment-gauge-track">
                <div className="sentiment-gauge-fill" style={{
                    width: `${pct}%`,
                    background: `linear-gradient(90deg, #ef4444, #f59e0b, #10b981)`,
                }} />
                <div className="sentiment-gauge-needle" style={{ left: `${pct}%` }} />
            </div>
            <div className="sentiment-gauge-labels">
                <span style={{ color: '#ef4444', fontSize: '0.75rem' }}>Bearish</span>
                <span className="sentiment-gauge-badge" style={{ color: cfg.color, background: cfg.bg }}>
                    {cfg.text}
                </span>
                <span style={{ color: '#10b981', fontSize: '0.75rem' }}>Bullish</span>
            </div>
        </div>
    );
}

/**
 * SentimentPanel — News + Social Sentiment Display
 *
 * Props:
 *  - sentiment: { news, earnings, social, narrative }
 */
export default function SentimentPanel({ sentiment }) {
    if (!sentiment) return null;

    const { news, social, narrative } = sentiment;

    return (
        <div className="sentiment-panel">
            <div className="sentiment-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Newspaper size={22} style={{ color: 'var(--accent)' }} />
                    <h3 className="text-h3">Sentiment & News Analysis</h3>
                </div>
            </div>

            {/* Sentiment Overview Row */}
            <div className="sentiment-overview">
                {/* News Sentiment Gauge */}
                <div className="sentiment-card">
                    <div className="sentiment-card-header">
                        <Newspaper size={16} /> <span>News Sentiment</span>
                        <span className="text-small" style={{ marginLeft: 'auto' }}>{news?.totalArticles || 0} articles</span>
                    </div>
                    <SentimentGauge score={news?.overallScore || 0} label={news?.overallLabel || 'neutral'} />
                    <div className="sentiment-breakdown">
                        <span style={{ color: 'var(--success)' }}>🟢 {news?.bullishCount || 0} Bullish</span>
                        <span style={{ color: 'var(--text-secondary)' }}>⚪ {news?.neutralCount || 0} Neutral</span>
                        <span style={{ color: 'var(--danger)' }}>🔴 {news?.bearishCount || 0} Bearish</span>
                    </div>
                </div>

                {/* StockTwits Social Sentiment */}
                <div className="sentiment-card">
                    <div className="sentiment-card-header">
                        <MessageCircle size={16} /> <span>{social ? 'StockTwits' : 'Social'} Sentiment</span>
                        {social && <span className="text-small" style={{ marginLeft: 'auto' }}>{social.sampleSize} posts</span>}
                    </div>
                    {social && social.total > 0 ? (
                        <>
                            <div className="social-sentiment-bar">
                                <div className="social-bull-bar" style={{ width: `${social.bullishPct}%` }}>
                                    {social.bullishPct}% 🐂
                                </div>
                                <div className="social-bear-bar" style={{ width: `${100 - social.bullishPct}%` }}>
                                    {100 - social.bullishPct}% 🐻
                                </div>
                            </div>
                            <div className="sentiment-breakdown">
                                <span style={{ color: 'var(--success)' }}>🟢 {social.bullish} Bullish</span>
                                <span style={{ color: 'var(--danger)' }}>🔴 {social.bearish} Bearish</span>
                            </div>
                        </>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            Social sentiment data unavailable
                        </div>
                    )}
                </div>
            </div>

            {/* Bull / Bear Narrative */}
            {narrative && (
                <div className="sentiment-narratives">
                    <div className="theme-card theme-card-bull">
                        <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--success)', marginBottom: '12px' }}>
                            <TrendingUp size={18} /> Bull Case (News-Driven)
                        </h4>
                        <p className="text-body" style={{ fontSize: '0.9rem', lineHeight: '1.7' }}>{narrative.bullCase}</p>
                        {news?.bullishThemes?.length > 0 && (
                            <div className="sentiment-themes">
                                {news.bullishThemes.map((t, i) => (
                                    <span key={i} className="sentiment-theme-tag bullish">{t.theme}</span>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="theme-card theme-card-bear">
                        <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--danger)', marginBottom: '12px' }}>
                            <TrendingDown size={18} /> Bear Case (News-Driven)
                        </h4>
                        <p className="text-body" style={{ fontSize: '0.9rem', lineHeight: '1.7' }}>{narrative.bearCase}</p>
                        {news?.bearishThemes?.length > 0 && (
                            <div className="sentiment-themes">
                                {news.bearishThemes.map((t, i) => (
                                    <span key={i} className="sentiment-theme-tag bearish">{t.theme}</span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Recent Headlines */}
            {news?.headlines?.length > 0 && (
                <div className="sentiment-headlines">
                    <h4 className="text-h3" style={{ marginBottom: '12px', fontSize: '1rem' }}>Recent Headlines</h4>
                    <div className="headline-list">
                        {news.headlines.slice(0, 8).map((h, i) => {
                            const cfg = LABEL_CONFIG[h.label] || LABEL_CONFIG.neutral;
                            return (
                                <div key={i} className="headline-item">
                                    <span className="headline-sentiment-dot" style={{ background: cfg.color }} />
                                    <div className="headline-content">
                                        <span className="headline-title">{h.title}</span>
                                        <div className="headline-meta">
                                            <span>{h.publisher}</span>
                                            {h.publishedAt && <span>• {h.publishedAt}</span>}
                                        </div>
                                    </div>
                                    <span className="headline-score" style={{ color: cfg.color }}>
                                        {h.score > 0 ? '+' : ''}{h.score}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
