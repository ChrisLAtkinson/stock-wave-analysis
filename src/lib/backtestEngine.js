/**
 * Backtest Engine — Multiple Trading Strategies
 *
 * Strategies:
 *  1. RSI(2) Mean-Reversion
 *  2. Golden Cross / Death Cross (50/200 MA)
 *  3. MACD Crossover
 *  4. Bollinger Band Bounce
 *  5. Breakout (Donchian Channel / Turtle Trading)
 *
 * All strategies return full trade log, equity curve, and performance stats.
 */

// ═══════════════════════════════════════════════
// ── Technical Indicator Calculations ──
// ═══════════════════════════════════════════════

function computeRSI(closes, period = 2) {
    const rsi = new Array(closes.length).fill(null);
    if (closes.length < period + 1) return rsi;

    let avgGain = 0, avgLoss = 0;
    for (let i = 1; i <= period; i++) {
        const change = closes[i] - closes[i - 1];
        if (change > 0) avgGain += change;
        else avgLoss += Math.abs(change);
    }
    avgGain /= period;
    avgLoss /= period;
    rsi[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

    for (let i = period + 1; i < closes.length; i++) {
        const change = closes[i] - closes[i - 1];
        const gain = change > 0 ? change : 0;
        const loss = change < 0 ? Math.abs(change) : 0;
        avgGain = (avgGain * (period - 1) + gain) / period;
        avgLoss = (avgLoss * (period - 1) + loss) / period;
        rsi[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
    }
    return rsi;
}

function computeSMA(closes, period) {
    const sma = new Array(closes.length).fill(null);
    if (closes.length < period) return sma;
    let sum = 0;
    for (let i = 0; i < period; i++) sum += closes[i];
    sma[period - 1] = sum / period;
    for (let i = period; i < closes.length; i++) {
        sum += closes[i] - closes[i - period];
        sma[i] = sum / period;
    }
    return sma;
}

function computeEMA(closes, period) {
    const ema = new Array(closes.length).fill(null);
    if (closes.length < period) return ema;
    let sum = 0;
    for (let i = 0; i < period; i++) sum += closes[i];
    ema[period - 1] = sum / period;
    const multiplier = 2 / (period + 1);
    for (let i = period; i < closes.length; i++) {
        ema[i] = (closes[i] - ema[i - 1]) * multiplier + ema[i - 1];
    }
    return ema;
}

function computeMACD(closes) {
    const ema12 = computeEMA(closes, 12);
    const ema26 = computeEMA(closes, 26);
    const macdLine = new Array(closes.length).fill(null);
    const signalLine = new Array(closes.length).fill(null);

    for (let i = 0; i < closes.length; i++) {
        if (ema12[i] !== null && ema26[i] !== null) {
            macdLine[i] = ema12[i] - ema26[i];
        }
    }

    // Signal line = 9-period EMA of MACD line
    const validMACD = [];
    const validIdx = [];
    for (let i = 0; i < macdLine.length; i++) {
        if (macdLine[i] !== null) { validMACD.push(macdLine[i]); validIdx.push(i); }
    }

    if (validMACD.length >= 9) {
        const sigEMA = computeEMA(validMACD, 9);
        for (let j = 0; j < sigEMA.length; j++) {
            if (sigEMA[j] !== null) signalLine[validIdx[j]] = sigEMA[j];
        }
    }

    return { macdLine, signalLine };
}

function computeBollingerBands(closes, period = 20, stdDevMult = 2) {
    const upper = new Array(closes.length).fill(null);
    const middle = new Array(closes.length).fill(null);
    const lower = new Array(closes.length).fill(null);

    const sma = computeSMA(closes, period);

    for (let i = period - 1; i < closes.length; i++) {
        if (sma[i] === null) continue;
        let variance = 0;
        for (let j = i - period + 1; j <= i; j++) {
            variance += Math.pow(closes[j] - sma[i], 2);
        }
        const stdDev = Math.sqrt(variance / period);
        middle[i] = sma[i];
        upper[i] = sma[i] + stdDevMult * stdDev;
        lower[i] = sma[i] - stdDevMult * stdDev;
    }

    return { upper, middle, lower };
}

function computeDonchian(highs, lows, period = 20) {
    const upper = new Array(highs.length).fill(null);
    const lower = new Array(highs.length).fill(null);

    for (let i = period - 1; i < highs.length; i++) {
        let maxH = highs[i - period + 1], minL = lows[i - period + 1];
        for (let j = i - period + 2; j <= i; j++) {
            if (highs[j] > maxH) maxH = highs[j];
            if (lows[j] < minL) minL = lows[j];
        }
        upper[i] = maxH;
        lower[i] = minL;
    }

    return { upper, lower };
}

// ═══════════════════════════════════════════════
// ── Strategy Definitions ──
// ═══════════════════════════════════════════════

export const STRATEGIES = {
    rsi2: {
        id: 'rsi2',
        name: 'RSI(2) Mean Reversion',
        description: 'Buy oversold dips above the 200-day MA, exit when overbought',
        rules: [
            { icon: 'shield', text: 'Only trade LONG above 200-day MA' },
            { icon: 'entry', text: 'BUY when RSI(2) < 10 (oversold)' },
            { icon: 'exit', text: 'EXIT when RSI(2) > 90 or after 10 days' },
        ],
        warmup: 200,
    },
    goldenCross: {
        id: 'goldenCross',
        name: 'Golden Cross / Death Cross',
        description: 'Buy when 50-day MA crosses above 200-day MA, sell on death cross',
        rules: [
            { icon: 'entry', text: 'BUY when 50 MA crosses above 200 MA (Golden Cross)' },
            { icon: 'exit', text: 'SELL when 50 MA crosses below 200 MA (Death Cross)' },
            { icon: 'shield', text: 'Trend-following — rides major moves' },
        ],
        warmup: 200,
    },
    macdCrossover: {
        id: 'macdCrossover',
        name: 'MACD Crossover',
        description: 'Buy on bullish MACD crossover above zero, sell on bearish crossover',
        rules: [
            { icon: 'entry', text: 'BUY when MACD crosses above Signal line' },
            { icon: 'exit', text: 'SELL when MACD crosses below Signal line' },
            { icon: 'shield', text: 'Momentum-based trend following' },
        ],
        warmup: 35,
    },
    bollingerBounce: {
        id: 'bollingerBounce',
        name: 'Bollinger Band Bounce',
        description: 'Buy at the lower band, exit at the middle or upper band',
        rules: [
            { icon: 'shield', text: 'Only trade LONG above 50-day MA (uptrend filter)' },
            { icon: 'entry', text: 'BUY when price closes below lower Bollinger Band' },
            { icon: 'exit', text: 'EXIT at middle band, upper band, or after 15 days' },
        ],
        warmup: 50,
    },
    breakout: {
        id: 'breakout',
        name: 'Donchian Breakout (Turtle)',
        description: 'Buy 20-day high breakout, sell 10-day low breakdown',
        rules: [
            { icon: 'entry', text: 'BUY when price breaks above 20-day high' },
            { icon: 'exit', text: 'SELL when price breaks below 10-day low' },
            { icon: 'shield', text: 'Classic trend-following breakout system' },
        ],
        warmup: 20,
    },
};

// ═══════════════════════════════════════════════
// ── Strategy Execution Functions ──
// ═══════════════════════════════════════════════

function executeRSI2(candles, closes) {
    const rsi = computeRSI(closes, 2);
    const sma200 = computeSMA(closes, 200);
    const signals = [];

    for (let i = 200; i < candles.length; i++) {
        const price = closes[i];
        const aboveSMA = sma200[i] !== null && price > sma200[i];
        const oversold = rsi[i] !== null && rsi[i] < 10;
        const overbought = rsi[i] !== null && rsi[i] > 90;

        if (aboveSMA && oversold) signals.push({ idx: i, action: 'buy', reason: 'RSI Oversold' });
        else if (overbought) signals.push({ idx: i, action: 'sell', reason: 'RSI Overbought' });
        else signals.push({ idx: i, action: 'hold', maxHold: 10 });
    }
    return signals;
}

function executeGoldenCross(candles, closes) {
    const sma50 = computeSMA(closes, 50);
    const sma200 = computeSMA(closes, 200);
    const signals = [];

    for (let i = 200; i < candles.length; i++) {
        if (sma50[i] === null || sma200[i] === null || sma50[i - 1] === null || sma200[i - 1] === null) {
            signals.push({ idx: i, action: 'hold' });
            continue;
        }

        const prevAbove = sma50[i - 1] > sma200[i - 1];
        const currAbove = sma50[i] > sma200[i];

        if (!prevAbove && currAbove) signals.push({ idx: i, action: 'buy', reason: 'Golden Cross' });
        else if (prevAbove && !currAbove) signals.push({ idx: i, action: 'sell', reason: 'Death Cross' });
        else signals.push({ idx: i, action: 'hold' });
    }
    return signals;
}

function executeMACDCrossover(candles, closes) {
    const { macdLine, signalLine } = computeMACD(closes);
    const signals = [];

    for (let i = 35; i < candles.length; i++) {
        if (macdLine[i] === null || signalLine[i] === null ||
            macdLine[i - 1] === null || signalLine[i - 1] === null) {
            signals.push({ idx: i, action: 'hold' });
            continue;
        }

        const prevAbove = macdLine[i - 1] > signalLine[i - 1];
        const currAbove = macdLine[i] > signalLine[i];

        if (!prevAbove && currAbove) signals.push({ idx: i, action: 'buy', reason: 'MACD Bullish Cross' });
        else if (prevAbove && !currAbove) signals.push({ idx: i, action: 'sell', reason: 'MACD Bearish Cross' });
        else signals.push({ idx: i, action: 'hold' });
    }
    return signals;
}

function executeBollingerBounce(candles, closes) {
    const { upper, middle, lower } = computeBollingerBands(closes, 20, 2);
    const sma50 = computeSMA(closes, 50);
    const signals = [];

    for (let i = 50; i < candles.length; i++) {
        if (lower[i] === null || middle[i] === null || sma50[i] === null) {
            signals.push({ idx: i, action: 'hold' });
            continue;
        }

        const price = closes[i];
        const inUptrend = price > sma50[i];

        if (inUptrend && price <= lower[i]) signals.push({ idx: i, action: 'buy', reason: 'Lower Band Touch' });
        else if (price >= upper[i]) signals.push({ idx: i, action: 'sell', reason: 'Upper Band' });
        else if (price >= middle[i]) signals.push({ idx: i, action: 'sell', reason: 'Middle Band' });
        else signals.push({ idx: i, action: 'hold', maxHold: 15 });
    }
    return signals;
}

function executeBreakout(candles, closes) {
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    const donchian20 = computeDonchian(highs, lows, 20);
    const donchian10 = computeDonchian(highs, lows, 10);
    const signals = [];

    for (let i = 20; i < candles.length; i++) {
        if (donchian20.upper[i - 1] === null || donchian10.lower[i - 1] === null) {
            signals.push({ idx: i, action: 'hold' });
            continue;
        }

        const price = closes[i];

        if (price > donchian20.upper[i - 1]) signals.push({ idx: i, action: 'buy', reason: '20-Day High Breakout' });
        else if (price < donchian10.lower[i - 1]) signals.push({ idx: i, action: 'sell', reason: '10-Day Low Breakdown' });
        else signals.push({ idx: i, action: 'hold' });
    }
    return signals;
}

// ═══════════════════════════════════════════════
// ── Trade Simulation Engine ──
// ═══════════════════════════════════════════════

function simulateTrades(candles, signals, initialCapital = 10000) {
    const closes = candles.map(c => c.close);
    const trades = [];
    const equityCurve = [];
    let capital = initialCapital;
    let position = null;
    let peakCapital = initialCapital;
    let maxDrawdown = 0;

    // Build signal lookup by index
    const signalMap = {};
    for (const sig of signals) signalMap[sig.idx] = sig;

    const startIdx = signals.length > 0 ? signals[0].idx : 0;

    for (let i = startIdx; i < candles.length; i++) {
        const price = closes[i];
        const time = candles[i].time;
        const sig = signalMap[i];

        const currentEquity = position
            ? capital + position.shares * (price - position.entryPrice)
            : capital;

        equityCurve.push({ time, equity: Math.round(currentEquity * 100) / 100 });

        if (currentEquity > peakCapital) peakCapital = currentEquity;
        const dd = ((peakCapital - currentEquity) / peakCapital) * 100;
        if (dd > maxDrawdown) maxDrawdown = dd;

        if (position) {
            const holdDays = i - position.entryIdx;
            const maxHold = position.maxHold || 9999;
            let shouldExit = holdDays >= maxHold;
            let exitReason = 'Max Hold Days';

            if (sig && sig.action === 'sell') {
                shouldExit = true;
                exitReason = sig.reason;
            }

            if (shouldExit) {
                const pnl = position.shares * (price - position.entryPrice);
                const pnlPct = ((price - position.entryPrice) / position.entryPrice) * 100;
                capital += pnl;

                trades.push({
                    entryDate: candles[position.entryIdx].time,
                    entryPrice: Math.round(position.entryPrice * 100) / 100,
                    exitDate: time,
                    exitPrice: Math.round(price * 100) / 100,
                    holdDays,
                    pnl: Math.round(pnl * 100) / 100,
                    pnlPct: Math.round(pnlPct * 100) / 100,
                    exitReason,
                });
                position = null;
            }
        } else if (sig && sig.action === 'buy') {
            const shares = Math.floor(capital / price);
            if (shares > 0) {
                position = {
                    entryIdx: i,
                    entryPrice: price,
                    shares,
                    maxHold: sig.maxHold || 9999,
                };
            }
        }
    }

    // Close open position
    if (position) {
        const lastPrice = closes[closes.length - 1];
        const holdDays = candles.length - 1 - position.entryIdx;
        const pnl = position.shares * (lastPrice - position.entryPrice);
        const pnlPct = ((lastPrice - position.entryPrice) / position.entryPrice) * 100;
        capital += pnl;
        trades.push({
            entryDate: candles[position.entryIdx].time,
            entryPrice: Math.round(position.entryPrice * 100) / 100,
            exitDate: candles[candles.length - 1].time,
            exitPrice: Math.round(lastPrice * 100) / 100,
            holdDays,
            pnl: Math.round(pnl * 100) / 100,
            pnlPct: Math.round(pnlPct * 100) / 100,
            exitReason: 'End of Period',
        });
    }

    // Stats
    const winners = trades.filter(t => t.pnl > 0);
    const losers = trades.filter(t => t.pnl <= 0);
    const avgWin = winners.length > 0 ? winners.reduce((s, t) => s + t.pnlPct, 0) / winners.length : 0;
    const avgLoss = losers.length > 0 ? losers.reduce((s, t) => s + t.pnlPct, 0) / losers.length : 0;
    const avgHold = trades.length > 0 ? trades.reduce((s, t) => s + t.holdDays, 0) / trades.length : 0;

    const bhStart = closes[startIdx];
    const bhEnd = closes[closes.length - 1];
    const buyHoldReturn = ((bhEnd - bhStart) / bhStart) * 100;

    return {
        stats: {
            totalTrades: trades.length,
            winners: winners.length,
            losers: losers.length,
            winRate: trades.length > 0 ? Math.round((winners.length / trades.length) * 100) : 0,
            totalReturn: Math.round((capital - initialCapital) * 100) / 100,
            totalReturnPct: Math.round(((capital - initialCapital) / initialCapital) * 100 * 100) / 100,
            avgWinPct: Math.round(avgWin * 100) / 100,
            avgLossPct: Math.round(avgLoss * 100) / 100,
            maxDrawdown: Math.round(maxDrawdown * 100) / 100,
            avgHoldDays: Math.round(avgHold * 10) / 10,
            finalCapital: Math.round(capital * 100) / 100,
            buyHoldReturn: Math.round(buyHoldReturn * 100) / 100,
        },
        trades,
        equityCurve,
    };
}

// ═══════════════════════════════════════════════
// ── Main Entry Point ──
// ═══════════════════════════════════════════════

export function runBacktest(candles, strategyId = 'rsi2', initialCapital = 10000) {
    const closes = candles.map(c => c.close);
    let signals;

    switch (strategyId) {
        case 'goldenCross': signals = executeGoldenCross(candles, closes); break;
        case 'macdCrossover': signals = executeMACDCrossover(candles, closes); break;
        case 'bollingerBounce': signals = executeBollingerBounce(candles, closes); break;
        case 'breakout': signals = executeBreakout(candles, closes); break;
        case 'rsi2':
        default: signals = executeRSI2(candles, closes); break;
    }

    const result = simulateTrades(candles, signals, initialCapital);
    return { ...result, strategyId };
}
