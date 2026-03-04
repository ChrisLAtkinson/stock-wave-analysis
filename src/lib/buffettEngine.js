export function analyzeBuffett(data) {
    const fd = data.financialData || {};
    const ks = data.defaultKeyStatistics || {};
    const quote = data.quote || {};

    const price = quote.regularMarketPrice || 0;
    const eps = ks.trailingEps || 0;
    const roe = fd.returnOnEquity || 0;
    const debtToEq = fd.debtToEquity || 0; // Usually in percentage returned from APIs
    const margins = fd.profitMargins || 0;
    const bvps = ks.bookValue || 0;

    // 1. Economic Moat (ROE)
    const roePass = roe > 0.15;

    // 2. Conservative Debt
    // If debtToEquity is missing, we conservatively assume it might fail if we don't know, but let's safely default to checking it
    const debtToEqPass = debtToEq !== undefined && debtToEq !== null && debtToEq < 50;

    // 3. Excellent Profitability
    const marginPass = margins > 0.10;

    // 4. Intrinsic Value (Simplified Graham Number = sqrt(22.5 * EPS * BVPS))
    let grahamNumber = 0;
    if (eps > 0 && bvps > 0) {
        grahamNumber = Math.sqrt(22.5 * eps * bvps);
    }
    const marginOfSafety = grahamNumber > 0 ? ((grahamNumber - price) / price) * 100 : 0;
    const valuePass = marginOfSafety > 10; // At least 10% discount to Graham Number

    let score = 0;
    if (roePass) score += 25;
    if (debtToEqPass) score += 25;
    if (marginPass) score += 25;
    if (valuePass) score += 25;

    let verdict = "Overvalued / Weak Moat";
    if (score === 100) verdict = "Value Buy";
    else if (score >= 75) verdict = "Quality Hold";
    else if (score >= 50) verdict = "Fair";

    return {
        score,
        metrics: [
            {
                name: "Return on Equity (ROE)",
                value: (roe * 100).toFixed(2) + '%',
                target: "> 15%",
                passed: roePass,
                desc: "Measures economic moat and efficiency. High consistent ROE indicates a strong competitive advantage."
            },
            {
                name: "Debt to Equity",
                value: (debtToEq !== undefined && debtToEq !== null) ? debtToEq.toFixed(2) + '%' : 'N/A',
                target: "< 50%",
                passed: debtToEqPass,
                desc: "Low utilization of debt to fund operations. Buffett strongly avoids high debt loads."
            },
            {
                name: "Net Profit Margin",
                value: (margins * 100).toFixed(2) + '%',
                target: "> 10%",
                passed: marginPass,
                desc: "Consistent profitability demonstrates durable pricing power over competitors."
            },
            {
                name: "Margin of Safety",
                value: marginOfSafety.toFixed(2) + '%',
                target: "> 10% Discount",
                passed: valuePass,
                desc: "Trading below calculated intrinsic value (using the Benjamin Graham calculation)."
            }
        ],
        grahamNumber,
        marginOfSafety,
        verdict
    };
}
