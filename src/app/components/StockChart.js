"use client";

import { useEffect, useRef } from 'react';
import { createChart, LineSeries, CandlestickSeries } from 'lightweight-charts';

/**
 * Interactive Stock Chart with Elliott Wave overlays.
 *
 * Props:
 *  - historical: Array<{time, open, high, low, close}>
 *  - structuralPoints: Array<{time, price, waveLabel}>
 *  - projections: Array<{wave, label, target, pctChange, isMajor}> 
 *  - isBull: boolean
 *  - invalidationLevel: number
 *  - pivots: Array<{time, price, type}>
 *  - currentPrice: number
 */
export default function StockChart({
    historical = [],
    structuralPoints = [],
    projections = [],
    isBull = true,
    invalidationLevel,
    pivots = [],
    currentPrice
}) {
    const chartContainerRef = useRef(null);
    const chartRef = useRef(null);

    useEffect(() => {
        if (!chartContainerRef.current || historical.length === 0) return;

        // Clean up previous chart
        if (chartRef.current) {
            chartRef.current.remove();
            chartRef.current = null;
        }

        const container = chartContainerRef.current;

        const chart = createChart(container, {
            width: container.clientWidth,
            height: 420,
            layout: {
                background: { color: 'transparent' },
                textColor: '#94a3b8',
                fontFamily: "'Inter', sans-serif",
                fontSize: 12,
            },
            grid: {
                vertLines: { color: 'rgba(255, 255, 255, 0.03)' },
                horzLines: { color: 'rgba(255, 255, 255, 0.03)' },
            },
            crosshair: {
                mode: 0,
                vertLine: { color: 'rgba(59, 130, 246, 0.3)', labelBackgroundColor: '#3b82f6' },
                horzLine: { color: 'rgba(59, 130, 246, 0.3)', labelBackgroundColor: '#3b82f6' },
            },
            rightPriceScale: {
                borderColor: 'rgba(255, 255, 255, 0.08)',
                scaleMargins: { top: 0.1, bottom: 0.15 },
            },
            timeScale: {
                borderColor: 'rgba(255, 255, 255, 0.08)',
                timeVisible: false,
                rightOffset: 20,
            },
            handleScroll: { vertTouchDrag: false },
        });

        chartRef.current = chart;

        // ── Candlestick Series ──
        const candleSeries = chart.addSeries(CandlestickSeries, {
            upColor: '#10b981',
            downColor: '#ef4444',
            borderUpColor: '#10b981',
            borderDownColor: '#ef4444',
            wickUpColor: '#10b981',
            wickDownColor: '#ef4444',
        });
        candleSeries.setData(historical);

        // ── Structural Wave Markers (v5 plugin API) ──
        if (structuralPoints.length > 0) {
            const markers = structuralPoints
                .filter(sp => sp.time)
                .map(sp => {
                    // Position impulse wave peaks above, troughs below
                    const isAbove = isBull
                        ? (sp.waveLabel === '1' || sp.waveLabel === '3' || sp.waveLabel === '5')
                        : (sp.waveLabel === '0' || sp.waveLabel === '2' || sp.waveLabel === '4');
                    return {
                        time: sp.time,
                        position: isAbove ? 'aboveBar' : 'belowBar',
                        color: sp.waveLabel === '0' ? '#64748b' : (isBull ? '#3b82f6' : '#f59e0b'),
                        shape: 'circle',
                        text: sp.waveLabel,
                        size: 2,
                    };
                })
                .sort((a, b) => a.time.localeCompare(b.time));

            if (markers.length > 0) {
                try {
                    // Lightweight Charts v5 uses createSeriesMarkers on the chart
                    chart.createSeriesMarkers(candleSeries, markers);
                } catch (e) {
                    // Fallback: try the v4 API
                    try { candleSeries.setMarkers(markers); } catch (e2) { /* Ignore marker errors */ }
                }
            }
        }

        // ── ZigZag Line (connecting pivots) ──
        if (pivots.length >= 2) {
            const zigzagSeries = chart.addSeries(LineSeries, {
                color: 'rgba(59, 130, 246, 0.4)',
                lineWidth: 1,
                lineStyle: 2,
                crosshairMarkerVisible: false,
                lastValueVisible: false,
                priceLineVisible: false,
            });
            const zigzagData = pivots
                .filter(p => p.time)
                .map(p => ({ time: p.time, value: p.price }))
                .sort((a, b) => a.time.localeCompare(b.time));

            // Deduplicate by time (keep last entry for each time)
            const dedupZigzag = [];
            for (const d of zigzagData) {
                if (dedupZigzag.length > 0 && dedupZigzag[dedupZigzag.length - 1].time === d.time) {
                    dedupZigzag[dedupZigzag.length - 1] = d;
                } else {
                    dedupZigzag.push(d);
                }
            }
            if (dedupZigzag.length >= 2) {
                zigzagSeries.setData(dedupZigzag);
            }
        }

        // ── Invalidation Level ──
        if (invalidationLevel && invalidationLevel > 0) {
            const invalidationLine = {
                price: invalidationLevel,
                color: '#64748b',
                lineWidth: 1,
                lineStyle: 0,
                axisLabelVisible: true,
                title: 'Invalidation',
            };
            candleSeries.createPriceLine(invalidationLine);
        }

        // ── Projection Target Lines ──
        if (projections.length > 0) {
            const majorProjections = projections.filter(p => p.isMajor);
            majorProjections.forEach((proj) => {
                const isUpTarget = proj.target > currentPrice;
                candleSeries.createPriceLine({
                    price: proj.target,
                    color: isUpTarget ? 'rgba(16, 185, 129, 0.6)' : 'rgba(239, 68, 68, 0.5)',
                    lineWidth: 1,
                    lineStyle: 2,
                    axisLabelVisible: true,
                    title: `${proj.fibRatio} (${proj.target.toFixed(2)})`,
                });
            });
        }

        // ── Resize handler ──
        const handleResize = () => {
            if (chartRef.current && container) {
                chartRef.current.applyOptions({ width: container.clientWidth });
            }
        };
        window.addEventListener('resize', handleResize);

        // Fit content
        chart.timeScale().fitContent();

        return () => {
            window.removeEventListener('resize', handleResize);
            if (chartRef.current) {
                chartRef.current.remove();
                chartRef.current = null;
            }
        };
    }, [historical, structuralPoints, projections, isBull, invalidationLevel, pivots, currentPrice]);

    return (
        <div
            ref={chartContainerRef}
            style={{
                width: '100%',
                height: '420px',
                borderRadius: '12px',
                overflow: 'hidden',
                background: 'rgba(0, 0, 0, 0.2)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
            }}
        />
    );
}
