export function analyzeValuation(data) {
    const fd = data.financialData || {};
    const ks = data.defaultKeyStatistics || {};
    const sd = data.summaryDetail || {};
    const quote = data.quote || {};

    const currentPrice = quote.regularMarketPrice || 0;
    const eps = ks.trailingEps || 0;
    const forwardEps = ks.forwardEps || eps;
    let growthRate = fd.earningsGrowth || fd.revenueGrowth || 0.05; // Fallback to 5%
    if (growthRate > 0.3) growthRate = 0.3; // Cap at 30% for DCF sanity
    if (growthRate < 0) growthRate = 0.02; // Floor at 2% terminal growth

    const sharesOutstanding = ks.sharesOutstanding || 1;
    const freeCashFlow = fd.freeCashflow || (eps * sharesOutstanding); // Fallback to earnings

    // ────────────────────────────────────────────────────────
    // 1. Discounted Cash Flow (DCF) Fair Value
    // ────────────────────────────────────────────────────────
    // 5-year DCF Model
    let discountRate = 0.09; // 9% WACC assumption
    let terminalGrowthRate = 0.025; // 2.5% perpetuity

    let pvOfFcf = 0;
    let currentFcf = freeCashFlow;

    for (let year = 1; year <= 5; year++) {
        currentFcf *= (1 + growthRate);
        pvOfFcf += currentFcf / Math.pow(1 + discountRate, year);
    }

    // Terminal Value
    let terminalValue = (currentFcf * (1 + terminalGrowthRate)) / (discountRate - terminalGrowthRate);
    let pvOfTerminalValue = terminalValue / Math.pow(1 + discountRate, 5);

    let enterpriseValue = pvOfFcf + pvOfTerminalValue;
    // Add Cash, Subtract Debt
    const totalCash = fd.totalCash || 0;
    const totalDebt = fd.totalDebt || 0;
    let equityValue = enterpriseValue + totalCash - totalDebt;

    let dcfFairValue = 0;
    if (sharesOutstanding > 0 && equityValue > 0) {
        dcfFairValue = equityValue / sharesOutstanding;
    }

    // ────────────────────────────────────────────────────────
    // 2. Proprietary Fair Value Estimate (Mimics Morningstar)
    // ────────────────────────────────────────────────────────
    // Morningstar heavily weights Economic Moat (ROE & Margins) and uses a more conservative discount.
    const roe = fd.returnOnEquity || 0.1;
    let moatPremium = 1.0;
    if (roe > 0.2) moatPremium = 1.15;      // Wide Moat
    else if (roe > 0.1) moatPremium = 1.05; // Narrow Moat
    else moatPremium = 0.9;                 // No Moat

    // Blended P/E approach scaled by Moat
    const sectorPe = 18;
    let msFairValue = forwardEps * sectorPe * moatPremium;
    if (msFairValue <= 0) msFairValue = dcfFairValue * 0.9; // Fallback

    // Morningstar Star Rating (1 to 5)
    let priceToFV = currentPrice / (msFairValue || 1);
    let msRating = 3;
    if (priceToFV <= 0.7) msRating = 5;
    else if (priceToFV <= 0.85) msRating = 4;
    else if (priceToFV <= 1.05) msRating = 3;
    else if (priceToFV <= 1.3) msRating = 2;
    else msRating = 1;

    // ────────────────────────────────────────────────────────
    // 3. Quantitative Rating (Mimics CFRA)
    // ────────────────────────────────────────────────────────
    // CFRA relies heavily on Growth + Value + Momentum metrics
    let cfraScore = 0;

    // Growth
    if (growthRate > 0.15) cfraScore += 2;
    else if (growthRate > 0.05) cfraScore += 1;

    // Value
    let pe = sd.trailingPE || 30;
    if (pe > 0 && pe < 15) cfraScore += 2;
    else if (pe >= 15 && pe < 25) cfraScore += 1;

    // Financial Health (Current Ratio)
    let cr = fd.currentRatio || 1;
    if (cr > 1.5) cfraScore += 1;

    // Margin scale to 1-5 Stars
    let cfraStars = Math.max(1, Math.min(5, Math.round(cfraScore + 1.5)));

    const cfraLabels = { 1: "Strong Sell", 2: "Sell", 3: "Hold", 4: "Buy", 5: "Strong Buy" };

    return {
        currentPrice,
        dcf: {
            fairValue: dcfFairValue,
            upside: dcfFairValue > 0 ? ((dcfFairValue - currentPrice) / currentPrice) * 100 : 0
        },
        morningstar: {
            fairValue: msFairValue,
            stars: msRating,
            moat: moatPremium > 1.1 ? 'Wide' : (moatPremium > 1.0 ? 'Narrow' : 'None'),
            upside: msFairValue > 0 ? ((msFairValue - currentPrice) / currentPrice) * 100 : 0
        },
        cfra: {
            stars: cfraStars,
            label: cfraLabels[cfraStars]
        }
    };
}
