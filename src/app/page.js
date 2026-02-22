"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Search, TrendingUp, TrendingDown, Activity, Target, BookOpen, Shield, ChevronDown } from 'lucide-react';

const StockChart = dynamic(() => import('./components/StockChart'), { ssr: false });
const QuantScorecard = dynamic(() => import('./components/QuantScorecard'), { ssr: false });
const EarningsTracker = dynamic(() => import('./components/EarningsTracker'), { ssr: false });
const SentimentPanel = dynamic(() => import('./components/SentimentPanel'), { ssr: false });

export default function Home() {
  const [ticker, setTicker] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [fundamentals, setFundamentals] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [sentiment, setSentiment] = useState(null);

  // Autocomplete
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef(null);
  const debounceRef = useRef(null);

  const searchTicker = useCallback(async (q) => {
    if (!q || q.length < 1) { setSuggestions([]); return; }
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setSuggestions(data);
      setShowSuggestions(data.length > 0);
    } catch { setSuggestions([]); }
  }, []);

  const handleTickerChange = (e) => {
    const val = e.target.value.toUpperCase();
    setTicker(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchTicker(val), 300);
  };

  const selectSuggestion = (symbol) => {
    setTicker(symbol);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  // Click outside to close suggestions
  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchStockData = async (e) => {
    e.preventDefault();
    if (!ticker.trim()) return;

    setLoading(true);
    setError('');
    setFundamentals(null);
    setAnalysis(null);
    setSentiment(null);
    setShowSuggestions(false);

    try {
      const [fundRes, anRes, sentRes] = await Promise.all([
        fetch(`/api/stock/${ticker}/fundamentals`),
        fetch(`/api/stock/${ticker}/analysis`),
        fetch(`/api/stock/${ticker}/sentiment`)
      ]);

      if (!fundRes.ok) throw new Error('Failed to fetch fundamentals');
      if (!anRes.ok) throw new Error('Failed to fetch analysis');

      const fundData = await fundRes.json();
      const anData = await anRes.json();
      const sentData = sentRes.ok ? await sentRes.json() : null;

      setFundamentals(fundData);
      setAnalysis(anData);
      setSentiment(sentData);
    } catch (err) {
      console.error(err);
      setError('Could not retrieve data for the provided ticker. Please ensure it is a valid stock symbol.');
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num) => {
    if (!num && num !== 0) return 'N/A';
    if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    return num.toLocaleString();
  };

  const formatPrice = (price) => {
    if (!price && price !== 0) return 'N/A';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);
  };

  const confColor = (conf) => {
    if (conf >= 70) return 'var(--success)';
    if (conf >= 40) return 'var(--warning)';
    return 'var(--danger)';
  };

  return (
    <main className="dashboard-grid">
      {/* Header & Search */}
      <div className="col-span-12" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '16px', marginBottom: '32px' }}>
        <h1 className="text-h1 gradient-text" style={{ marginBottom: '16px', textAlign: 'center' }}>Stock and Wave Analysis</h1>
        <p className="text-body" style={{ textAlign: 'center', marginBottom: '32px', maxWidth: '640px' }}>
          Premium stock analysis combining fundamental health, analyst consensus, and advanced Elliott Wave technical projections.
        </p>

        <div ref={searchRef} style={{ position: 'relative', width: '100%', maxWidth: '600px' }}>
          <form onSubmit={fetchStockData} className="search-container">
            <Search size={20} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
            <input
              type="text"
              className="search-input"
              placeholder="Enter stock ticker (e.g., AAPL, TSLA)"
              value={ticker}
              onChange={handleTickerChange}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            />
            <button type="submit" className="search-btn" disabled={loading}>
              {loading ? <div className="spinner"></div> : 'Analyze'}
            </button>
          </form>

          {/* Autocomplete Dropdown */}
          {showSuggestions && (
            <div className="autocomplete-dropdown">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  className="autocomplete-item"
                  onClick={() => selectSuggestion(s.symbol)}
                >
                  <span className="autocomplete-symbol">{s.symbol}</span>
                  <span className="autocomplete-name">{s.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        {error && <div className="text-danger" style={{ marginTop: '16px', textAlign: 'center' }}>{error}</div>}
      </div>

      {loading && (
        <div className="col-span-12" style={{ display: 'flex', justifyContent: 'center', marginTop: '32px' }}>
          <div className="spinner" style={{ width: '40px', height: '40px', borderWidth: '4px' }}></div>
        </div>
      )}

      {fundamentals && analysis && (
        <>
          {/* Main Price & Pulse */}
          <div className="col-span-12 glass-panel fade-in" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h2 className="text-h2" style={{ marginBottom: '8px' }}>{analysis.ticker || fundamentals.quote?.symbol}</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <span className="text-h1">{formatPrice(fundamentals.quote?.regularMarketPrice)}</span>
                <span className={fundamentals.quote?.regularMarketChangePercent >= 0 ? 'bg-success-soft' : 'bg-danger-soft'}>
                  {fundamentals.quote?.regularMarketChangePercent >= 0 ? '+' : ''}
                  {fundamentals.quote?.regularMarketChangePercent?.toFixed(2)}%
                </span>
              </div>
            </div>
            {analysis.confidence !== undefined && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className="confidence-badge" style={{ borderColor: confColor(analysis.confidence) }}>
                  <Shield size={16} style={{ color: confColor(analysis.confidence) }} />
                  <span style={{ color: confColor(analysis.confidence), fontWeight: 700 }}>{analysis.confidence}%</span>
                  <span className="text-small">EW Confidence</span>
                </div>
                <div className="wave-badge">
                  {analysis.isBull ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                  <span>{analysis.currentWave}</span>
                </div>
              </div>
            )}
          </div>

          {/* Left Column: Fundamentals & Analyst */}
          <div className="col-span-4 fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px', animationDelay: '0.1s' }}>
            <div className="glass-panel">
              <h3 className="text-h3" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={20} style={{ color: 'var(--accent)' }} /> Company Fundamentals
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="stat-box">
                  <span className="stat-label">Market Cap</span>
                  <span className="stat-value">{formatNumber(fundamentals.summary?.summaryDetail?.marketCap)}</span>
                </div>
                <div className="stat-box">
                  <span className="stat-label">Forward P/E</span>
                  <span className="stat-value">{fundamentals.summary?.summaryDetail?.forwardPE?.toFixed(2) || 'N/A'}</span>
                </div>
                <div className="stat-box">
                  <span className="stat-label">52W High</span>
                  <span className="stat-value">{formatPrice(fundamentals.summary?.summaryDetail?.fiftyTwoWeekHigh)}</span>
                </div>
                <div className="stat-box">
                  <span className="stat-label">Beta</span>
                  <span className="stat-value">{fundamentals.summary?.summaryDetail?.beta?.toFixed(2) || 'N/A'}</span>
                </div>
              </div>
            </div>

            <div className="glass-panel">
              <h3 className="text-h3" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Target size={20} style={{ color: 'var(--accent)' }} /> Analyst Consensus
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="consensus-row">
                  <span className="text-body">Recommendation</span>
                  <span style={{
                    fontWeight: 700,
                    color: fundamentals.summary?.financialData?.recommendationKey?.includes('buy') ? 'var(--success)' :
                      fundamentals.summary?.financialData?.recommendationKey?.includes('sell') ? 'var(--danger)' : 'var(--warning)'
                  }}>
                    {fundamentals.summary?.financialData?.recommendationKey?.toUpperCase() || 'N/A'}
                  </span>
                </div>
                <div className="consensus-row">
                  <span className="text-body">Target Price</span>
                  <span style={{ fontWeight: 700 }}>{formatPrice(fundamentals.summary?.financialData?.targetMeanPrice)}</span>
                </div>
                {fundamentals.quote?.regularMarketPrice && fundamentals.summary?.financialData?.targetMeanPrice && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span className="text-small">Upside to Target</span>
                      <span className="text-small" style={{
                        color: fundamentals.summary.financialData.targetMeanPrice > fundamentals.quote.regularMarketPrice ? 'var(--success)' : 'var(--danger)'
                      }}>
                        {((fundamentals.summary.financialData.targetMeanPrice / fundamentals.quote.regularMarketPrice - 1) * 100).toFixed(2)}%
                      </span>
                    </div>
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{
                          background: fundamentals.summary.financialData.targetMeanPrice > fundamentals.quote.regularMarketPrice ? 'var(--success)' : 'var(--danger)',
                          width: `${Math.min(100, Math.max(5, (fundamentals.quote.regularMarketPrice / fundamentals.summary.financialData.targetMeanPrice) * 100))}%`
                        }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Chart & Thematic Story */}
          <div className="col-span-8 fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px', animationDelay: '0.2s' }}>
            <div className="glass-panel">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 className="text-h3" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <TrendingUp size={20} style={{ color: 'var(--accent)' }} /> Elliott Wave Analysis
                </h3>
              </div>

              {/* Interactive Chart */}
              {analysis.historical && analysis.historical.length > 0 ? (
                <StockChart
                  historical={analysis.historical}
                  structuralPoints={analysis.structuralPoints || []}
                  projections={analysis.projections || []}
                  isBull={analysis.isBull}
                  invalidationLevel={analysis.invalidationLevel}
                  pivots={analysis.pivots || []}
                  currentPrice={analysis.currentPrice}
                />
              ) : (
                <div style={{ height: '420px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}>
                  <span className="text-body">No chart data available</span>
                </div>
              )}

              {/* Wave Projections Table */}
              {analysis.projections && analysis.projections.length > 0 && (
                <div style={{ marginTop: '20px' }}>
                  <div className="projection-grid">
                    {analysis.projections.filter(p => p.isMajor).slice(0, 5).map((p, i) => (
                      <div key={i} className="projection-card">
                        <div className="projection-label">{p.wave}</div>
                        <div className="projection-target">{formatPrice(p.target)}</div>
                        <div className="projection-change" style={{ color: p.pctChange >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                          {p.pctChange >= 0 ? '+' : ''}{p.pctChange}%
                        </div>
                        <div className="projection-fib">{p.fibRatio}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Trade Setup */}
              {analysis.tradeSetup && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginTop: '20px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span className="text-small" style={{ color: 'var(--text-secondary)' }}>Entry Range</span>
                    <span style={{ fontWeight: 600 }}>{formatPrice(analysis.tradeSetup.entryLow)} – {formatPrice(analysis.tradeSetup.entryHigh)}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span className="text-small" style={{ color: 'var(--text-secondary)' }}>Target</span>
                    <span style={{ fontWeight: 600, color: 'var(--success)' }}>{formatPrice(analysis.tradeSetup.target)}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span className="text-small" style={{ color: 'var(--text-secondary)' }}>Stop Loss</span>
                    <span style={{ fontWeight: 600, color: 'var(--danger)' }}>{formatPrice(analysis.tradeSetup.stopLoss)}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span className="text-small" style={{ color: 'var(--text-secondary)' }}>Risk/Reward</span>
                    <span style={{ fontWeight: 600 }}>
                      {analysis.tradeSetup.target && analysis.tradeSetup.entryHigh && analysis.tradeSetup.stopLoss
                        ? ((analysis.tradeSetup.target - analysis.tradeSetup.entryHigh) / Math.max(0.01, analysis.tradeSetup.entryHigh - analysis.tradeSetup.stopLoss)).toFixed(2)
                        : 'N/A'
                      }
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Thematic Outlook */}
            {analysis.thematicStory && (
              <div className="glass-panel">
                <h3 className="text-h3" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <BookOpen size={20} style={{ color: 'var(--accent)' }} /> Thematic Outlook
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div className="theme-card theme-card-bull">
                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--success)', marginBottom: '12px' }}>
                      <TrendingUp size={18} /> Bull Case
                    </h4>
                    <p className="text-body" style={{ fontSize: '0.9rem', lineHeight: '1.7' }}>{analysis.thematicStory.bullCase}</p>
                  </div>
                  <div className="theme-card theme-card-bear">
                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--danger)', marginBottom: '12px' }}>
                      <TrendingDown size={18} /> Bear Case
                    </h4>
                    <p className="text-body" style={{ fontSize: '0.9rem', lineHeight: '1.7' }}>{analysis.thematicStory.bearCase}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Full-Width: Earnings Tracker */}
          {sentiment?.earnings?.quarters?.length > 0 && (
            <div className="col-span-12 fade-in" style={{ animationDelay: '0.3s' }}>
              <div className="glass-panel">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                  <Activity size={20} style={{ color: 'var(--accent)' }} />
                  <h3 className="text-h3">Earnings History</h3>
                </div>
                <EarningsTracker earnings={sentiment.earnings} />
              </div>
            </div>
          )}

          {/* Full-Width: Sentiment & News Analysis */}
          {sentiment && (
            <div className="col-span-12 fade-in" style={{ animationDelay: '0.35s' }}>
              <div className="glass-panel">
                <SentimentPanel sentiment={sentiment} />
              </div>
            </div>
          )}

          {/* Full-Width: Quant Scorecard */}
          {fundamentals.quant && (
            <div className="col-span-12 fade-in" style={{ animationDelay: '0.4s' }}>
              <div className="glass-panel">
                <QuantScorecard quant={fundamentals.quant} />
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
}
