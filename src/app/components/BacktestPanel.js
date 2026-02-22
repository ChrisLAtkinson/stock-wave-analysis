"use client";

import { useState, useEffect, useRef } from 'react';
import { createChart, LineSeries, AreaSeries } from 'lightweight-charts';
import { BarChart3, Clock, TrendingUp, TrendingDown, Target, Shield, Zap, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const PERIODS = [
    { key: '3m', label: '3 Months' },
    { key: '6m', label: '6 Months' },
    { key: '1y', label: '1 Year' },
    { key: '2y', label: '2 Years' },
    { key: '3y', label: '3 Years' },
    { key: '5y', label: '5 Years' },
];

function EquityCurveChart({ equityCurve }) {
    const containerRef = useRef(null);
    const chartRef = useRef(null);

    useEffect(() => {
        if (!containerRef.current || !equityCurve || equityCurve.length < 2) return;

        if (chartRef.current) {
            chartRef.current.remove();
            chartRef.current = null;
        }

        const chart = createChart(containerRef.current, {
            width: containerRef.current.clientWidth,
            height: 220,
            layout: {
                background: { color: 'transparent' },
                textColor: '#94a3b8',
                fontFamily: "'Inter', sans-serif",
                fontSize: 11,
            },
            grid: {
                vertLines: { color: 'rgba(255,255,255,0.02)' },
                horzLines: { color: 'rgba(255,255,255,0.02)' },
            },
            rightPriceScale: {
                borderColor: 'rgba(255,255,255,0.06)',
                scaleMargins: { top: 0.05, bottom: 0.05 },
            },
            timeScale: {
                borderColor: 'rgba(255,255,255,0.06)',
                timeVisible: false,
            },
            crosshair: {
                mode: 0,
                vertLine: { color: 'rgba(99,102,241,0.3)', labelBackgroundColor: '#6366f1' },
                horzLine: { color: 'rgba(99,102,241,0.3)', labelBackgroundColor: '#6366f1' },
            },
            handleScroll: { vertTouchDrag: false },
        });

        chartRef.current = chart;

        // Determine overall performance color
        const startVal = equityCurve[0].equity;
        const endVal = equityCurve[equityCurve.length - 1].equity;
        const isPositive = endVal >= startVal;

        const series = chart.addSeries(AreaSeries, {
            lineColor: isPositive ? '#10b981' : '#ef4444',
            topColor: isPositive ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)',
            bottomColor: isPositive ? 'rgba(16, 185, 129, 0.02)' : 'rgba(239, 68, 68, 0.02)',
            lineWidth: 2,
            crosshairMarkerVisible: true,
            lastValueVisible: true,
            priceLineVisible: false,
        });

        // Add baseline at starting equity
        series.createPriceLine({
            price: startVal,
            color: 'rgba(148, 163, 184, 0.3)',
            lineWidth: 1,
            lineStyle: 2,
            axisLabelVisible: false,
            title: 'Start',
        });

        series.setData(equityCurve.map(e => ({ time: e.time, value: e.equity })));
        chart.timeScale().fitContent();

        const handleResize = () => {
            if (chartRef.current && containerRef.current) {
                chartRef.current.applyOptions({ width: containerRef.current.clientWidth });
            }
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            if (chartRef.current) {
                chartRef.current.remove();
                chartRef.current = null;
            }
        };
    }, [equityCurve]);

    return (
        <div
            ref={containerRef}
            style={{
                width: '100%',
                height: '220px',
                borderRadius: '10px',
                overflow: 'hidden',
                background: 'rgba(0,0,0,0.15)',
                border: '1px solid rgba(255,255,255,0.04)',
            }}
        />
    );
}

export default function BacktestPanel({ ticker }) {
    const [period, setPeriod] = useState('1y');
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [showAllTrades, setShowAllTrades] = useState(false);

    useEffect(() => {
        if (!ticker) return;
        fetchBacktest(period);
    }, [ticker, period]);

    const fetchBacktest = async (p) => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`/api/stock/${ticker}/backtest?period=${p}`);
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Backtest failed');
            }
            const result = await res.json();
            setData(result);
        } catch (err) {
            setError(err.message);
            setData(null);
        } finally {
            setLoading(false);
        }
    };

    const formatDollar = (v) => {
        if (v == null) return '—';
        return v >= 0 ? `$${v.toLocaleString()}` : `-$${Math.abs(v).toLocaleString()}`;
    };

    const formatPct = (v) => {
        if (v == null) return '—';
        const sign = v >= 0 ? '+' : '';
        return `${sign}${v.toFixed(2)}%`;
    };

    return (
        <div className="backtest-panel">
            {/* Header */}
            <div className="backtest-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <BarChart3 size={20} style={{ color: '#6366f1' }} />
                    <h3 className="text-h3">RSI(2) Mean-Reversion Backtest</h3>
                </div>
                <div className="backtest-strategy-badge">
                    <Zap size={12} /> Long when RSI(2) &lt; 10 &amp; Price &gt; 200 SMA
                </div>
            </div>

            {/* Strategy Rules */}
            <div className="backtest-rules">
                <div className="backtest-rule">
                    <Shield size={14} />
                    <span>Only trade <strong>LONG</strong> above 200-day MA</span>
                </div>
                <div className="backtest-rule">
                    <ArrowDownRight size={14} style={{ color: 'var(--success)' }} />
                    <span><strong>BUY</strong> when RSI(2) &lt; 10 (oversold)</span>
                </div>
                <div className="backtest-rule">
                    <ArrowUpRight size={14} style={{ color: 'var(--danger)' }} />
                    <span><strong>EXIT</strong> when RSI(2) &gt; 90 or after 10 days</span>
                </div>
            </div>

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
                    Running backtest for {PERIODS.find(p => p.key === period)?.label}...
                </div>
            )}

            {error && (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--danger)', fontSize: '0.9rem' }}>
                    {error}
                </div>
            )}

            {data && !loading && (
                <>
                    {/* Performance Stats Grid */}
                    <div className="backtest-stats-grid">
                        <div className="backtest-stat-card highlight">
                            <div className="backtest-stat-label">Strategy Return</div>
                            <div
                                className="backtest-stat-value"
                                style={{ color: data.stats.totalReturnPct >= 0 ? 'var(--success)' : 'var(--danger)' }}
                            >
                                {formatPct(data.stats.totalReturnPct)}
                            </div>
                            <div className="backtest-stat-sub">{formatDollar(data.stats.totalReturn)} P&L</div>
                        </div>

                        <div className="backtest-stat-card">
                            <div className="backtest-stat-label">Buy & Hold Return</div>
                            <div
                                className="backtest-stat-value"
                                style={{ color: data.stats.buyHoldReturn >= 0 ? 'var(--success)' : 'var(--danger)' }}
                            >
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
                            <div className="backtest-stat-value" style={{ color: 'var(--success)' }}>
                                {formatPct(data.stats.avgWinPct)}
                            </div>
                        </div>

                        <div className="backtest-stat-card">
                            <div className="backtest-stat-label">Avg Loss</div>
                            <div className="backtest-stat-value" style={{ color: 'var(--danger)' }}>
                                {formatPct(data.stats.avgLossPct)}
                            </div>
                        </div>

                        <div className="backtest-stat-card">
                            <div className="backtest-stat-label">Max Drawdown</div>
                            <div className="backtest-stat-value" style={{ color: 'var(--danger)' }}>
                                {formatPct(-data.stats.maxDrawdown)}
                            </div>
                        </div>

                        <div className="backtest-stat-card">
                            <div className="backtest-stat-label">
                                {data.stats.totalReturnPct > data.stats.buyHoldReturn ? 'Alpha' : 'Underperformance'}
                            </div>
                            <div
                                className="backtest-stat-value"
                                style={{ color: data.stats.totalReturnPct > data.stats.buyHoldReturn ? '#6366f1' : 'var(--danger)' }}
                            >
                                {formatPct(data.stats.totalReturnPct - data.stats.buyHoldReturn)}
                            </div>
                        </div>
                    </div>

                    {/* Equity Curve */}
                    {data.equityCurve && data.equityCurve.length > 2 && (
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                <TrendingUp size={16} style={{ color: '#6366f1' }} />
                                <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>Equity Curve</span>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginLeft: 'auto' }}>
                                    $10,000 starting capital
                                </span>
                            </div>
                            <EquityCurveChart equityCurve={data.equityCurve} />
                        </div>
                    )}

                    {/* Trade Log */}
                    {data.trades && data.trades.length > 0 && (
                        <div className="backtest-trade-log">
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Clock size={16} style={{ color: '#6366f1' }} />
                                    <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>Trade Log</span>
                                </div>
                                {data.trades.length > 5 && (
                                    <button
                                        className="backtest-period-btn"
                                        onClick={() => setShowAllTrades(!showAllTrades)}
                                        style={{ fontSize: '0.8rem', padding: '4px 12px' }}
                                    >
                                        {showAllTrades ? 'Show Less' : `Show All (${data.trades.length})`}
                                    </button>
                                )}
                            </div>
                            <div className="backtest-table-wrapper">
                                <table className="backtest-table">
                                    <thead>
                                        <tr>
                                            <th>Entry</th>
                                            <th>Exit</th>
                                            <th>Entry $</th>
                                            <th>Exit $</th>
                                            <th>Days</th>
                                            <th>P&L</th>
                                            <th>Return</th>
                                            <th>Reason</th>
                                        </tr>
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
                                                <td>
                                                    <span className={`trade-reason ${t.exitReason.includes('RSI') ? 'rsi' : 'time'}`}>
                                                        {t.exitReason}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {data.trades && data.trades.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>
                            No trades triggered during this period. The RSI(2) strategy requires price above the 200-day MA along with an oversold RSI reading — conditions that weren't met.
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
