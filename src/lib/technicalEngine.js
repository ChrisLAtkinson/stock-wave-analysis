export function analyzeTechnicals(candles) {
    if (!candles || candles.length < 200) return null;

    const closePrices = candles.map(c => c.close);
    const currentPrice = closePrices[closePrices.length - 1];

    // Helper to calculate Simple Moving Average
    const sma = (period) => {
        if (closePrices.length < period) return null;
        const slice = closePrices.slice(-period);
        const sum = slice.reduce((a, b) => a + b, 0);
        return sum / period;
    };

    // Helper to calculate Exponential Moving Average
    const ema = (period) => {
        if (closePrices.length < period) return null;
        const k = 2 / (period + 1);
        let ema = closePrices.slice(0, period).reduce((a, b) => a + b, 0) / period; // Start with SMA
        for (let i = period; i < closePrices.length; i++) {
            ema = (closePrices[i] * k) + (ema * (1 - k));
        }
        return ema;
    };

    // Calculate RSI (Relative Strength Index)
    const calculateRsi = (period = 14) => {
        if (closePrices.length < period + 1) return null;
        let gains = 0, losses = 0;
        for (let i = closePrices.length - period; i < closePrices.length; i++) {
            const diff = closePrices[i] - closePrices[i - 1];
            if (diff >= 0) gains += diff;
            else losses -= diff;
        }
        let avgGain = gains / period;
        let avgLoss = losses / period;

        if (avgLoss === 0) return 100;
        let rs = avgGain / avgLoss;
        return 100 - (100 / (1 + rs));
    };

    // MACD (12, 26, 9)
    const ema12 = ema(12);
    const ema26 = ema(26);
    let macd = null;
    let macdSignal = null;
    let macdHist = null;
    if (ema12 && ema26) {
        macd = ema12 - ema26;
        // Approximation for Signal line (just simple MA of MACD for last 9 periods is harder without keeping track)
        // Let's just indicate MACD raw vs 0
    }

    // Bollinger Bands (20, 2)
    const sma20 = sma(20);
    let bbUpper = null, bbLower = null;
    if (sma20 && closePrices.length >= 20) {
        const slice = closePrices.slice(-20);
        const variance = slice.reduce((acc, val) => acc + Math.pow(val - sma20, 2), 0) / 20;
        const stdDev = Math.sqrt(variance);
        bbUpper = sma20 + (stdDev * 2);
        bbLower = sma20 - (stdDev * 2);
    }

    const ma50 = sma(50);
    const ma200 = sma(200);

    let summary = 'Neutral';
    let score = 0;

    if (currentPrice > ma50) score += 1; else score -= 1;
    if (currentPrice > ma200) score += 1; else score -= 1;
    if (ma50 > ma200) score += 2; else score -= 2; // Golden Cross / Death Cross

    const rsi = calculateRsi();
    if (rsi < 30) score += 2; // Oversold
    else if (rsi > 70) score -= 2; // Overbought

    if (score >= 3) summary = 'Strong Buy';
    else if (score >= 1) summary = 'Buy';
    else if (score <= -3) summary = 'Strong Sell';
    else if (score <= -1) summary = 'Sell';

    return {
        indicators: {
            sma20,
            sma50: ma50,
            sma200: ma200,
            rsi14: rsi,
            bbUpper,
            bbLower
        },
        signals: {
            trend: ma50 > ma200 ? 'Bullish' : 'Bearish',
            momentum: rsi > 70 ? 'Overbought' : (rsi < 30 ? 'Oversold' : 'Neutral'),
            volatility: currentPrice > bbUpper ? 'Upper Band Breakout' : (currentPrice < bbLower ? 'Lower Band Breakdown' : 'Within Bands')
        },
        summary
    };
}
