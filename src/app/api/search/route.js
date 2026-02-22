import yahooFinanceRaw from 'yahoo-finance2';
import { NextResponse } from 'next/server';

const YF = yahooFinanceRaw.default || yahooFinanceRaw;
const yahooFinance = typeof YF === 'function' ? new YF() : YF;

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');

    if (!q || q.length < 1) {
        return NextResponse.json([]);
    }

    try {
        const result = await yahooFinance.search(q, { newsCount: 0 });
        const quotes = (result.quotes || [])
            .filter(q => q.quoteType === 'EQUITY' && q.symbol)
            .slice(0, 8)
            .map(q => ({
                symbol: q.symbol,
                name: q.shortname || q.longname || q.symbol,
                exchange: q.exchange
            }));

        return NextResponse.json(quotes);
    } catch (error) {
        console.error('Search error:', error);
        return NextResponse.json([]);
    }
}
