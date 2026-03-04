"use client";

import { useState, useEffect } from 'react';
import { MessageSquare, Clock, Heart, Repeat2 } from 'lucide-react';

export default function StockTwitsFeed({ ticker }) {
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!ticker) return;

        setLoading(true);
        fetch(`/api/stock/${ticker}/social`)
            .then(res => res.json())
            .then(data => {
                if (data.messages) {
                    setMessages(data.messages);
                }
            })
            .catch(console.error)
            .finally(() => setLoading(false));

        // Poll every 30 seconds for live updates
        const interval = setInterval(() => {
            fetch(`/api/stock/${ticker}/social`)
                .then(res => res.json())
                .then(data => {
                    if (data.messages) {
                        setMessages(data.messages);
                    }
                })
                .catch(console.error);
        }, 30000);

        return () => clearInterval(interval);
    }, [ticker]);

    if (!ticker) return null;

    // Helper to format the time ago
    const timeAgo = (dateStr) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffSeconds = Math.floor((now - date) / 1000);

        if (diffSeconds < 60) return `${diffSeconds}s`;
        if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m`;
        if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h`;
        return `${Math.floor(diffSeconds / 86400)}d`;
    };

    // Helper to format body text and highlight cashtags (e.g., $AAPL)
    const formatBody = (text) => {
        if (!text) return "";
        // Basic regex to highlight tickers
        const parts = text.split(/(\$[A-Za-z]+)/g);
        return parts.map((part, i) => {
            if (part.startsWith('$')) {
                return <span key={i} style={{ color: 'var(--accent)', fontWeight: 600 }}>{part}</span>;
            }
            return <span key={i}>{part}</span>;
        });
    };

    return (
        <div className="glass-panel feed-panel">
            <h3 className="text-h3" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                <MessageSquare size={20} style={{ color: '#3b82f6' }} /> Sentiment Stream
            </h3>

            <div
                style={{
                    flex: 1,
                    overflowY: 'auto',
                    borderRadius: '8px',
                    background: 'rgba(0,0,0,0.15)',
                    display: 'flex',
                    flexDirection: 'column'
                }}
            >
                {loading && messages.length === 0 ? (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', flexGrow: 1 }}>
                        <div className="spinner" style={{ width: '24px', height: '24px', borderWidth: '2px' }}></div>
                    </div>
                ) : messages.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {messages.map((msg) => (
                            <div key={msg.id} style={{
                                padding: '16px',
                                borderBottom: '1px solid rgba(255,255,255,0.05)',
                                transition: 'background 0.2s',
                            }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    {/* Avatar */}
                                    <div style={{ flexShrink: 0 }}>
                                        <img
                                            src={msg.user?.avatar_url || 'https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png'}
                                            alt={msg.user?.username}
                                            style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }}
                                        />
                                    </div>

                                    {/* Content */}
                                    <div style={{ flexGrow: 1 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{msg.user?.name}</span>
                                                <span className="text-small" style={{ color: 'var(--text-secondary)' }}>@{msg.user?.username}</span>
                                            </div>
                                            <span className="text-small" style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Clock size={12} /> {timeAgo(msg.created_at)}
                                            </span>
                                        </div>

                                        <p className="text-body" style={{ fontSize: '0.9rem', lineHeight: '1.5', margin: '4px 0 10px 0', color: '#e2e8f0', wordBreak: 'break-word' }}>
                                            {formatBody(msg.body)}
                                        </p>

                                        {msg.entities?.sentiment && (
                                            <span style={{
                                                display: 'inline-block',
                                                padding: '2px 8px',
                                                borderRadius: '4px',
                                                fontSize: '0.75rem',
                                                fontWeight: 600,
                                                marginBottom: '8px',
                                                background: msg.entities.sentiment.basic === 'Bearish' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                                color: msg.entities.sentiment.basic === 'Bearish' ? 'var(--danger)' : 'var(--success)'
                                            }}>
                                                {msg.entities.sentiment.basic}
                                            </span>
                                        )}

                                        {/* Actions */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: 'var(--text-secondary)' }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}>
                                                <Heart size={14} /> {msg.likes ? msg.likes.total : 0}
                                            </span>
                                            {msg.reshare_message && (
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}>
                                                    <Repeat2 size={14} /> Re-shares
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div style={{ padding: '20px', textAlign: 'center', opacity: 0.6 }}>
                        No social stream available.
                    </div>
                )}
            </div>
        </div>
    );
}
