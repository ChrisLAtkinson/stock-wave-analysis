"use client";

import { useState, useEffect, useRef } from 'react';
import { createChart, AreaSeries } from 'lightweight-charts';
import { BarChart3, Clock, TrendingUp, Shield, Zap, ArrowUpRight, ArrowDownRight, ChevronDown } from 'lucide-react';

const STRATEGIES = [
    { id: 'rsi2', name: 'RSI(2) Mean Reversion', icon: '📉', color: '#6366f1' },
    { id: 'goldenCross', name: 'Golden Cross / Death Cross', icon: '✨', color: '#f59e0b' },
    { id: 'macdCrossover', name: 'MACD Crossover', icon: '📊', color: '#10b981' },
    { id: 'bollingerBounce', name: 'Bollinger Band Bounce', icon: '🎯', color: '#ec4899' },
    { id: 'breakout', name: 'Donchian Breakout (Turtle)', icon: '🚀', color: '#3b82f6' },
];

const PERIODS = [
    { key: '3m', label: '3M' },
    { key: '6m', label: '6M' },
    { key: '1y', label: '1Y' },
    { key: '2y', label: '2Y' },
    { key: '3y', label: '3Y' },
    { key: '5y', label: '5Y' },
];

const RULE_ICONS = {
    shield: <Shield size={14} />,
    entry: <ArrowDownRight size={14} style={{ color: 'var(--success)' }} />,
    exit: <ArrowUpRight size={14} style={{ color: 'var(--danger)' }} />,
};

function EquityCurveChart({ equityCurve }) {
    const containerRef = useRef(null);
    const chartRef = useRef(null);

    useEffect(() => {
        if (!containerRef.current || !equityCurve || equityCurve.length < 2) return;
        if (chartRef.current) { chartRef.current.remove(); chartRef.current = null; }

        const chart = createChart(containerRef.current, {
            width: containerRef.current.clientWidth,
            height: 200,
            layout: { background: { color: 'transparent' }, textColor: '#94a3b8', fontFamily: "'Inter', sans-serif", fontSize: 11 },
            grid: { vertLines: { color: 'rgba(255,255,255,0.02)' }, horzLines: { color: 'rgba(255,255,255,0.02)' } },
            rightPriceScale: { borderColor: 'rgba(255,255,255,0.06)', scaleMargins: { top: 0.05, bottom: 0.05 } },
            timeScale: { borderColor: 'rgba(255,255,255,0.06)', timeVisible: false },
            crosshair: { mode: 0, vertLine: { color: 'rgba(99,102,241,0.3)', labelBackgroundColor: '#6366f1' }, horzLine: { color: 'rgba(99,102,241,0.3)', labelBackgroundColor: '#6366f1' } },
            handleScroll: { vertTouchDrag: false },
        });
        chartRef.current = chart;

        const startVal = equityCurve[0].equity;
        const endVal = equityCurve[equityCurve.length - 1].equity;
        const isPositive = endVal >= startVal;

        const series = chart.addSeries(AreaSeries, {
            lineColor: isPositive ? '#10b981' : '#ef4444',
            topColor: isPositive ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)',
            bottomColor: isPositive ? 'rgba(16,185,129,0.02)' : 'rgba(239,68,68,0.02)',
            lineWidth: 2, crosshairMarkerVisible: true, lastValueVisible: true, priceLineVisible: false,
        });
        series.createPriceLine({ price: startVal, color: 'rgba(148,163,184,0.3)', lineWidth: 1, lineStyle: 2, axisLabelVisible: false, title: '$10K' });
        series.setData(equityCurve.map(e => ({ time: e.time, value: e.equity })));
        chart.timeScale().fitContent();

        const handleResize = () => { if (chartRef.current && containerRef.current) chartRef.current.applyOptions({ width: containerRef.current.clientWidth }); };
        window.addEventListener('resize', handleResize);
        return () => { window.removeEventListener('resize', handleResize); if (chartRef.current) { chartRef.current.remove(); chartRef.current = null; } };
    }, [equityCurve]);

    return <div ref={containerRef} style={{ width: '100%', height: '200px', borderRadius: '10px', overflow: 'hidden', background: 'rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.04)' }} />;
}

export default function BacktestPanel({ ticker }) {
    const [strategy, setStrategy] = useState('rsi2');
    const [period, setPeriod] = useState('1y');
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [showAllTrades, setShowAllTrades] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);

    useEffect(() => {
        if (!ticker) return;
        fetchBacktest(strategy, period);
    }, [ticker, strategy, period]);

    const fetchBacktest = async (s, p) => {
        setLoading(true);
        setError('');
        setShowAllTrades(false);
        try {
            const res = await fetch(`/api/stock/${ticker}/backtest?period=${p}&strategy=${s}`);
            if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Backtest failed'); }
            setData(await res.json());
        } catch (err) { setError(err.message); setData(null); }
        finally { setLoading(false); }
    };

    const activeStrategy = STRATEGIES.find(s => s.id === strategy) || STRATEGIES[0];
    const formatDollar = (v) => v == null ? '—' : v >= 0 ? `$${v.toLocaleString()}` : `-$${Math.abs(v).toLocaleString()}`;
    const formatPct = (v) => v == null ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;

    return (
        <div className="backtest-panel">
            {/* Header with Strategy Selector */}
            <div className="backtest-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <BarChart3 size={20} style={{ color: activeStrategy.color }} />
                    <h3 className="text-h3">Strategy Backtest</h3>
                </div>
            </div>

            {/* Strategy Selector Cards */}
            <div className="strategy-selector">
                {STRATEGIES.map(s => (
                    <button
                        key={s.id}
                        className={`strategy-card ${strategy === s.id ? 'active' : ''}`}
                        onClick={() => setStrategy(s.id)}
                        style={{ '--strat-color': s.color }}
                        disabled={loading}
                    >
                        <span className="strategy-card-icon">{s.icon}</span>
                        <span className="strategy-card-name">{s.name}</span>
                    </button>
                ))}
            </div>

            {/* Strategy Rules */}
            {data?.strategy?.rules && (
                <div className="backtest-rules">
                    {data.strategy.rules.map((rule, i) => (
                        <div key={i} className="backtest-rule">
                            {RULE_ICONS[rule.icon] || <Shield size={14} />}
                            <span dangerouslySetInnerHTML={{ __html: rule.text.replace(/\b(BUY|SELL|EXIT|LONG)\b/g, '<strong>$1</strong>') }} />
                        </div>
                    ))}
                </div>
            )}

            {/* Period Selector */}
            <div className="backtest-periods">
                {PERIODS.map(p => (
                    <button
                        key={p.key}
                        className={`backtest-period-btn ${period === p.key ? 'active' : ''}`}
                        onClick={() => setPeriod(p.key)}
                        disabled={loading}
                    >
                        {p.label}
                    </button>
                ))}
            </div>

            {loading && (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                    <div className="spinner" style={{ margin: '0 auto 12px' }} />
                    Running {activeStrategy.name} backtest...
                </div>
            )}

            {error && (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--danger)', fontSize: '0.9rem' }}>{error}</div>
            )}

            {data && !loading && (
                <>
                    {/* Performance Stats Grid */}
                    <div className="backtest-stats-grid">
                        <div className="backtest-stat-card highlight" style={{ '--strat-color': activeStrategy.color }}>
                            <div className="backtest-stat-label">Strategy Return</div>
                            <div className="backtest-stat-value" style={{ color: data.stats.totalReturnPct >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                                {formatPct(data.stats.totalReturnPct)}
                            </div>
                            <div className="backtest-stat-sub">{formatDollar(data.stats.totalReturn)} P&L</div>
                        </div>

                        <div className="backtest-stat-card">
                            <div className="backtest-stat-label">Buy & Hold</div>
                            <div className="backtest-stat-value" style={{ color: data.stats.buyHoldReturn >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                                {formatPct(data.stats.buyHoldReturn)}
                            </div>
                            <div className="backtest-stat-sub">Benchmark</div>
                        </div>

                        <div className="backtest-stat-card">
                            <div className="backtest-stat-label">Win Rate</div>
                            <div className="backtest-stat-value" style={{ color: data.stats.winRate >= 60 ? 'var(--success)' : data.stats.winRate >= 40 ? 'var(--accent)' : 'var(--danger)' }}>
                                {data.stats.winRate}%
                            </div>
                            <div className="backtest-stat-sub">{data.stats.winners}W / {data.stats.losers}L</div>
                        </div>

                        <div className="backtest-stat-card">
                            <div className="backtest-stat-label">Total Trades</div>
                            <div className="backtest-stat-value">{data.stats.totalTrades}</div>
                            <div className="backtest-stat-sub">Avg {data.stats.avgHoldDays}d hold</div>
                        </div>

                        <div className="backtest-stat-card">
                            <div className="backtest-stat-label">Avg Win</div>
                            <div className="backtest-stat-value" style={{ color: 'var(--success)' }}>{formatPct(data.stats.avgWinPct)}</div>
                        </div>

                        <div className="backtest-stat-card">
                            <div className="backtest-stat-label">Avg Loss</div>
                            <div className="backtest-stat-value" style={{ color: 'var(--danger)' }}>{formatPct(data.stats.avgLossPct)}</div>
                        </div>

                        <div className="backtest-stat-card">
                            <div className="backtest-stat-label">Max Drawdown</div>
                            <div className="backtest-stat-value" style={{ color: 'var(--danger)' }}>{formatPct(-data.stats.maxDrawdown)}</div>
                        </div>

                        <div className="backtest-stat-card">
                            <div className="backtest-stat-label">{data.stats.totalReturnPct > data.stats.buyHoldReturn ? 'Alpha' : 'Underperformance'}</div>
                            <div className="backtest-stat-value" style={{ color: data.stats.totalReturnPct > data.stats.buyHoldReturn ? activeStrategy.color : 'var(--danger)' }}>
                                {formatPct(data.stats.totalReturnPct - data.stats.buyHoldReturn)}
                            </div>
                        </div>
                    </div>

                    {/* Equity Curve */}
                    {data.equityCurve?.length > 2 && (
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                <TrendingUp size={16} style={{ color: activeStrategy.color }} />
                                <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>Equity Curve</span>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginLeft: 'auto' }}>$10,000 starting capital</span>
                            </div>
                            <EquityCurveChart equityCurve={data.equityCurve} />
                        </div>
                    )}

                    {/* Trade Log */}
                    {data.trades?.length > 0 && (
                        <div className="backtest-trade-log">
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Clock size={16} style={{ color: activeStrategy.color }} />
                                    <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>Trade Log</span>
                                </div>
                                {data.trades.length > 5 && (
                                    <button className="backtest-period-btn" onClick={() => setShowAllTrades(!showAllTrades)} style={{ fontSize: '0.8rem', padding: '4px 12px' }}>
                                        {showAllTrades ? 'Show Less' : `Show All (${data.trades.length})`}
                                    </button>
                                )}
                            </div>
                            <div className="backtest-table-wrapper">
                                <table className="backtest-table">
                                    <thead>
                                        <tr><th>Entry</th><th>Exit</th><th>Entry $</th><th>Exit $</th><th>Days</th><th>P&L</th><th>Return</th><th>Reason</th></tr>
                                    </thead>
                                    <tbody>
                                        {(showAllTrades ? data.trades : data.trades.slice(-5)).map((t, i) => (
                                            <tr key={i} className={t.pnl >= 0 ? 'trade-win' : 'trade-loss'}>
                                                <td>{t.entryDate}</td>
                                                <td>{t.exitDate}</td>
                                                <td>${t.entryPrice.toFixed(2)}</td>
                                                <td>${t.exitPrice.toFixed(2)}</td>
                                                <td>{t.holdDays}d</td>
                                                <td style={{ color: t.pnl >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
                                                    {t.pnl >= 0 ? '+' : ''}{formatDollar(t.pnl)}
                                                </td>
                                                <td style={{ color: t.pnlPct >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
                                                    {formatPct(t.pnlPct)}
                                                </td>
                                                <td><span className={`trade-reason ${t.exitReason.toLowerCase().includes('cross') || t.exitReason.toLowerCase().includes('rsi') || t.exitReason.toLowerCase().includes('band') || t.exitReason.toLowerCase().includes('breakout') || t.exitReason.toLowerCase().includes('macd') || t.exitReason.toLowerCase().includes('break') ? 'rsi' : 'time'}`}>{t.exitReason}</span></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {data.trades?.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>
                            No trades triggered during this period. Try a longer timeframe or different strategy.
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
