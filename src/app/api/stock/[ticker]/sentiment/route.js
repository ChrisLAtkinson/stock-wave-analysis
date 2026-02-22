import yahooFinanceRaw from 'yahoo-finance2';
import { NextResponse } from 'next/server';
import { analyzeNewsSentiment, analyzeEarnings, generateSentimentNarrative } from '@/lib/sentimentEngine';

const YF = yahooFinanceRaw.default || yahooFinanceRaw;
const yahooFinance = typeof YF === 'function' ? new YF() : YF;

export async function GET(request, { params }) {
    const { ticker } = await params;
    if (!ticker) {
        return NextResponse.json({ error: 'Ticker is required' }, { status: 400 });
    }

    try {
        // Fetch news, earnings history, and quote data in parallel
        const [searchResult, quoteSummary] = await Promise.all([
            yahooFinance.search(ticker, { newsCount: 20 }).catch(() => null),
            yahooFinance.quoteSummary(ticker, {
                modules: ['earningsHistory', 'financialData', 'defaultKeyStatistics']
            }).catch(() => null)
        ]);

        // News sentiment
        const newsItems = searchResult?.news || [];
        const newsSentiment = analyzeNewsSentiment(newsItems);

        // Earnings analysis
        const earningsHist = quoteSummary?.earningsHistory?.history || [];
        const earnings = analyzeEarnings(earningsHist);

        // StockTwits sentiment (public API, no auth required)
        let socialSentiment = null;
        try {
            const stRes = await fetch(
                `https://api.stocktwits.com/api/2/streams/symbol/${ticker.toUpperCase()}.json`,
                { headers: { 'User-Agent': 'ElliottWavePredictor/1.0' }, signal: AbortSignal.timeout(5000) }
            );
            if (stRes.ok) {
                const stData = await stRes.json();
                const messages = stData.messages || [];
                const bullish = messages.filter(m => m.entities?.sentiment?.basic === 'Bullish').length;
                const bearish = messages.filter(m => m.entities?.sentiment?.basic === 'Bearish').length;
                const total = bullish + bearish;
                socialSentiment = {
                    source: 'StockTwits',
                    bullish,
                    bearish,
                    total,
                    bullishPct: total > 0 ? Math.round((bullish / total) * 100) : null,
                    sampleSize: messages.length,
                    recentMessages: messages.slice(0, 5).map(m => ({
                        body: m.body,
                        sentiment: m.entities?.sentiment?.basic || 'Neutral',
                        user: m.user?.username,
                        createdAt: m.created_at
                    }))
                };
            }
        } catch (e) {
            // StockTwits may be unavailable, not critical
        }

        // Generate narrative
        const quantGrade = quoteSummary?.defaultKeyStatistics ? 'available' : null;
        const narrative = generateSentimentNarrative(ticker.toUpperCase(), newsSentiment, earnings, { grade: quantGrade });

        return NextResponse.json({
            ticker: ticker.toUpperCase(),
            news: newsSentiment,
            earnings,
            social: socialSentiment,
            narrative
        });
    } catch (error) {
        console.error('Error fetching sentiment:', error);
        return NextResponse.json({ error: 'Failed to fetch sentiment data' }, { status: 500 });
    }
}
