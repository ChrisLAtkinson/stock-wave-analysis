import yahooFinanceRaw from 'yahoo-finance2';
import { NextResponse } from 'next/server';
import { analyzeElliottWaves } from '@/lib/elliottWaveEngine';

const YF = yahooFinanceRaw.default || yahooFinanceRaw;
const yahooFinance = typeof YF === 'function' ? new YF() : YF;

export async function GET(request, { params }) {
    const { ticker } = await params;
    if (!ticker) {
        return NextResponse.json({ error: 'Ticker is required' }, { status: 400 });
    }

    try {
        // Fetch 1 year of historical data
        const endDate = new Date();
        const startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 1);

        const historical = await yahooFinance.historical(ticker, {
            period1: startDate,
            period2: endDate
        }).catch(() => []);

        if (!historical || historical.length === 0) {
            return NextResponse.json({ error: 'No historical data found for ' + ticker }, { status: 404 });
        }

        // Convert to standard OHLC format
        const candles = historical.map(h => ({
            time: h.date instanceof Date
                ? h.date.toISOString().split('T')[0]
                : String(h.date).split('T')[0],
            open: h.open,
            high: h.high,
            low: h.low,
            close: h.close,
            volume: h.volume
        }));

        // Run the Elliott Wave analysis engine
        const analysis = analyzeElliottWaves(candles);

        if (analysis.error) {
            return NextResponse.json({
                ticker: ticker.toUpperCase(),
                error: analysis.error,
                historical: candles
            });
        }

        return NextResponse.json({
            ticker: ticker.toUpperCase(),
            ...analysis,
            historical: candles
        });
    } catch (error) {
        console.error('Error fetching analysis:', error);
        return NextResponse.json({ error: 'Failed to fetch analysis: ' + error.message }, { status: 500 });
    }
}
