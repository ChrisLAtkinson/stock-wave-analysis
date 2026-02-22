import yahooFinanceRaw from 'yahoo-finance2';
import { NextResponse } from 'next/server';
import { analyzeQuant } from '@/lib/quantEngine';

const YF = yahooFinanceRaw.default || yahooFinanceRaw;
const yahooFinance = typeof YF === 'function' ? new YF() : YF;

export async function GET(request, { params }) {
  const { ticker } = await params;
  if (!ticker) {
    return NextResponse.json({ error: 'Ticker is required' }, { status: 400 });
  }

  try {
    const quoteSummary = await yahooFinance.quoteSummary(ticker, {
      modules: [
        'summaryDetail',
        'financialData',
        'defaultKeyStatistics',
        'earningsTrend',
        'incomeStatementHistory',
      ]
    }).catch(() => null);

    const quote = await yahooFinance.quote(ticker).catch(() => null);

    if (!quote) {
      return NextResponse.json({ error: 'Failed to fetch quote for ' + ticker }, { status: 404 });
    }

    // Run Quant Analysis
    const quantData = {
      quote,
      summaryDetail: quoteSummary?.summaryDetail || {},
      financialData: quoteSummary?.financialData || {},
      defaultKeyStatistics: quoteSummary?.defaultKeyStatistics || {},
    };

    const quant = analyzeQuant(quantData);

    return NextResponse.json({
      quote,
      summary: quoteSummary,
      quant
    });
  } catch (error) {
    console.error('Error fetching fundamentals:', error);
    return NextResponse.json({ error: 'Failed to fetch fundamentals' }, { status: 500 });
  }
}
