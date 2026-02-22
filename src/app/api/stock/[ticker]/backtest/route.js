import yahooFinanceRaw from 'yahoo-finance2';
import { runBacktest } from '@/lib/backtestEngine';

const YF = yahooFinanceRaw.default || yahooFinanceRaw;
const yahooFinance = typeof YF === 'function' ? new YF() : YF;

export async function GET(request, { params }) {
    try {
        const { ticker } = await params;
        const { searchParams } = new URL(request.url);
        const period = searchParams.get('period') || '1y';

        // Map period to date range — need extra 200 days for SMA warmup
        const periodMap = {
            '3m': 90 + 250,
            '6m': 180 + 250,
            '1y': 365 + 250,
            '2y': 730 + 250,
            '3y': 1095 + 250,
            '5y': 1825 + 250,
        };

        const totalDays = periodMap[period] || periodMap['1y'];
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - totalDays);
        const endDate = new Date();

        const historical = await yahooFinance.historical(ticker.toUpperCase(), {
            period1: startDate,
            period2: endDate,
        }).catch(() => []);

        if (!historical || historical.length < 210) {
            return Response.json(
                { error: 'Insufficient historical data for backtest (need 200+ trading days for SMA).' },
                { status: 400 }
            );
        }

        // Convert to candles
        const candles = historical
            .filter(h => h.close != null && h.open != null)
            .map(h => ({
                time: new Date(h.date).toISOString().split('T')[0],
                open: h.open,
                high: h.high,
                low: h.low,
                close: h.close,
            }))
            .sort((a, b) => a.time.localeCompare(b.time));

        // Trim candles to only the requested analysis period (after SMA warmup)
        const analysisStart = new Date();
        const periodDaysMap = { '3m': 90, '6m': 180, '1y': 365, '2y': 730, '3y': 1095, '5y': 1825 };
        analysisStart.setDate(analysisStart.getDate() - (periodDaysMap[period] || 365));
        const analysisStartStr = analysisStart.toISOString().split('T')[0];

        const result = runBacktest(candles, {});

        // Filter equity curve and trades to the analysis window
        const filteredEquity = result.equityCurve.filter(e => e.time >= analysisStartStr);
        const filteredTrades = result.trades.filter(t => t.entryDate >= analysisStartStr);

        // Recalculate stats for filtered trades
        const winners = filteredTrades.filter(t => t.pnl > 0);
        const losers = filteredTrades.filter(t => t.pnl <= 0);
        const totalPnl = filteredTrades.reduce((s, t) => s + t.pnl, 0);
        const avgWin = winners.length > 0 ? winners.reduce((s, t) => s + t.pnlPct, 0) / winners.length : 0;
        const avgLoss = losers.length > 0 ? losers.reduce((s, t) => s + t.pnlPct, 0) / losers.length : 0;
        const avgHold = filteredTrades.length > 0 ? filteredTrades.reduce((s, t) => s + t.holdDays, 0) / filteredTrades.length : 0;

        // Buy & hold for the analysis period
        const firstEquity = filteredEquity.length > 0 ? filteredEquity[0].equity : result.params.initialCapital;
        const lastEquity = filteredEquity.length > 0 ? filteredEquity[filteredEquity.length - 1].equity : firstEquity;
        const strategyReturn = ((lastEquity - firstEquity) / firstEquity) * 100;

        // Find buy & hold for same period
        const analysisCandles = candles.filter(c => c.time >= analysisStartStr);
        const bhReturn = analysisCandles.length >= 2
            ? ((analysisCandles[analysisCandles.length - 1].close - analysisCandles[0].close) / analysisCandles[0].close) * 100
            : 0;

        return Response.json({
            period,
            ticker: ticker.toUpperCase(),
            params: result.params,
            stats: {
                totalTrades: filteredTrades.length,
                winners: winners.length,
                losers: losers.length,
                winRate: filteredTrades.length > 0 ? Math.round((winners.length / filteredTrades.length) * 100) : 0,
                totalReturn: Math.round(totalPnl * 100) / 100,
                totalReturnPct: Math.round(strategyReturn * 100) / 100,
                avgWinPct: Math.round(avgWin * 100) / 100,
                avgLossPct: Math.round(avgLoss * 100) / 100,
                maxDrawdown: result.stats.maxDrawdown,
                avgHoldDays: Math.round(avgHold * 10) / 10,
                buyHoldReturn: Math.round(bhReturn * 100) / 100,
            },
            trades: filteredTrades.slice(-20), // last 20 trades
            equityCurve: filteredEquity,
        });
    } catch (err) {
        console.error('Backtest error:', err);
        return Response.json({ error: 'Backtest failed: ' + err.message }, { status: 500 });
    }
}
