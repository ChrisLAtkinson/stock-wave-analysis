"use client";

import { useState, useEffect } from 'react';
import { FileText, Clock } from 'lucide-react';

export default function SeekingAlphaFeed({ ticker }) {
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!ticker) return;
        setLoading(true);
        fetch(`/api/stock/${ticker}/articles`)
            .then(res => res.json())
            .then(data => {
                if (data.articles) setArticles(data.articles);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [ticker]);

    if (!ticker) return null;

    return (
        <div className="glass-panel" style={{ marginTop: '24px' }}>
            <h3 className="text-h3" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={20} style={{ color: '#f59e0b' }} /> Analyst Reports (SeekingAlpha)
            </h3>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
                    <div className="spinner" style={{ width: '24px', height: '24px', borderWidth: '2px' }}></div>
                </div>
            ) : articles.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {articles.map((art, idx) => (
                        <div key={idx} style={{
                            padding: '12px',
                            background: 'rgba(245, 158, 11, 0.05)',
                            borderLeft: '3px solid #f59e0b',
                            borderRadius: '0 8px 8px 0',
                            transition: 'background 0.2s',
                            cursor: 'pointer'
                        }}
                            onClick={() => window.open(art.link, '_blank')}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(245, 158, 11, 0.1)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(245, 158, 11, 0.05)'}
                        >
                            <h4 style={{ margin: '0 0 6px 0', fontSize: '0.95rem', color: 'var(--text-primary)', lineHeight: '1.4' }}>
                                {art.title}
                            </h4>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                                <span style={{ fontWeight: 600, color: '#fcd34d' }}>{art.author}</span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Clock size={12} /> {new Date(art.pubDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div style={{ padding: '20px', textAlign: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                    <span className="text-small" style={{ color: 'var(--text-secondary)' }}>No recent analyst articles found.</span>
                </div>
            )}
        </div>
    );
}
