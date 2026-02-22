/**
 * Sentiment Analysis Engine
 *
 * Provides:
 *  1. News headline sentiment scoring (keyword + pattern based)
 *  2. Earnings surprise analysis (beat/miss history)
 *  3. Aggregated bull/bear narrative generation
 */

// ─── Sentiment Keyword Dictionaries ───

const BULLISH_STRONG = [
    'surge', 'soar', 'skyrocket', 'breakout', 'record high', 'all-time high',
    'massive growth', 'blowout', 'crushes', 'smashes', 'beats expectations',
    'upgrade', 'outperform', 'buy rating', 'strong buy', 'bullish',
    'accelerating', 'exceeds', 'raises guidance', 'upside surprise',
    'blockbuster', 'exceptional', 'outstanding', 'triple', 'double',
    'breakthrough', 'dominant', 'leadership', 'momentum'
];

const BULLISH_MILD = [
    'gains', 'rises', 'climbs', 'advances', 'higher', 'up', 'positive',
    'growth', 'profit', 'revenue beat', 'strong quarter', 'optimistic',
    'confident', 'expands', 'innovation', 'partnership', 'deal',
    'recovery', 'rebound', 'improving', 'opportunity', 'demand',
    'increased', 'upbeat', 'favorable', 'benefit', 'boost'
];

const BEARISH_STRONG = [
    'crash', 'plunge', 'collapse', 'plummet', 'tank', 'freefall',
    'bankruptcy', 'default', 'fraud', 'scandal', 'investigation',
    'downgrade', 'sell rating', 'underperform', 'bearish',
    'miss expectations', 'disappointing', 'warns', 'slashes guidance',
    'massive loss', 'layoffs', 'restructuring', 'delisting'
];

const BEARISH_MILD = [
    'falls', 'drops', 'declines', 'slips', 'lower', 'down', 'negative',
    'loss', 'misses', 'weak', 'concerns', 'risks', 'uncertainty',
    'slowdown', 'headwinds', 'pressure', 'challenge', 'volatile',
    'overvalued', 'expensive', 'caution', 'worry', 'fear',
    'lawsuit', 'regulation', 'competition', 'debt', 'dilution'
];

/**
 * Score a single headline for sentiment.
 * Returns { score: -100..+100, label: 'very_bullish'|'bullish'|'neutral'|'bearish'|'very_bearish' }
 */
function scoreHeadline(headline) {
    const lower = headline.toLowerCase();
    let score = 0;

    for (const kw of BULLISH_STRONG) {
        if (lower.includes(kw)) score += 25;
    }
    for (const kw of BULLISH_MILD) {
        if (lower.includes(kw)) score += 10;
    }
    for (const kw of BEARISH_STRONG) {
        if (lower.includes(kw)) score -= 25;
    }
    for (const kw of BEARISH_MILD) {
        if (lower.includes(kw)) score -= 10;
    }

    // Clamp
    score = Math.max(-100, Math.min(100, score));

    let label = 'neutral';
    if (score >= 30) label = 'very_bullish';
    else if (score >= 10) label = 'bullish';
    else if (score <= -30) label = 'very_bearish';
    else if (score <= -10) label = 'bearish';

    return { score, label };
}

/**
 * Analyze an array of news items.
 * @param {Array<{title: string, publisher?: string, link?: string, providerPublishTime?: number}>} newsItems
 * @returns sentiment analysis result
 */
export function analyzeNewsSentiment(newsItems) {
    if (!newsItems || newsItems.length === 0) {
        return {
            overallScore: 0,
            overallLabel: 'neutral',
            bullishCount: 0,
            bearishCount: 0,
            neutralCount: 0,
            totalArticles: 0,
            headlines: [],
            bullishThemes: [],
            bearishThemes: []
        };
    }

    const analyzed = newsItems.map(item => {
        const sentiment = scoreHeadline(item.title || '');
        let publishedAt = '';
        if (item.providerPublishTime) {
            try {
                // Yahoo Finance may return seconds or milliseconds
                const ts = item.providerPublishTime > 1e12 ? item.providerPublishTime : item.providerPublishTime * 1000;
                const d = new Date(ts);
                if (d.getFullYear() > 2000 && d.getFullYear() < 2100) {
                    publishedAt = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                }
            } catch (e) { /* ignore */ }
        }
        return {
            title: item.title,
            publisher: item.publisher || 'Unknown',
            link: item.link || '',
            publishedAt,
            ...sentiment
        };
    });

    const bullish = analyzed.filter(a => a.label.includes('bullish'));
    const bearish = analyzed.filter(a => a.label.includes('bearish'));
    const neutral = analyzed.filter(a => a.label === 'neutral');

    const avgScore = analyzed.length > 0
        ? Math.round(analyzed.reduce((s, a) => s + a.score, 0) / analyzed.length)
        : 0;

    let overallLabel = 'neutral';
    if (avgScore >= 20) overallLabel = 'very_bullish';
    else if (avgScore >= 5) overallLabel = 'bullish';
    else if (avgScore <= -20) overallLabel = 'very_bearish';
    else if (avgScore <= -5) overallLabel = 'bearish';

    // Extract themes from bullish/bearish headlines
    const bullishThemes = extractThemes(bullish.map(b => b.title));
    const bearishThemes = extractThemes(bearish.map(b => b.title));

    return {
        overallScore: avgScore,
        overallLabel,
        bullishCount: bullish.length,
        bearishCount: bearish.length,
        neutralCount: neutral.length,
        totalArticles: analyzed.length,
        headlines: analyzed.slice(0, 15), // Top 15 most recent
        bullishThemes,
        bearishThemes
    };
}

/**
 * Extract common themes from headlines.
 */
function extractThemes(headlines) {
    if (headlines.length === 0) return [];

    const themeKeywords = {
        'Earnings & Revenue': ['earnings', 'revenue', 'profit', 'quarter', 'eps', 'guidance', 'forecast'],
        'Growth & Expansion': ['growth', 'expand', 'new market', 'launch', 'innovation', 'product'],
        'Analyst Activity': ['upgrade', 'downgrade', 'rating', 'target', 'analyst', 'price target'],
        'Market Momentum': ['rally', 'surge', 'momentum', 'breakout', 'high', 'record'],
        'Risk & Concerns': ['risk', 'concern', 'lawsuit', 'regulation', 'investigation', 'recall'],
        'Competition': ['competition', 'rival', 'market share', 'competitor'],
        'Macro & Industry': ['industry', 'sector', 'economy', 'fed', 'interest rate', 'inflation'],
        'Management & Strategy': ['ceo', 'management', 'strategy', 'restructur', 'layoff', 'hire']
    };

    const themes = [];
    const combined = headlines.join(' ').toLowerCase();

    for (const [theme, keywords] of Object.entries(themeKeywords)) {
        const matches = keywords.filter(kw => combined.includes(kw)).length;
        if (matches >= 1) {
            themes.push({ theme, relevance: matches });
        }
    }

    return themes.sort((a, b) => b.relevance - a.relevance).slice(0, 4);
}

/**
 * Analyze earnings history for beats and misses.
 * @param {Array} earningsHistory — from Yahoo Finance earningsHistory module
 * @returns earnings analysis
 */
export function analyzeEarnings(earningsHistory) {
    if (!earningsHistory || earningsHistory.length === 0) {
        return { quarters: [], beatRate: null, avgSurprise: null, streak: null };
    }

    const quarters = earningsHistory.map(q => {
        const estimate = q.epsEstimate;
        const actual = q.epsActual;
        const surprise = (estimate != null && actual != null)
            ? actual - estimate
            : null;
        const surprisePct = (estimate != null && actual != null && estimate !== 0)
            ? ((actual - estimate) / Math.abs(estimate)) * 100
            : null;

        let result = 'N/A';
        if (surprise !== null) {
            if (surprise > 0.005) result = 'beat';
            else if (surprise < -0.005) result = 'miss';
            else result = 'met';
        }

        // Build quarter label safely
        let quarterLabel = 'N/A';
        if (q.quarter != null) {
            if (q.quarter instanceof Date || (typeof q.quarter === 'object' && q.quarter.getMonth)) {
                // yahoo-finance2 v3: q.quarter is a Date object representing the quarter end
                const d = new Date(q.quarter);
                const month = d.getMonth(); // 0-indexed
                const yr = d.getFullYear();
                const qNum = Math.ceil((month + 1) / 3);
                quarterLabel = yr > 1970 && yr < 2100 ? `Q${qNum} ${yr}` : `Q${qNum}`;
            } else if (typeof q.quarter === 'object' && q.quarter.quarter != null) {
                quarterLabel = `Q${q.quarter.quarter}${q.quarter.year ? ' ' + q.quarter.year : ''}`;
            } else if (typeof q.quarter === 'number') {
                quarterLabel = `Q${q.quarter}`;
            } else if (typeof q.quarter === 'string') {
                quarterLabel = q.quarter;
            } else {
                // Last resort: try to extract from toString
                try {
                    const d = new Date(String(q.quarter));
                    if (!isNaN(d.getTime()) && d.getFullYear() > 1970 && d.getFullYear() < 2100) {
                        const qNum = Math.ceil((d.getMonth() + 1) / 3);
                        quarterLabel = `Q${qNum} ${d.getFullYear()}`;
                    }
                } catch (e) { /* use N/A */ }
            }
        } else if (q.period) {
            quarterLabel = q.period;
        }

        // Format date safely
        let dateStr = '';
        if (q.date) {
            try {
                const d = typeof q.date === 'string' ? new Date(q.date) : q.date;
                if (d instanceof Date && !isNaN(d.getTime()) && d.getFullYear() > 1970 && d.getFullYear() < 2100) {
                    dateStr = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                }
            } catch (e) { /* ignore date parse errors */ }
        }

        return {
            quarter: quarterLabel,
            date: dateStr,
            estimate: estimate != null ? estimate : null,
            actual: actual != null ? actual : null,
            surprise: surprise != null ? Math.round(surprise * 1000) / 1000 : null,
            surprisePct: surprisePct != null ? Math.round(surprisePct * 10) / 10 : null,
            result
        };
    });

    const validQuarters = quarters.filter(q => q.result !== 'N/A');
    const beats = validQuarters.filter(q => q.result === 'beat').length;
    const beatRate = validQuarters.length > 0
        ? Math.round((beats / validQuarters.length) * 100)
        : null;

    const surprises = quarters.filter(q => q.surprisePct !== null).map(q => q.surprisePct);
    const avgSurprise = surprises.length > 0
        ? Math.round((surprises.reduce((s, v) => s + v, 0) / surprises.length) * 10) / 10
        : null;

    // Calculate current streak
    let streak = null;
    if (validQuarters.length > 0) {
        const firstResult = validQuarters[0].result;
        let count = 0;
        for (const q of validQuarters) {
            if (q.result === firstResult) count++;
            else break;
        }
        streak = { type: firstResult, count };
    }

    return { quarters, beatRate, avgSurprise, streak };
}

/**
 * Generate dynamic bull/bear narrative from news + earnings + quant data.
 */
export function generateSentimentNarrative(ticker, newsSentiment, earnings, quantData) {
    const newsLabel = newsSentiment?.overallLabel || 'neutral';
    const bullThemes = newsSentiment?.bullishThemes?.map(t => t.theme) || [];
    const bearThemes = newsSentiment?.bearishThemes?.map(t => t.theme) || [];
    const beatRate = earnings?.beatRate;
    const streak = earnings?.streak;
    const avgSurprise = earnings?.avgSurprise;
    const grade = quantData?.grade || 'N/A';

    // Build bull case
    let bullParts = [];
    if (newsSentiment?.bullishCount > newsSentiment?.bearishCount) {
        bullParts.push(`Recent news flow for ${ticker} is predominantly positive, with ${newsSentiment.bullishCount} out of ${newsSentiment.totalArticles} articles carrying bullish signals.`);
    }
    if (bullThemes.length > 0) {
        bullParts.push(`Key bullish themes include ${bullThemes.join(', ')}.`);
    }
    if (beatRate !== null && beatRate >= 75) {
        bullParts.push(`The company has a strong ${beatRate}% earnings beat rate over the past year${streak?.type === 'beat' ? `, with ${streak.count} consecutive beats` : ''}.`);
    }
    if (avgSurprise !== null && avgSurprise > 0) {
        bullParts.push(`Average EPS surprise of +${avgSurprise}% shows consistent outperformance vs. analyst expectations.`);
    }
    if (bullParts.length === 0) {
        bullParts.push(`Limited bullish catalysts identified in recent news for ${ticker}. The stock may be in a consolidation phase with potential for a positive catalyst to drive upside.`);
    }

    // Build bear case
    let bearParts = [];
    if (newsSentiment?.bearishCount > newsSentiment?.bullishCount) {
        bearParts.push(`News sentiment for ${ticker} skews negative, with ${newsSentiment.bearishCount} of ${newsSentiment.totalArticles} articles flagging concerns.`);
    }
    if (bearThemes.length > 0) {
        bearParts.push(`Primary risk themes: ${bearThemes.join(', ')}.`);
    }
    if (beatRate !== null && beatRate < 50) {
        bearParts.push(`A weak ${beatRate}% earnings beat rate raises questions about management's ability to deliver on expectations.`);
    }
    if (streak?.type === 'miss' && streak.count >= 2) {
        bearParts.push(`${streak.count} consecutive earnings misses could erode investor confidence further.`);
    }
    if (avgSurprise !== null && avgSurprise < 0) {
        bearParts.push(`Average EPS surprise of ${avgSurprise}% signals a pattern of overpromising and underdelivering.`);
    }
    if (bearParts.length === 0) {
        bearParts.push(`No major bearish catalysts in recent news for ${ticker}, though valuation metrics and broader market conditions should be monitored for potential downside risks.`);
    }

    return {
        bullCase: bullParts.join(' '),
        bearCase: bearParts.join(' '),
        newsLabel,
        newsScore: newsSentiment?.overallScore || 0
    };
}
