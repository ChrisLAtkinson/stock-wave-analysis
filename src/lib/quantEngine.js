/**
 * Fundamental Quant Scoring Engine
 *
 * Evaluates a stock across 5 pillars:
 *   1. Value        – Is it cheap relative to earnings/sales/book?
 *   2. Growth       – Is it growing revenue & earnings?
 *   3. Profitability – Is it generating good returns on capital?
 *   4. Financial Health – Is the balance sheet strong?
 *   5. Momentum     – Is price action/sentiment positive?
 *
 * Each pillar scores 0-100. Overall is the weighted average → mapped to a letter grade.
 */

// ─── Helper: clamp and normalize a value into a 0-100 score ───
// Ideal: value in [idealLow, idealHigh] → 80-100
// Acceptable: outside ideal but within bounds → 40-80
// Poor: outside bounds → 0-40
function scoreMetric(value, idealLow, idealHigh, poorLow, poorHigh) {
    if (value == null || isNaN(value)) return null;
    if (value >= idealLow && value <= idealHigh) {
        // Map linearly within ideal range to 80-100
        const pct = idealHigh === idealLow ? 1 : (value - idealLow) / (idealHigh - idealLow);
        return Math.round(80 + pct * 20);
    }
    if (value < idealLow) {
        if (value <= poorLow) return 0;
        const pct = (value - poorLow) / (idealLow - poorLow);
        return Math.round(pct * 80);
    }
    // value > idealHigh
    if (value >= poorHigh) return 0;
    const pct = 1 - (value - idealHigh) / (poorHigh - idealHigh);
    return Math.round(pct * 80);
}

// Inverse scoring: lower is better (e.g., P/E, debt ratios)
function scoreMetricInverse(value, idealLow, idealHigh, poorLow, poorHigh) {
    if (value == null || isNaN(value)) return null;
    if (value >= idealLow && value <= idealHigh) {
        const pct = idealHigh === idealLow ? 1 : 1 - (value - idealLow) / (idealHigh - idealLow);
        return Math.round(80 + pct * 20);
    }
    if (value < idealLow) {
        // Below ideal low is even better for inverse metrics
        return 100;
    }
    if (value >= poorHigh) return 0;
    const pct = 1 - (value - idealHigh) / (poorHigh - idealHigh);
    return Math.round(pct * 80);
}

function avg(scores) {
    const valid = scores.filter(s => s !== null && s !== undefined);
    if (valid.length === 0) return null;
    return Math.round(valid.reduce((a, b) => a + b, 0) / valid.length);
}

// ─── 1. VALUE SCORE ───
function computeValueScore(data) {
    const sd = data.summaryDetail || {};
    const ks = data.defaultKeyStatistics || {};

    const metrics = [
        {
            name: 'Trailing P/E',
            value: sd.trailingPE,
            score: scoreMetricInverse(sd.trailingPE, 8, 22, 0, 60),
            ideal: '8–22',
            unit: 'x'
        },
        {
            name: 'Forward P/E',
            value: sd.forwardPE,
            score: scoreMetricInverse(sd.forwardPE, 8, 20, 0, 50),
            ideal: '8–20',
            unit: 'x'
        },
        {
            name: 'Price/Book',
            value: ks.priceToBook,
            score: scoreMetricInverse(ks.priceToBook, 0.5, 3, 0, 15),
            ideal: '0.5–3',
            unit: 'x'
        },
        {
            name: 'Price/Sales',
            value: sd.priceToSalesTrailing12Months,
            score: scoreMetricInverse(sd.priceToSalesTrailing12Months, 0.5, 5, 0, 20),
            ideal: '0.5–5',
            unit: 'x'
        },
        {
            name: 'EV/EBITDA',
            value: ks.enterpriseToEbitda,
            score: scoreMetricInverse(ks.enterpriseToEbitda, 5, 15, 0, 40),
            ideal: '5–15',
            unit: 'x'
        },
        {
            name: 'PEG Ratio',
            value: ks.pegRatio,
            score: scoreMetricInverse(ks.pegRatio, 0.5, 1.5, 0, 5),
            ideal: '0.5–1.5',
            unit: 'x'
        }
    ];

    return {
        pillar: 'Value',
        score: avg(metrics.map(m => m.score)),
        metrics: metrics,
        description: 'How cheaply the stock is priced relative to its earnings, sales, and book value.'
    };
}

// ─── 2. GROWTH SCORE ───
function computeGrowthScore(data) {
    const fd = data.financialData || {};
    const ks = data.defaultKeyStatistics || {};

    const metrics = [
        {
            name: 'Revenue Growth',
            value: fd.revenueGrowth ? fd.revenueGrowth * 100 : null,
            score: scoreMetric(fd.revenueGrowth ? fd.revenueGrowth * 100 : null, 5, 30, -20, 80),
            ideal: '5–30%',
            unit: '%'
        },
        {
            name: 'Earnings Growth',
            value: fd.earningsGrowth ? fd.earningsGrowth * 100 : null,
            score: scoreMetric(fd.earningsGrowth ? fd.earningsGrowth * 100 : null, 5, 40, -50, 100),
            ideal: '5–40%',
            unit: '%'
        },
        {
            name: 'EPS (TTM)',
            value: ks.trailingEps,
            score: ks.trailingEps != null ? (ks.trailingEps > 0 ? Math.min(100, Math.round(50 + ks.trailingEps * 2)) : Math.max(0, Math.round(25 + ks.trailingEps * 5))) : null,
            ideal: '> $0',
            unit: '$'
        },
        {
            name: 'Forward EPS',
            value: ks.forwardEps,
            score: ks.forwardEps != null ? (ks.forwardEps > 0 ? Math.min(100, Math.round(50 + ks.forwardEps * 2)) : Math.max(0, Math.round(25 + ks.forwardEps * 5))) : null,
            ideal: '> $0',
            unit: '$'
        }
    ];

    return {
        pillar: 'Growth',
        score: avg(metrics.map(m => m.score)),
        metrics,
        description: 'How quickly the company is increasing its revenue and earnings.'
    };
}

// ─── 3. PROFITABILITY SCORE ───
function computeProfitabilityScore(data) {
    const fd = data.financialData || {};

    const metrics = [
        {
            name: 'Return on Equity',
            value: fd.returnOnEquity ? fd.returnOnEquity * 100 : null,
            score: scoreMetric(fd.returnOnEquity ? fd.returnOnEquity * 100 : null, 10, 30, -20, 60),
            ideal: '10–30%',
            unit: '%'
        },
        {
            name: 'Return on Assets',
            value: fd.returnOnAssets ? fd.returnOnAssets * 100 : null,
            score: scoreMetric(fd.returnOnAssets ? fd.returnOnAssets * 100 : null, 5, 20, -10, 40),
            ideal: '5–20%',
            unit: '%'
        },
        {
            name: 'Profit Margin',
            value: fd.profitMargins ? fd.profitMargins * 100 : null,
            score: scoreMetric(fd.profitMargins ? fd.profitMargins * 100 : null, 5, 25, -30, 50),
            ideal: '5–25%',
            unit: '%'
        },
        {
            name: 'Operating Margin',
            value: fd.operatingMargins ? fd.operatingMargins * 100 : null,
            score: scoreMetric(fd.operatingMargins ? fd.operatingMargins * 100 : null, 8, 30, -20, 50),
            ideal: '8–30%',
            unit: '%'
        },
        {
            name: 'Gross Margin',
            value: fd.grossMargins ? fd.grossMargins * 100 : null,
            score: scoreMetric(fd.grossMargins ? fd.grossMargins * 100 : null, 30, 60, 0, 90),
            ideal: '30–60%',
            unit: '%'
        }
    ];

    return {
        pillar: 'Profitability',
        score: avg(metrics.map(m => m.score)),
        metrics,
        description: 'How efficiently the company turns revenue into profit and shareholder returns.'
    };
}

// ─── 4. FINANCIAL HEALTH SCORE ───
function computeFinancialHealthScore(data) {
    const fd = data.financialData || {};
    const ks = data.defaultKeyStatistics || {};

    const debtToEquity = fd.debtToEquity; // already a percentage in Yahoo
    const currentRatio = fd.currentRatio;
    const quickRatio = fd.quickRatio;

    const metrics = [
        {
            name: 'Debt/Equity',
            value: debtToEquity,
            score: scoreMetricInverse(debtToEquity, 0, 80, -10, 250),
            ideal: '< 80%',
            unit: '%'
        },
        {
            name: 'Current Ratio',
            value: currentRatio,
            score: scoreMetric(currentRatio, 1.2, 3.0, 0.3, 8),
            ideal: '1.2–3.0',
            unit: 'x'
        },
        {
            name: 'Quick Ratio',
            value: quickRatio,
            score: scoreMetric(quickRatio, 1.0, 2.5, 0.2, 6),
            ideal: '1.0–2.5',
            unit: 'x'
        },
        {
            name: 'Free Cash Flow',
            value: fd.freeCashflow,
            score: fd.freeCashflow != null ? (fd.freeCashflow > 0 ? Math.min(100, 60 + Math.round(Math.log10(Math.max(1, fd.freeCashflow / 1e6)) * 8)) : 15) : null,
            ideal: '> $0',
            unit: '$'
        }
    ];

    return {
        pillar: 'Financial Health',
        score: avg(metrics.map(m => m.score)),
        metrics,
        description: 'Balance sheet strength — low leverage, good liquidity, and positive cash flow.'
    };
}

// ─── 5. MOMENTUM SCORE ───
function computeMomentumScore(data) {
    const quote = data.quote || {};
    const sd = data.summaryDetail || {};

    // Price performance
    const currentPrice = quote.regularMarketPrice || 0;
    const week52High = sd.fiftyTwoWeekHigh || currentPrice;
    const week52Low = sd.fiftyTwoWeekLow || currentPrice;
    const fiftyDayMA = sd.fiftyDayAverage || currentPrice;
    const twoHundredDayMA = sd.twoHundredDayAverage || currentPrice;

    // % from 52-week high
    const pctFrom52High = week52High > 0 ? ((currentPrice - week52High) / week52High) * 100 : 0;
    // % from 52-week low
    const pctFrom52Low = week52Low > 0 ? ((currentPrice - week52Low) / week52Low) * 100 : 0;
    // % above/below 50-day MA
    const pctVs50MA = fiftyDayMA > 0 ? ((currentPrice - fiftyDayMA) / fiftyDayMA) * 100 : 0;
    // % above/below 200-day MA
    const pctVs200MA = twoHundredDayMA > 0 ? ((currentPrice - twoHundredDayMA) / twoHundredDayMA) * 100 : 0;

    const metrics = [
        {
            name: 'vs 52W High',
            value: pctFrom52High,
            score: scoreMetric(pctFrom52High, -15, 0, -60, 10),
            ideal: '-15% to 0%',
            unit: '%'
        },
        {
            name: 'vs 52W Low',
            value: pctFrom52Low,
            score: scoreMetric(pctFrom52Low, 10, 80, -10, 200),
            ideal: '10–80%',
            unit: '%'
        },
        {
            name: 'vs 50-Day MA',
            value: pctVs50MA,
            score: scoreMetric(pctVs50MA, -5, 10, -30, 30),
            ideal: '-5% to +10%',
            unit: '%'
        },
        {
            name: 'vs 200-Day MA',
            value: pctVs200MA,
            score: scoreMetric(pctVs200MA, 0, 20, -40, 50),
            ideal: '0% to +20%',
            unit: '%'
        }
    ];

    return {
        pillar: 'Momentum',
        score: avg(metrics.map(m => m.score)),
        metrics,
        description: 'Price trend strength relative to moving averages and the 52-week range.'
    };
}

// ─── OVERALL COMPOSITE ───

const PILLAR_WEIGHTS = {
    Value: 0.25,
    Growth: 0.20,
    Profitability: 0.20,
    'Financial Health': 0.15,
    Momentum: 0.20
};

function letterGrade(score) {
    if (score >= 90) return 'A+';
    if (score >= 85) return 'A';
    if (score >= 80) return 'A-';
    if (score >= 75) return 'B+';
    if (score >= 70) return 'B';
    if (score >= 65) return 'B-';
    if (score >= 60) return 'C+';
    if (score >= 55) return 'C';
    if (score >= 50) return 'C-';
    if (score >= 45) return 'D+';
    if (score >= 40) return 'D';
    if (score >= 35) return 'D-';
    return 'F';
}

function gradeColor(grade) {
    if (grade.startsWith('A')) return '#10b981';
    if (grade.startsWith('B')) return '#3b82f6';
    if (grade.startsWith('C')) return '#f59e0b';
    if (grade.startsWith('D')) return '#f97316';
    return '#ef4444';
}

/**
 * Run the full quant analysis.
 * @param {object} data — merged Yahoo Finance data (quote + quoteSummary modules)
 * @returns quant scorecard
 */
export function analyzeQuant(data) {
    const pillars = [
        computeValueScore(data),
        computeGrowthScore(data),
        computeProfitabilityScore(data),
        computeFinancialHealthScore(data),
        computeMomentumScore(data)
    ];

    // Weighted composite
    let totalWeight = 0;
    let weightedSum = 0;
    for (const p of pillars) {
        if (p.score !== null) {
            const w = PILLAR_WEIGHTS[p.pillar] || 0.2;
            weightedSum += p.score * w;
            totalWeight += w;
        }
    }
    const compositeScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : null;
    const grade = compositeScore !== null ? letterGrade(compositeScore) : 'N/A';

    return {
        compositeScore,
        grade,
        gradeColor: gradeColor(grade),
        pillars,
        weights: PILLAR_WEIGHTS
    };
}
