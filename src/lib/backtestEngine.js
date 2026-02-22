/**
 * Backtest Engine — RSI(2) Mean-Reversion Strategy
 *
 * Rules:
 *  - Only trade LONG when price is above the 200-day SMA
 *  - BUY when RSI(2) drops below oversold threshold (default: 10)
 *  - EXIT when RSI(2) rises above overbought threshold (default: 90)
 *    OR after maxHoldDays trading days (default: 10)
 *
 * Returns full trade log, equity curve, and performance stats.
 */

// ─── RSI Calculation ───
function computeRSI(closes, period = 2) {
    const rsi = new Array(closes.length).fill(null);
    if (closes.length < period + 1) return rsi;

    let avgGain = 0;
    let avgLoss = 0;

    // Initial average
    for (let i = 1; i <= period; i++) {
        const change = closes[i] - closes[i - 1];
        if (change > 0) avgGain += change;
        else avgLoss += Math.abs(change);
    }
    avgGain /= period;
    avgLoss /= period;

    rsi[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

    // Subsequent values (Wilder smoothing)
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

// ─── Simple Moving Average ───
function computeSMA(closes, period = 200) {
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

/**
 * Run the RSI(2) mean-reversion backtest.
 *
 * @param {Array<{time: string, open: number, high: number, low: number, close: number}>} candles
 * @param {object} params
 * @param {number} params.rsiPeriod — RSI lookback (default: 2)
 * @param {number} params.oversold — RSI buy threshold (default: 10)
 * @param {number} params.overbought — RSI exit threshold (default: 90)
 * @param {number} params.maxHoldDays — Max hold period (default: 10)
 * @param {number} params.smaPeriod — MA filter period (default: 200)
 * @param {number} params.initialCapital — Starting capital (default: 10000)
 * @returns backtest results
 */
export function runBacktest(candles, params = {}) {
    const {
        rsiPeriod = 2,
        oversold = 10,
        overbought = 90,
        maxHoldDays = 10,
        smaPeriod = 200,
        initialCapital = 10000,
    } = params;

    const closes = candles.map(c => c.close);
    const rsi = computeRSI(closes, rsiPeriod);
    const sma200 = computeSMA(closes, smaPeriod);

    const trades = [];
    const equityCurve = [];
    let capital = initialCapital;
    let position = null; // { entryIdx, entryPrice, shares }
    let peakCapital = initialCapital;
    let maxDrawdown = 0;

    // Start from where we have both RSI and SMA data
    const startIdx = Math.max(smaPeriod, rsiPeriod + 1);

    for (let i = startIdx; i < candles.length; i++) {
        const price = closes[i];
        const time = candles[i].time;

        // Track equity
        const currentEquity = position
            ? capital + position.shares * (price - position.entryPrice)
            : capital;

        equityCurve.push({ time, equity: Math.round(currentEquity * 100) / 100 });

        // Update drawdown
        if (currentEquity > peakCapital) peakCapital = currentEquity;
        const dd = ((peakCapital - currentEquity) / peakCapital) * 100;
        if (dd > maxDrawdown) maxDrawdown = dd;

        if (position) {
            // ── Check EXIT conditions ──
            const holdDays = i - position.entryIdx;
            const shouldExit =
                (rsi[i] !== null && rsi[i] > overbought) ||
                holdDays >= maxHoldDays;

            if (shouldExit) {
                const exitPrice = price;
                const pnl = position.shares * (exitPrice - position.entryPrice);
                const pnlPct = ((exitPrice - position.entryPrice) / position.entryPrice) * 100;
                capital += pnl;

                trades.push({
                    entryDate: candles[position.entryIdx].time,
                    entryPrice: position.entryPrice,
                    exitDate: time,
                    exitPrice,
                    holdDays,
                    pnl: Math.round(pnl * 100) / 100,
                    pnlPct: Math.round(pnlPct * 100) / 100,
                    exitReason: rsi[i] !== null && rsi[i] > overbought ? 'RSI Overbought' : 'Max Hold Days',
                    entryRSI: position.entryRSI,
                    exitRSI: rsi[i] !== null ? Math.round(rsi[i] * 10) / 10 : null,
                });

                position = null;
            }
        } else {
            // ── Check ENTRY conditions ──
            const aboveSMA = sma200[i] !== null && price > sma200[i];
            const rsiOversold = rsi[i] !== null && rsi[i] < oversold;

            if (aboveSMA && rsiOversold) {
                const shares = Math.floor(capital / price);
                if (shares > 0) {
                    position = {
                        entryIdx: i,
                        entryPrice: price,
                        shares,
                        entryRSI: Math.round(rsi[i] * 10) / 10,
                    };
                }
            }
        }
    }

    // Close any open position at the end
    if (position) {
        const lastPrice = closes[closes.length - 1];
        const holdDays = candles.length - 1 - position.entryIdx;
        const pnl = position.shares * (lastPrice - position.entryPrice);
        const pnlPct = ((lastPrice - position.entryPrice) / position.entryPrice) * 100;
        capital += pnl;

        trades.push({
            entryDate: candles[position.entryIdx].time,
            entryPrice: position.entryPrice,
            exitDate: candles[candles.length - 1].time,
            exitPrice: lastPrice,
            holdDays,
            pnl: Math.round(pnl * 100) / 100,
            pnlPct: Math.round(pnlPct * 100) / 100,
            exitReason: 'End of Period',
            entryRSI: position.entryRSI,
            exitRSI: null,
        });
        position = null;
    }

    // ── Compute Stats ──
    const winners = trades.filter(t => t.pnl > 0);
    const losers = trades.filter(t => t.pnl <= 0);
    const totalReturn = capital - initialCapital;
    const totalReturnPct = ((capital - initialCapital) / initialCapital) * 100;

    // Buy & hold comparison
    const bhStartPrice = closes[startIdx];
    const bhEndPrice = closes[closes.length - 1];
    const buyHoldReturn = ((bhEndPrice - bhStartPrice) / bhStartPrice) * 100;

    const avgWin = winners.length > 0
        ? winners.reduce((s, t) => s + t.pnlPct, 0) / winners.length
        : 0;
    const avgLoss = losers.length > 0
        ? losers.reduce((s, t) => s + t.pnlPct, 0) / losers.length
        : 0;
    const avgHoldDays = trades.length > 0
        ? trades.reduce((s, t) => s + t.holdDays, 0) / trades.length
        : 0;

    return {
        params: { rsiPeriod, oversold, overbought, maxHoldDays, smaPeriod, initialCapital },
        stats: {
            totalTrades: trades.length,
            winners: winners.length,
            losers: losers.length,
            winRate: trades.length > 0 ? Math.round((winners.length / trades.length) * 100) : 0,
            totalReturn: Math.round(totalReturn * 100) / 100,
            totalReturnPct: Math.round(totalReturnPct * 100) / 100,
            avgWinPct: Math.round(avgWin * 100) / 100,
            avgLossPct: Math.round(avgLoss * 100) / 100,
            maxDrawdown: Math.round(maxDrawdown * 100) / 100,
            avgHoldDays: Math.round(avgHoldDays * 10) / 10,
            finalCapital: Math.round(capital * 100) / 100,
            buyHoldReturn: Math.round(buyHoldReturn * 100) / 100,
        },
        trades,
        equityCurve,
    };
}
