import {
  AccountCurrency,
  CalculationInputs,
  CalculationResults,
  CurrencyPair,
  Leverage,
  TradeType, // Import TradeType
} from '../types';
import { MOCK_EXCHANGE_RATES, getPairPipMultiplier } from '../constants'; // Import getPairPipMultiplier

/**
 * Helper to get the exchange rate from a currency to USD.
 * This is primarily for fiat currencies used in cross-conversions.
 * For commodities/crypto, their 'rate' is their current price against USD, which is dynamic.
 * These are mock rates for currency conversion of account/pip values.
 * @param currency The currency symbol (e.g., 'EUR', 'INR').
 * @returns The value of 1 unit of `currency` in USD.
 */
function getExchangeRateToUSD(currency: string): number {
  const rate = MOCK_EXCHANGE_RATES[currency];
  if (!rate) {
    // If a direct rate isn't found, it might be a commodity/crypto base (like XAU, BTC)
    // or an unknown currency. Assume 1.0, but usually entryPrice handles this for base values.
    console.warn(`Missing mock exchange rate for ${currency}. Assuming 1.0 for direct conversion.`);
    return 1.0;
  }
  return rate;
}

/**
 * Helper to convert an amount from one currency to another via USD.
 * @param amount The amount to convert.
 * @param fromCurrency The original currency.
 * @param toCurrency The target currency.
 * @returns The converted amount.
 */
function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
): number {
  if (fromCurrency === toCurrency) {
    return amount;
  }
  const amountInUSD = amount * getExchangeRateToUSD(fromCurrency);
  return amountInUSD / getExchangeRateToUSD(toCurrency);
}

/**
 * Calculates the number of pips between two prices.
 * @param price1 The first price.
 * @param price2 The second price.
 * @param currencyPair The currency pair.
 * @returns The distance in pips.
 */
function calculatePipsDistance(
  price1: number,
  price2: number,
  currencyPair: CurrencyPair, // Changed to take CurrencyPair
): number {
  const pipMultiplier = getPairPipMultiplier(currencyPair.symbol); // Get dynamic pip multiplier
  if (pipMultiplier === 0) return 0; // Avoid division by zero
  return Math.abs(price1 - price2) / pipMultiplier;
}

/**
 * Calculates the value of one pip for a standard lot based on the instrument's contract size.
 * This calculation is done in the quote currency of the pair, then converted to the account currency.
 *
 * @param currencyPair The selected currency pair.
 * @param accountCurrency The user's account currency.
 * @returns The value of one pip in the account currency for a standard lot.
 */
function calculatePipValue(
  currencyPair: CurrencyPair,
  accountCurrency: AccountCurrency,
): number {
  const { quote, contractSize } = currencyPair;
  const pipMultiplier = getPairPipMultiplier(currencyPair.symbol); // Get dynamic pip multiplier

  // Pip value in quote currency = pipMultiplier * contractSize (per lot)
  // For EUR/USD: 0.0001 * 100,000 = $10 USD
  // For USD/JPY: 0.01 * 100,000 = 1000 JPY
  // For XAU/USD: 0.01 * 100 = $1 USD (assuming 1 pip = $0.01, 1 lot = 100 oz)
  // For BTC/USDT: 1.0 * 1 = $1 USDT
  let pipValueInQuoteCurrency = pipMultiplier * contractSize;
  
  // Convert pip value from quote currency to account currency
  return convertCurrency(
    pipValueInQuoteCurrency,
    quote,
    accountCurrency,
  );
}

/**
 * Calculates the required margin for a given trade.
 * @param lotSize The calculated lot size.
 * @param leverage The leverage as a string (e.g., '1:500').
 * @param currencyPair The currency pair.
 * @param entryPrice The entry price of the trade (needed to value the position in USD for certain pairs).
 * @param accountCurrency The user's account currency.
 * @returns The margin required in the account currency.
 */
function calculateMarginRequired(
  lotSize: number,
  leverage: Leverage,
  currencyPair: CurrencyPair,
  entryPrice: number,
  accountCurrency: AccountCurrency,
): number {
  const leverageRatio = parseFloat(leverage.split(':')[1]);
  if (leverageRatio === 0) return Infinity; // Prevent division by zero

  const { base, contractSize } = currencyPair;

  let totalPositionValueInUSD: number;

  if (currencyPair.quote === 'USD' || currencyPair.quote === 'USDT') {
    // If quote is USD or USDT, the value of the base currency portion is directly calculated
    // e.g., for EUR/USD, the value is lotSize * contractSize * entryPrice USD
    // For XAU/USD, value is lotSize * contractSize * entryPrice USD
    totalPositionValueInUSD = lotSize * contractSize * entryPrice;
  } else if (currencyPair.base === 'USD' || currencyPair.base === 'USDT') {
    // If base is USD or USDT, the value of the base currency portion is already in USD
    // e.g., for USD/JPY, the value is lotSize * contractSize USD
    totalPositionValueInUSD = lotSize * contractSize;
  } else {
    // Cross pair (e.g., EUR/JPY, AUD/CAD). Convert base currency value to USD.
    // Value of base currency portion: lotSize * contractSize units of base.
    // Convert these units to USD using the exchange rate.
    totalPositionValueInUSD = lotSize * contractSize * getExchangeRateToUSD(base);
  }

  const marginInUSD = totalPositionValueInUSD / leverageRatio;
  return convertCurrency(marginInUSD, 'USD', accountCurrency);
}

/**
 * Calculates all relevant Forex lot size metrics.
 * @param inputs The input parameters for the calculation.
 * @returns An object containing all calculated results.
 */
export function calculateLotSize(
  inputs: CalculationInputs,
): CalculationResults {
  const {
    accountCurrency,
    accountSize,
    leverage,
    riskType,
    riskValue,
    currencyPair,
    entryPrice,
    stopLossPrice,
    takeProfitPrice,
    tradeType, // No direct use in current calculation logic but included in inputs
  } = inputs;

  // Validate inputs
  if (accountSize <= 0 || riskValue <= 0 || entryPrice <= 0 || stopLossPrice <= 0) {
    return {
      finalLotSize: 0,
      totalRiskAmount: 0,
      riskPerPip: 0,
      stopLossPips: 0,
      takeProfitPips: null,
      potentialProfitAtTP: null,
      marginRequired: 0,
      riskToRewardRatio: null,
      lotSizeCategory: 'micro',
      effectiveRiskPercentage: 0,
    };
  }

  // 1. Calculate Total Risk Amount in Account Currency
  let totalRiskAmount =
    riskType === 'percentage'
      ? (accountSize * riskValue) / 100
      : riskValue;

  // 2. Calculate Stop Loss Pips (distance from entry to SL)
  const stopLossPips = calculatePipsDistance(
    entryPrice,
    stopLossPrice,
    currencyPair, // Pass currencyPair
  );

  if (stopLossPips === 0) {
    return {
      finalLotSize: 0,
      totalRiskAmount,
      riskPerPip: 0,
      stopLossPips: 0,
      takeProfitPips: null,
      potentialProfitAtTP: null,
      marginRequired: 0,
      riskToRewardRatio: null,
      lotSizeCategory: 'micro',
      effectiveRiskPercentage: (totalRiskAmount / accountSize) * 100,
    };
  }

  // 3. Calculate Pip Value in Account Currency (for a standard lot)
  const pipValuePerStandardLot = calculatePipValue(
    currencyPair, // Pass currencyPair
    accountCurrency,
  );

  // 4. Calculate Recommended Lot Size
  // Lot Size = Total Risk Amount / (Stop Loss Pips * Pip Value Per Standard Lot)
  let recommendedLotSize =
    totalRiskAmount / (stopLossPips * pipValuePerStandardLot);
  
  // Round lot size to practical values (e.g., 2 decimal places for standard lots)
  const finalLotSize = Math.max(0.01, parseFloat(recommendedLotSize.toFixed(2)));

  // 5. Recalculate Total Risk Amount based on finalLotSize (for accuracy)
  const actualRiskAmount = finalLotSize * stopLossPips * pipValuePerStandardLot;
  const effectiveRiskPercentage = (actualRiskAmount / accountSize) * 100;

  // 6. Calculate Risk per Pip
  const riskPerPip = finalLotSize * pipValuePerStandardLot;

  // 7. Calculate Potential Profit at TP and Take Profit Pips
  let potentialProfitAtTP: number | null = null;
  let takeProfitPips: number | null = null;
  let riskToRewardRatio: number | null = null;

  if (takeProfitPrice && takeProfitPrice > 0) {
    takeProfitPips = calculatePipsDistance(
      entryPrice,
      takeProfitPrice,
      currencyPair, // Pass currencyPair
    );
    potentialProfitAtTP = finalLotSize * (takeProfitPips || 0) * pipValuePerStandardLot;
    if (stopLossPips > 0) {
      riskToRewardRatio = (takeProfitPips || 0) / stopLossPips;
    }
  }

  // 8. Calculate Margin Required
  const marginRequired = calculateMarginRequired(
    finalLotSize,
    leverage,
    currencyPair,
    entryPrice, // Pass entryPrice for margin calculation
    accountCurrency,
  );

  // Determine lot size category for display purposes
  let lotSizeCategory: CalculationResults['lotSizeCategory'] = 'micro';
  if (finalLotSize >= 1.0) {
    lotSizeCategory = 'standard';
  } else if (finalLotSize >= 0.1) {
    lotSizeCategory = 'mini';
  }

  return {
    finalLotSize: isNaN(finalLotSize) ? 0 : finalLotSize,
    totalRiskAmount: isNaN(actualRiskAmount) ? 0 : actualRiskAmount,
    riskPerPip: isNaN(riskPerPip) ? 0 : riskPerPip,
    stopLossPips: isNaN(stopLossPips) ? 0 : stopLossPips,
    takeProfitPips: isNaN(takeProfitPips as number) ? null : takeProfitPips, // Store calculated TP Pips
    potentialProfitAtTP: isNaN(potentialProfitAtTP as number) ? null : potentialProfitAtTP,
    marginRequired: isNaN(marginRequired) ? 0 : marginRequired,
    riskToRewardRatio: isNaN(riskToRewardRatio as number) ? null : riskToRewardRatio,
    lotSizeCategory,
    effectiveRiskPercentage: isNaN(effectiveRiskPercentage) ? 0 : effectiveRiskPercentage,
  };
}