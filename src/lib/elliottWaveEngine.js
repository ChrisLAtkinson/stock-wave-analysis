/**
 * Elliott Wave Engine
 * Ported from ElliottWavePredictor.pine (TradingView Pine Script v6)
 *
 * Implements:
 *  - ZigZag pivot detection
 *  - Structural wave identification (Origin, W1-W4)
 *  - Fibonacci ratio confidence scoring
 *  - 12-step forward wave projection with alternating motive/corrective cycles
 */

// ──────────────────────────────────────────────
// 1. Pivot Detection (ZigZag)
// ──────────────────────────────────────────────

/**
 * Detect swing highs and lows using a simple ZigZag with `depth` bars lookback.
 * @param {Array<{time:string, open:number, high:number, low:number, close:number}>} candles
 * @param {number} depth  – number of bars on each side to confirm a pivot (default 5)
 * @returns {Array<{index:number, time:string, price:number, type:'high'|'low'}>}
 */
export function detectPivots(candles, depth = 5) {
    const pivots = [];
    if (candles.length < depth * 2 + 1) return pivots;

    // Find all local highs and lows
    const highs = [];
    const lows = [];

    for (let i = depth; i < candles.length - depth; i++) {
        let isHigh = true;
        let isLow = true;
        for (let j = 1; j <= depth; j++) {
            if (candles[i].high <= candles[i - j].high) isHigh = false;
            if (candles[i].high <= candles[i + j].high) isHigh = false;
            if (candles[i].low >= candles[i - j].low) isLow = false;
            if (candles[i].low >= candles[i + j].low) isLow = false;
        }
        if (isHigh) highs.push({ index: i, time: candles[i].time, price: candles[i].high, type: 'high' });
        if (isLow) lows.push({ index: i, time: candles[i].time, price: candles[i].low, type: 'low' });
    }

    // Merge and sort by index
    const all = [...highs, ...lows].sort((a, b) => a.index - b.index);

    // Enforce alternation (must alternate high/low)
    if (all.length === 0) return pivots;
    pivots.push(all[0]);

    for (let i = 1; i < all.length; i++) {
        const last = pivots[pivots.length - 1];
        if (all[i].type === last.type) {
            // Same direction: keep the more extreme one
            if (all[i].type === 'high' && all[i].price > last.price) {
                pivots[pivots.length - 1] = all[i];
            } else if (all[i].type === 'low' && all[i].price < last.price) {
                pivots[pivots.length - 1] = all[i];
            }
        } else {
            pivots.push(all[i]);
        }
    }

    return pivots;
}

// ──────────────────────────────────────────────
// 2. Trend Detection
// ──────────────────────────────────────────────

/**
 * Auto-detect whether the recent trend is bullish or bearish.
 * Uses the last ~7 pivots slope (matching Pine's logic).
 */
export function determineTrend(pivots) {
    if (pivots.length < 2) return true; // default bullish
    const sz = pivots.length;
    const startIdx = Math.max(0, sz - 7);
    return pivots[sz - 1].price > pivots[startIdx].price;
}

// ──────────────────────────────────────────────
// 3. Structural Wave Detection
// ──────────────────────────────────────────────

/**
 * Identifies the 5 major Elliott Wave turning points within the most recent pivots.
 * Only searches the last 20 pivots to stay anchored to current price action.
 *
 * Returns { origin, w1, w2, w3, w4 } as indices into the pivots array.
 */
export function findStructuralWaves(pivots, isBull) {
    const sz = pivots.length;
    const recentStart = Math.max(0, sz - 20);
    let oIdx = recentStart, w1I = recentStart, w2I = recentStart, w3I = recentStart, w4I = recentStart;

    if (sz < 3) return { origin: oIdx, w1: w1I, w2: w2I, w3: w3I, w4: w4I };

    if (isBull) {
        // Step 1: Highest pivot in recent window = W3
        w3I = recentStart;
        let maxVal = pivots[recentStart].price;
        for (let i = recentStart; i < sz; i++) {
            if (pivots[i].price > maxVal) { maxVal = pivots[i].price; w3I = i; }
        }
        // Step 2: Lowest between recentStart and W3 = origin
        oIdx = recentStart;
        let minVal = pivots[recentStart].price;
        for (let i = recentStart; i <= w3I; i++) {
            if (pivots[i].price < minVal) { minVal = pivots[i].price; oIdx = i; }
        }
        // Step 3: First local max between origin and W3 = W1
        w1I = Math.min(oIdx + 1, w3I);
        if (w3I > oIdx + 2) {
            let localMax = pivots[oIdx + 1].price;
            for (let i = oIdx + 1; i < w3I; i++) {
                if (pivots[i].price > localMax) { localMax = pivots[i].price; w1I = i; }
                if (pivots[i].price < localMax * 0.9) break;
            }
        }
        // Step 4: Lowest between W1 and W3 = W2
        w2I = w1I;
        if (w3I > w1I + 1) {
            let localMin = pivots[w1I].price;
            for (let i = w1I; i < w3I; i++) {
                if (pivots[i].price < localMin) { localMin = pivots[i].price; w2I = i; }
            }
        }
        // Step 5: Lowest after W3 = W4
        w4I = w3I;
        if (w3I < sz - 1) {
            let localMin2 = pivots[w3I + 1].price;
            w4I = w3I + 1;
            for (let i = w3I + 1; i < sz; i++) {
                if (pivots[i].price < localMin2) { localMin2 = pivots[i].price; w4I = i; }
            }
        }
    } else {
        // Bearish: highest in recent window = origin, lowest = W3
        oIdx = recentStart;
        let maxVal2 = pivots[recentStart].price;
        for (let i = recentStart; i < sz; i++) {
            if (pivots[i].price > maxVal2) { maxVal2 = pivots[i].price; oIdx = i; }
        }
        w3I = oIdx;
        let minVal2 = pivots[oIdx].price;
        for (let i = oIdx; i < sz; i++) {
            if (pivots[i].price < minVal2) { minVal2 = pivots[i].price; w3I = i; }
        }
        w1I = Math.min(oIdx + 1, w3I);
        if (w3I > oIdx + 2) {
            let localMin3 = pivots[oIdx + 1].price;
            for (let i = oIdx + 1; i < w3I; i++) {
                if (pivots[i].price < localMin3) { localMin3 = pivots[i].price; w1I = i; }
                if (pivots[i].price > localMin3 * 1.1) break;
            }
        }
        w2I = w1I;
        if (w3I > w1I + 1) {
            let localMax3 = pivots[w1I].price;
            for (let i = w1I; i < w3I; i++) {
                if (pivots[i].price > localMax3) { localMax3 = pivots[i].price; w2I = i; }
            }
        }
        w4I = w3I;
        if (w3I < sz - 1) {
            let localMax4 = pivots[w3I + 1].price;
            w4I = w3I + 1;
            for (let i = w3I + 1; i < sz; i++) {
                if (pivots[i].price > localMax4) { localMax4 = pivots[i].price; w4I = i; }
            }
        }
    }

    return { origin: oIdx, w1: w1I, w2: w2I, w3: w3I, w4: w4I };
}

// ──────────────────────────────────────────────
// 4. EW Confidence Scoring
// ──────────────────────────────────────────────

/**
 * Returns a confidence score (0-100) for how well the detected pivots match Elliott Wave rules.
 */
export function ewConfidence(pivots) {
    let score = 0;
    const sz = pivots.length;
    if (sz < 5) return score;

    const l1 = Math.abs(pivots[sz - 5].price - pivots[sz - 4].price);
    const l2 = Math.abs(pivots[sz - 4].price - pivots[sz - 3].price);
    const l3 = Math.abs(pivots[sz - 3].price - pivots[sz - 2].price);
    const l4 = Math.abs(pivots[sz - 2].price - pivots[sz - 1].price);

    // Rule 1: Wave 3 is never the shortest (max +30)
    if (l3 >= l1 && l3 >= l4) score += 30;

    // Rule 2: Wave 2 retraces 38.2%-78.6% of Wave 1 (max +25)
    if (l1 > 0) {
        const r2 = l2 / l1;
        if (r2 >= 0.382 && r2 <= 0.786) score += 25;
        else if (r2 >= 0.236 && r2 <= 0.886) score += 12;
    }

    // Rule 3: Wave 3 extends 1.272x-2.618x Wave 1 (max +25)
    if (l1 > 0) {
        const ext3 = l3 / l1;
        if (ext3 >= 1.272 && ext3 <= 2.618) score += 25;
        else if (ext3 >= 1.0 && ext3 <= 3.0) score += 12;
    }

    // Rule 4: Wave 4 retraces 23.6%-50% of Wave 3 (max +20)
    if (l3 > 0) {
        const r4 = l4 / l3;
        if (r4 >= 0.236 && r4 <= 0.500) score += 20;
        else if (r4 >= 0.146 && r4 <= 0.618) score += 10;
    }

    return score;
}

// ──────────────────────────────────────────────
// 5. Current Wave Determination
// ──────────────────────────────────────────────

const WAVE_NAMES = ['Wave 1', 'Wave 2A', 'Wave 2B', 'Wave 2C', 'Wave 3', 'Wave 4A', 'Wave 4B', 'Wave 4C', 'Wave 5'];
const WAVE_LABELS = ['(1)', 'A', 'B', '(2)', '(3)', 'A', 'B', '(4)', '(5)'];
const WAVE_FIBS = ['1.000', '0.382', '0.500', '0.618', '1.618', '0.236', '0.500', '0.382', '1.000'];

export function determineCurrentWave(pivots, structural) {
    const lastPivIdx = pivots.length - 1;
    let simI = 0;

    if (lastPivIdx <= structural.w1) simI = 0;
    else if (lastPivIdx <= structural.w2) simI = 3;
    else if (lastPivIdx <= structural.w3) simI = 4;
    else if (lastPivIdx <= structural.w4) simI = 7;
    else simI = 8;

    return {
        simI,
        name: WAVE_NAMES[simI],
        label: WAVE_LABELS[simI]
    };
}

// ──────────────────────────────────────────────
// 6. Wave Projection
// ──────────────────────────────────────────────

/**
 * Generates forward-looking wave projections from current price.
 * Produces 12 steps covering ~1+ full motive+corrective cycle.
 *
 * @param {number} originPrice  – origin of the current impulse
 * @param {number} w1Len  – measured length of Wave 1
 * @param {number} simI  – current position in the 9-step model
 * @param {boolean} isBull
 * @param {number} currentPrice
 * @param {number} numSteps – how many forward steps (default 12)
 * @returns {Array<{step, wave, label, fibRatio, target, pctChange, isMajor}>}
 */
export function projectWaves(originPrice, w1Len, simI, isBull, currentPrice, numSteps = 12) {
    const len1 = w1Len;
    const len2 = len1 * 0.618;
    const len3 = len1 * 1.618;
    const len4 = len3 * 0.382;
    const len5 = len1;

    const dir0 = isBull ? 1.0 : -1.0;
    const r_w5 = dir0 * len1 - dir0 * len2 + dir0 * len3 - dir0 * len4 + dir0 * len5;
    const w5 = originPrice + r_w5;
    const cycle0Net = w5 - originPrice;

    const projections = [];

    for (let s = 1; s <= numSteps; s++) {
        const effAbsIdx = simI + s;
        const cycleNum = Math.floor(effAbsIdx / 9);
        const currIdx = effAbsIdx % 9;

        const cycleSign = (cycleNum % 2 === 0) ? 1.0 : -1.0;
        const activeDir = (isBull ? 1.0 : -1.0) * cycleSign;

        let priorCyclesMove = 0;
        if (cycleNum === 1) priorCyclesMove = cycle0Net;
        else if (cycleNum >= 2) priorCyclesMove = (cycleNum % 2 === 1) ? cycle0Net : 0;

        const cw1 = activeDir * len1;
        const cw2 = cw1 - activeDir * len2;
        const cw3 = cw2 + activeDir * len3;
        const cw4 = cw3 - activeDir * len4;
        const cw5 = cw4 + activeDir * len5;

        const cw2a = cw1 - activeDir * len1 * 0.382;
        const cw2b = cw2a + activeDir * (Math.abs(cw1 - cw2a) * 0.5);
        const cw2c = cw2;

        const cw4a = cw3 - activeDir * len3 * 0.236;
        const cw4b = cw4a + activeDir * (Math.abs(cw3 - cw4a) * 0.5);
        const cw4c = cw4;

        let relTp = 0;
        let wn = '', wl = '', wf = '';
        let isMajor = false;

        if (cycleNum % 2 === 1) {
            // Corrective cycle
            switch (currIdx) {
                case 0: relTp = cw1; wn = 'WAVE A'; wl = 'A'; wf = '1.000'; isMajor = true; break;
                case 1: relTp = cw2a; break;
                case 2: relTp = cw2b; break;
                case 3: relTp = cw2c; wn = 'WAVE B'; wl = 'B'; wf = '0.618'; isMajor = true; break;
                case 4: relTp = cw3; wn = 'WAVE C'; wl = 'C'; wf = '1.618'; isMajor = true; break;
                case 5: relTp = cw4a; break;
                case 6: relTp = cw4b; break;
                case 7: relTp = cw4c; wn = 'WAVE X'; wl = 'X'; wf = '0.382'; isMajor = true; break;
                case 8: relTp = cw5; wn = 'WAVE Y'; wl = 'Y'; wf = '1.000'; isMajor = true; break;
            }
        } else {
            // Motive cycle
            switch (currIdx) {
                case 0: relTp = cw1; wn = 'WAVE 1'; wl = '1'; wf = '1.000'; isMajor = true; break;
                case 1: relTp = cw2a; wn = 'Wave 2a'; wl = '2a'; wf = '0.382'; break;
                case 2: relTp = cw2b; wn = 'Wave 2b'; wl = '2b'; wf = '0.500'; break;
                case 3: relTp = cw2c; wn = 'WAVE 2'; wl = '2'; wf = '0.618'; isMajor = true; break;
                case 4: relTp = cw3; wn = 'WAVE 3'; wl = '3'; wf = '1.618'; isMajor = true; break;
                case 5: relTp = cw4a; wn = 'Wave 4a'; wl = '4a'; wf = '0.236'; break;
                case 6: relTp = cw4b; wn = 'Wave 4b'; wl = '4b'; wf = '0.500'; break;
                case 7: relTp = cw4c; wn = 'WAVE 4'; wl = '4'; wf = '0.382'; isMajor = true; break;
                case 8: relTp = cw5; wn = 'WAVE 5'; wl = '5'; wf = '1.000'; isMajor = true; break;
            }
        }

        const target = Math.max(0.01, originPrice + priorCyclesMove + relTp);
        const pctChange = currentPrice !== 0 ? ((target - currentPrice) / currentPrice) * 100 : 0;

        if (wn) {
            projections.push({
                step: s,
                wave: wn,
                label: wl,
                fibRatio: wf,
                target: Math.round(target * 100) / 100,
                pctChange: Math.round(pctChange * 100) / 100,
                isMajor
            });
        }
    }

    return projections;
}

// ──────────────────────────────────────────────
// 7. Full Analysis Pipeline
// ──────────────────────────────────────────────

/**
 * Run the complete Elliott Wave analysis on an array of OHLC candles.
 * @param {Array<{time:string, open:number, high:number, low:number, close:number}>} candles
 * @returns full analysis result object
 */
export function analyzeElliottWaves(candles) {
    if (!candles || candles.length < 20) {
        return { error: 'Insufficient price data for Elliott Wave analysis' };
    }

    const currentPrice = candles[candles.length - 1].close;

    // 1. Detect pivots
    const pivots = detectPivots(candles, 5);
    if (pivots.length < 5) {
        return { error: 'Not enough swing points detected. Try a longer history.' };
    }

    // 2. Trend
    const isBull = determineTrend(pivots);

    // 3. Structural waves
    const structural = findStructuralWaves(pivots, isBull);

    // 4. Confidence
    const confidence = ewConfidence(pivots);

    // 5. Current wave position
    const currentWave = determineCurrentWave(pivots, structural);

    // 6. Measured W1 length
    const originPrice = pivots[structural.origin].price;
    const w1EndPrice = pivots[structural.w1].price;
    let w1Len = Math.abs(w1EndPrice - originPrice);

    // Scale up if W3 is extended
    const w2Price = pivots[structural.w2].price;
    const w3Price = pivots[structural.w3].price;
    const w3LenActual = Math.abs(w3Price - w2Price);
    if (w3LenActual > 0 && w1Len > 0 && w3LenActual > w1Len * 2.618) {
        w1Len = w3LenActual / 1.618;
    }

    // Safety: if w1Len is too tiny, use avg recent leg
    if (w1Len < 0.001) {
        const sz = pivots.length;
        w1Len = Math.abs(pivots[sz - 1].price - pivots[sz - 2].price);
    }

    // 7. Projections
    const projections = projectWaves(originPrice, w1Len, currentWave.simI, isBull, currentPrice, 12);

    // 8. Trade setup from projections
    const majorProjections = projections.filter(p => p.isMajor);
    const nextUp = majorProjections.find(p => p.target > currentPrice);
    const nextDown = majorProjections.find(p => p.target < currentPrice);

    const tradeSetup = {
        entryLow: Math.round(currentPrice * 0.97 * 100) / 100,
        entryHigh: Math.round(currentPrice * 1.01 * 100) / 100,
        stopLoss: Math.round(originPrice * 100) / 100,
        target: nextUp ? nextUp.target : Math.round(currentPrice * 1.15 * 100) / 100
    };

    // 9. Thematic stories (dynamic based on wave position)
    const thematicStory = generateThematicStory(currentWave, isBull, confidence, projections, currentPrice);

    // 10. Structural wave points for chart markers
    const structuralPoints = [
        { ...pivots[structural.origin], waveLabel: '0' },
        { ...pivots[structural.w1], waveLabel: '1' },
        { ...pivots[structural.w2], waveLabel: '2' },
        { ...pivots[structural.w3], waveLabel: '3' },
        { ...pivots[structural.w4], waveLabel: '4' }
    ];

    return {
        currentPrice,
        isBull,
        currentWave: currentWave.name,
        currentWaveLabel: currentWave.label,
        confidence,
        structuralPoints,
        pivots: pivots.map(p => ({ time: p.time, price: p.price, type: p.type })),
        projections,
        tradeSetup,
        thematicStory,
        invalidationLevel: originPrice
    };
}

// ──────────────────────────────────────────────
// 8. Thematic Story Generation
// ──────────────────────────────────────────────

function generateThematicStory(currentWave, isBull, confidence, projections, currentPrice) {
    const topTarget = projections.filter(p => p.target > currentPrice).sort((a, b) => b.target - a.target)[0];
    const bottomTarget = projections.filter(p => p.target < currentPrice).sort((a, b) => a.target - b.target)[0];

    const upside = topTarget ? `${topTarget.pctChange > 0 ? '+' : ''}${topTarget.pctChange}%` : 'limited';
    const downside = bottomTarget ? `${bottomTarget.pctChange}%` : 'limited';

    const wavePhase = currentWave.name;
    const confLabel = confidence >= 70 ? 'high' : confidence >= 40 ? 'moderate' : 'low';

    let bullCase, bearCase;

    if (isBull) {
        bullCase = `Elliott Wave structure indicates the stock is in ${wavePhase} of a bullish impulse ` +
            `with ${confLabel} pattern confidence (${confidence}%). ` +
            `Fibonacci projections suggest potential upside of ${upside} to the next major wave target. ` +
            `The trend remains intact as long as price holds above the invalidation level at the wave origin.`;

        bearCase = `Despite the bullish wave structure, a failure to hold current levels could trigger a ` +
            `corrective pullback of ${downside}. If the invalidation level is broken, the entire wave count ` +
            `would need to be reassessed, potentially signaling a larger corrective pattern. ` +
            `The ${confLabel} confidence score suggests ${confidence < 50 ? 'significant uncertainty' : 'some caution'} in the current count.`;
    } else {
        bullCase = `Although the current wave structure appears bearish (${wavePhase}), a potential reversal ` +
            `could develop if price reclaims key resistance levels. Counter-trend rallies within the corrective ` +
            `structure could offer upside of ${upside}. Watch for divergence signals at wave completion points.`;

        bearCase = `The bearish Elliott Wave structure shows the stock in ${wavePhase} with ${confLabel} confidence (${confidence}%). ` +
            `Fibonacci extensions project further downside potential of ${downside}. ` +
            `The corrective cycle is expected to continue until the full 5-wave impulse completes to the downside.`;
    }

    return { bullCase, bearCase };
}
