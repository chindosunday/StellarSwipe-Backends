export const TRADING_STRATEGIES = {
  descriptions: {
    trendFollowing: 'Follow established market trends using technical indicators',
    meanReversion: 'Trade when prices deviate from average values',
    scalping: 'Make quick trades to capture small price movements',
    swingTrading: 'Hold positions for days to weeks to capture larger moves',
    arbitrage: 'Exploit price differences across trading pairs or exchanges',
  },
  signals: {
    strong_buy: 'Signal indicates strong buying opportunity',
    buy: 'Signal suggests considering a buy position',
    sell: 'Signal suggests considering exiting or selling',
    strong_sell: 'Signal indicates strong selling pressure',
    neutral: 'Signal indicates neutral market conditions',
  },
};

export const MARKET_EDUCATION = {
  terms: {
    volatility: 'Measure of price fluctuation - higher volatility means larger price swings',
    liquidity: 'Ability to buy or sell without significantly impacting price',
    support: 'Price level where buying interest historically increases',
    resistance: 'Price level where selling pressure historically increases',
    rsi: 'Relative Strength Index - momentum indicator ranging from 0-100',
    macd: 'Moving Average Convergence Divergence - trend-following momentum indicator',
  },
  risks: [
    'Market volatility can lead to rapid losses',
    'Leverage amplifies both gains and losses',
    'Technical issues can cause unexpected losses',
    'Regulatory changes can impact trading availability',
    'Psychological factors often lead to poor trading decisions',
  ],
};

export const BEST_PRACTICES = [
  'Always use stop-loss orders to limit potential losses',
  'Never risk more than you can afford to lose per trade',
  'Diversify your portfolio across different assets',
  'Keep emotions out of trading decisions',
  'Document your trades to learn from successes and failures',
  'Stay informed about market news and developments',
  'Use take-profit orders to secure gains',
  'Practice risk management with proper position sizing',
];
