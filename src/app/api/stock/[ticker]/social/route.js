import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
    const { ticker } = await params;
    if (!ticker) {
        return NextResponse.json({ error: 'Ticker is required' }, { status: 400 });
    }

    try {
        const response = await fetch(`https://api.stocktwits.com/api/2/streams/symbol/${ticker}.json`);

        if (!response.ok) {
            return NextResponse.json({ error: 'Failed to fetch social feed' }, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json({ messages: data.messages || [] });

    } catch (error) {
        console.error('StockTwits fetch error:', error);
        return NextResponse.json({ error: 'Failed to fetch social' }, { status: 500 });
    }
}
