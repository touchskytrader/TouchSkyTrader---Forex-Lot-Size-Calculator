import { AccountCurrency, CurrencyPair, Leverage, Option, TradeType } from './types';

// --- Mock Exchange Rates ---
// Rates are primarily relative to USD for conversion purposes.
// For commodities/crypto, their 'rate' is their current price against USD, which is dynamic.
// These are mock rates for currency conversion of account/pip values.
export const MOCK_EXCHANGE_RATES: { [key: string]: number } = {
  'USD': 1.0,
  'USDT': 1.0, // Assuming USDT is pegged to USD
  'EUR': 1.08, // EUR/USD
  'GBP': 1.27, // GBP/USD
  'JPY': 0.0064, // JPY/USD (1 USD = ~156.0 JPY)
  'INR': 0.012, // INR/USD (1 USD = ~83.5 INR)
  'AUD': 0.66, // AUD/USD
  'NZD': 0.61, // NZD/USD
  'CAD': 0.73, // CAD/USD
  'CHF': 1.11, // CHF/USD (1 USD = ~0.89 CHF)
  // For commodities/crypto base currencies, their "rate to USD" is typically their market price
  // which will be captured by entryPrice for calculations like margin.
  // For cross-currency conversion, these explicit rates are needed.
  // When base is XAU, XAG, BTC, ETH, we rely on entryPrice for USD conversion primarily.
};

// --- Account Currencies ---
export const ACCOUNT_CURRENCIES: Option<AccountCurrency>[] = [
  { value: 'USD', label: 'USD' },
  { value: 'INR', label: 'INR' },
  { value: 'GBP', label: 'GBP' },
  { value: 'EUR', label: 'EUR' },
];

// --- Leverage Options ---
export const LEVERAGE_OPTIONS: Option<Leverage>[] = [
  { value: '1:30', label: '1:30' },
  { value: '1:50', label: '1:50' },
  { value: '1:100', label: '1:100' },
  { value: '1:200', label: '1:200' },
  { value: '1:500', label: '1:500' },
  { value: '1:1000', label: '1:1000' },
];

// --- Trade Type Options ---
export const TRADE_TYPES: Option<TradeType>[] = [
  { value: 'buy', label: 'Buy (Long)' },
  { value: 'sell', label: 'Sell (Short)' },
];

/**
 * Dynamically determines the pip multiplier based on the currency pair symbol.
 * This logic is based on the provided PRD:
 * - 0.01 for Gold (XAUUSD), Silver (XAGUSD), and Indices (NAS100, US30).
 * - 0.0001 for all other Major & Minor Forex Pairs.
 * @param symbol The symbol of the currency pair (e.g., 'XAU/USD', 'EUR/USD').
 * @returns The pip multiplier for the given symbol.
 */
export function getPairPipMultiplier(symbol: string): number {
  if (symbol.includes("XAU") || symbol.includes("XAG") || symbol.includes("NAS100") || symbol.includes("US30")) {
    return 0.01;
  } else {
    return 0.0001;
  }
}

// --- Currency Pairs ---
interface CurrencyPairCategory {
  category: string;
  pairs: Omit<CurrencyPair, 'pipMultiplier'>[]; // Use Omit because pipMultiplier is now dynamic
}

export const CURRENCY_PAIRS: CurrencyPairCategory[] = [
  {
    category: 'Major FX Pairs',
    pairs: [
      { symbol: 'EUR/USD', base: 'EUR', quote: 'USD', contractSize: 100_000 },
      { symbol: 'GBP/USD', base: 'GBP', quote: 'USD', contractSize: 100_000 },
      { symbol: 'USD/JPY', base: 'USD', quote: 'JPY', contractSize: 100_000 },
      { symbol: 'USD/CHF', base: 'USD', quote: 'CHF', contractSize: 100_000 },
      { symbol: 'AUD/USD', base: 'AUD', quote: 'USD', contractSize: 100_000 },
      { symbol: 'USD/CAD', base: 'USD', quote: 'CAD', contractSize: 100_000 },
      { symbol: 'NZD/USD', base: 'NZD', quote: 'USD', contractSize: 100_000 },
    ],
  },
  {
    category: 'Minor FX Pairs',
    pairs: [
      { symbol: 'EUR/GBP', base: 'EUR', quote: 'GBP', contractSize: 100_000 },
      { symbol: 'EUR/JPY', base: 'EUR', quote: 'JPY', contractSize: 100_000 },
      { symbol: 'GBP/JPY', base: 'GBP', quote: 'JPY', contractSize: 100_000 },
      { symbol: 'AUD/JPY', base: 'AUD', quote: 'JPY', contractSize: 100_000 },
      { symbol: 'CHF/JPY', base: 'CHF', quote: 'JPY', contractSize: 100_000 },
      { symbol: 'EUR/CAD', base: 'EUR', quote: 'CAD', contractSize: 100_000 },
      { symbol: 'GBP/CAD', base: 'GBP', quote: 'CAD', contractSize: 100_000 },
      { symbol: 'AUD/CAD', base: 'AUD', quote: 'CAD', contractSize: 100_000 },
      { symbol: 'AUD/CHF', base: 'AUD', quote: 'CHF', contractSize: 100_000 },
      { symbol: 'AUD/NZD', base: 'AUD', quote: 'NZD', contractSize: 100_000 },
      { symbol: 'EURAUD', base: 'EUR', quote: 'AUD', contractSize: 100_000 },
      { symbol: 'EURNZD', base: 'EUR', quote: 'NZD', contractSize: 100_000 },
      { symbol: 'GBPAUD', base: 'GBP', quote: 'AUD', contractSize: 100_000 },
      { symbol: 'GBPCAD', base: 'GBP', quote: 'CAD', contractSize: 100_000 },
      { symbol: 'GBPCHF', base: 'GBP', quote: 'CHF', contractSize: 100_000 },
      { symbol: 'GBPNZD', base: 'GBP', quote: 'NZD', contractSize: 100_000 },
      { symbol: 'NZDCAD', base: 'NZD', quote: 'CAD', contractSize: 100_000 },
      { symbol: 'NZDJPY', base: 'NZD', quote: 'JPY', contractSize: 100_000 },
      { symbol: 'NZDCHF', base: 'NZD', quote: 'CHF', contractSize: 100_000 },
      { symbol: 'CADJPY', base: 'CAD', quote: 'JPY', contractSize: 100_000 },
      { symbol: 'CHFJPY', base: 'CHF', quote: 'JPY', contractSize: 100_000 },
      { symbol: 'EURCHF', base: 'EUR', quote: 'CHF', contractSize: 100_000 },
      { symbol: 'CADCHF', base: 'CAD', quote: 'CHF', contractSize: 100_000 },
    ],
  },
  {
    category: 'Commodity Pairs',
    pairs: [
      { symbol: 'XAU/USD', base: 'XAU', quote: 'USD', contractSize: 100 }, // Gold: 1 lot = 100 ounces
      { symbol: 'XAG/USD', base: 'XAG', quote: 'USD', contractSize: 5000 }, // Silver: 1 lot = 5000 ounces
      { symbol: 'XCU/USD', base: 'XCU', quote: 'USD', contractSize: 25000 }, // Copper (Assumption, common contract size/multiplier)
    ],
  },
  {
    category: 'Indices',
    pairs: [
      { symbol: 'NAS100/USD', base: 'NAS100', quote: 'USD', contractSize: 20 },
      { symbol: 'US30/USD', base: 'US30', quote: 'USD', contractSize: 10 },
    ],
  },
  {
    category: 'Crypto Pairs',
    pairs: [
      { symbol: 'BTC/USDT', base: 'BTC', quote: 'USDT', contractSize: 1 }, // Bitcoin: 1 unit
      { symbol: 'ETH/USD', base: 'ETH', quote: 'USD', contractSize: 1 }, // Ethereum: 1 unit
    ],
  },
];

export const ALL_CURRENCY_PAIRS: CurrencyPair[] = CURRENCY_PAIRS.flatMap(
  (category) => category.pairs,
);

// --- Risk Thresholds for UI (arbitrary values for demonstration) ---
export const RISK_PERCENTAGE_THRESHOLDS = {
  LOW_MAX: 1.0, // <= 1% risk
  MEDIUM_MAX: 2.0, // > 1% and <= 2% risk
  HIGH_MIN: 2.0, // > 2% risk
};