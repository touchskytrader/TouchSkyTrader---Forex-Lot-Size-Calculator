import React, { useState, useEffect, useCallback } from 'react';
import {
  AccountCurrency,
  CalculationInputs,
  CalculationResults,
  CurrencyPair,
  Leverage,
  RiskLevel,
  RiskType,
  TradeType,
} from './types';
import { calculateLotSize } from './services/forexCalculatorService';
import {
  ACCOUNT_CURRENCIES,
  ALL_CURRENCY_PAIRS,
  CURRENCY_PAIRS,
  LEVERAGE_OPTIONS,
  RISK_PERCENTAGE_THRESHOLDS,
  TRADE_TYPES,
  getPairPipMultiplier, // Import the new helper function
} from './constants';
import Dropdown from './components/Dropdown';
import NumericInput from './components/NumericInput';
import ThemeToggle from './components/ThemeToggle';
import RiskIndicator from './components/RiskIndicator';

function App() {
  const [accountCurrency, setAccountCurrency] = useState<AccountCurrency>('USD');
  const [accountSize, setAccountSize] = useState<number | ''>(10000);
  const [leverage, setLeverage] = useState<Leverage>('1:500');
  const [riskType, setRiskType] = useState<RiskType>('percentage');
  const [riskValue, setRiskValue] = useState<number | ''>(1); // 1% or 1 unit of currency
  const [currencyPair, setCurrencyPair] = useState<CurrencyPair>(
    ALL_CURRENCY_PAIRS[0], // Default to EUR/USD
  );
  const [tradeType, setTradeType] = useState<TradeType>('buy');

  const [entryPrice, setEntryPrice] = useState<number | ''>(1.0700);

  // Helper function to calculate pips from price distance
  const getPipsFromPrices = useCallback((entry: number | '', target: number | '', pair: CurrencyPair): number | '' => {
    const multiplier = getPairPipMultiplier(pair.symbol);
    if (typeof entry !== 'number' || typeof target !== 'number' || multiplier === 0) {
      return '';
    }
    if (target <= 0) return '';
    return Math.abs(entry - target) / multiplier;
  }, []);

  // Helper function to calculate price from pips
  const getPriceFromPips = useCallback((entry: number | '', pips: number | '', pair: CurrencyPair, type: TradeType, isSL: boolean): number | '' => {
    const multiplier = getPairPipMultiplier(pair.symbol);
    if (typeof entry !== 'number' || typeof pips !== 'number' || multiplier === 0) {
      return '';
    }
    const priceChange = pips * multiplier;
    if (type === 'buy') {
      return isSL ? entry - priceChange : entry + priceChange;
    } else { // 'sell'
      return isSL ? entry + priceChange : entry - priceChange;
    }
  }, []);

  // Initial values for SL/TP inputs and their effective calculation values
  const initialEntryPrice = 1.0700;
  const initialSLPrice = 1.0650;
  const initialTPPrice = 1.0800;
  // Use the dynamic pip multiplier for initial state
  const initialPipMultiplier = getPairPipMultiplier(ALL_CURRENCY_PAIRS[0].symbol);

  const [stopLossPriceInput, setStopLossPriceInput] = useState<number | ''>(initialSLPrice);
  const [stopLossPipsInput, setStopLossPipsInput] = useState<number | ''>(
    getPipsFromPrices(initialEntryPrice, initialSLPrice, ALL_CURRENCY_PAIRS[0])
  );
  const [effectiveStopLossPriceForCalc, setEffectiveStopLossPriceForCalc] = useState<number | ''>(initialSLPrice);
  // NEW: State to track which SL field was last edited
  const [lastEditedSLField, setLastEditedSLField] = useState<'price' | 'pips' | null>(
    initialSLPrice !== '' ? 'price' : null
  );

  const [takeProfitPriceInput, setTakeProfitPriceInput] = useState<number | ''>(initialTPPrice);
  const [takeProfitPipsInput, setTakeProfitPipsInput] = useState<number | ''>(
    getPipsFromPrices(initialEntryPrice, initialTPPrice, ALL_CURRENCY_PAIRS[0])
  );
  const [effectiveTakeProfitPriceForCalc, setEffectiveTakeProfitPriceForCalc] = useState<number | ''>(initialTPPrice);
  // NEW: State to track which TP field was last edited
  const [lastEditedTPField, setLastEditedTPField] = useState<'price' | 'pips' | null>(
    initialTPPrice !== '' ? 'price' : null
  );

  const [results, setResults] = useState<CalculationResults | null>(null);

  // Centralized function to update SL display and calculation values
  const updateSLValues = useCallback((editedField: 'price' | 'pips', value: number | '') => {
    // Fix: Check for empty string or non-positive number for entryPrice
    if (entryPrice === '' || entryPrice <= 0 || !currencyPair) {
      setStopLossPriceInput('');
      setStopLossPipsInput('');
      setEffectiveStopLossPriceForCalc('');
      setLastEditedSLField(null); // Clear last edited field if base data is invalid
      return;
    }

    const currentEntryPrice = entryPrice;
    // const currentPipMultiplier = currencyPair.pipMultiplier; // Removed, now dynamic

    setLastEditedSLField(editedField); // Mark this field as the last edited

    if (editedField === 'price') {
      setStopLossPriceInput(value);
      setEffectiveStopLossPriceForCalc(value);
      if (value !== '') {
        const derivedPips = getPipsFromPrices(currentEntryPrice, value, currencyPair);
        setStopLossPipsInput(derivedPips);
      } else {
        setStopLossPipsInput('');
      }
    } else { // editedField === 'pips'
      setStopLossPipsInput(value);
      if (value !== '') {
        const derivedPrice = getPriceFromPips(currentEntryPrice, value, currencyPair, tradeType, true);
        setStopLossPriceInput(derivedPrice);
        setEffectiveStopLossPriceForCalc(derivedPrice);
      } else {
        setStopLossPriceInput('');
        setEffectiveStopLossPriceForCalc('');
      }
    }
  }, [entryPrice, currencyPair, tradeType, getPipsFromPrices, getPriceFromPips]);

  // Centralized function to update TP display and calculation values
  const updateTPValues = useCallback((editedField: 'price' | 'pips', value: number | '') => {
    // Fix: Check for empty string or non-positive number for entryPrice
    if (entryPrice === '' || entryPrice <= 0 || !currencyPair) {
      setTakeProfitPriceInput('');
      setTakeProfitPipsInput('');
      setEffectiveTakeProfitPriceForCalc('');
      setLastEditedTPField(null); // Clear last edited field if base data is invalid
      return;
    }

    const currentEntryPrice = entryPrice;
    // const currentPipMultiplier = currencyPair.pipMultiplier; // Removed, now dynamic

    setLastEditedTPField(editedField); // Mark this field as the last edited

    if (editedField === 'price') {
      setTakeProfitPriceInput(value);
      setEffectiveTakeProfitPriceForCalc(value);
      if (value !== '') {
        const derivedPips = getPipsFromPrices(currentEntryPrice, value, currencyPair);
        setTakeProfitPipsInput(derivedPips);
      } else {
        setTakeProfitPipsInput('');
      }
    } else { // editedField === 'pips'
      setTakeProfitPipsInput(value);
      if (value !== '') {
        const derivedPrice = getPriceFromPips(currentEntryPrice, value, currencyPair, tradeType, false);
        setTakeProfitPriceInput(derivedPrice);
        setEffectiveTakeProfitPriceForCalc(derivedPrice);
      } else {
        setTakeProfitPriceInput('');
        setEffectiveTakeProfitPriceForCalc('');
      }
    }
  }, [entryPrice, currencyPair, tradeType, getPipsFromPrices, getPriceFromPips]);

  const performCalculation = useCallback(() => {
    // Basic validation for mandatory fields
    if (
      accountSize === '' ||
      riskValue === '' ||
      entryPrice === '' ||
      currencyPair === null ||
      effectiveStopLossPriceForCalc === '' // Now depends on this effective value
    ) {
      setResults(null);
      return;
    }

    const inputs: CalculationInputs = {
      accountCurrency,
      accountSize: accountSize as number,
      leverage,
      riskType,
      riskValue: riskValue as number,
      currencyPair,
      entryPrice: entryPrice as number,
      stopLossPrice: effectiveStopLossPriceForCalc as number, // Use the effective SL price
      takeProfitPrice: effectiveTakeProfitPriceForCalc === '' ? undefined : (effectiveTakeProfitPriceForCalc as number), // Use effective TP price (optional)
      tradeType,
    };
    const calculatedResults = calculateLotSize(inputs);
    setResults(calculatedResults);
  }, [
    accountCurrency,
    accountSize,
    leverage,
    riskType,
    riskValue,
    currencyPair,
    entryPrice,
    effectiveStopLossPriceForCalc,
    effectiveTakeProfitPriceForCalc,
    tradeType,
  ]);

  useEffect(() => {
    performCalculation();
  }, [performCalculation]);

  // Effect to re-calculate display values when external factors change (entry, pair, tradeType)
  // This effect ensures that the most recently edited field acts as the anchor for recalculation.
  useEffect(() => {
    // Fix: Check for empty string or non-positive number for entryPrice
    if (entryPrice === '' || entryPrice <= 0 || !currencyPair) {
      // Clear all if fundamental inputs are missing
      setStopLossPriceInput('');
      setStopLossPipsInput('');
      setEffectiveStopLossPriceForCalc('');
      setLastEditedSLField(null);

      setTakeProfitPriceInput('');
      setTakeProfitPipsInput('');
      setEffectiveTakeProfitPriceForCalc('');
      setLastEditedTPField(null);
      return;
    }

    const currentEntryPrice = entryPrice;
    // const currentPipMultiplier = currencyPair.pipMultiplier; // Removed, now dynamic

    // --- Stop Loss Resync ---
    if (lastEditedSLField === 'price' && stopLossPriceInput !== '') {
      // User last entered price, so keep price fixed, re-derive pips
      const derivedPips = getPipsFromPrices(currentEntryPrice, stopLossPriceInput, currencyPair);
      setStopLossPipsInput(derivedPips);
      setEffectiveStopLossPriceForCalc(stopLossPriceInput); // Price is still the source of truth
    } else if (lastEditedSLField === 'pips' && stopLossPipsInput !== '') {
      // User last entered pips, so keep pips fixed, re-derive price
      const derivedPrice = getPriceFromPips(currentEntryPrice, stopLossPipsInput, currencyPair, tradeType, true);
      setStopLossPriceInput(derivedPrice);
      setEffectiveStopLossPriceForCalc(derivedPrice); // Derived price is new source of truth
    } else {
      // No explicit last input, or value was cleared. Clear related display/calc states.
      setStopLossPriceInput('');
      setStopLossPipsInput('');
      setEffectiveStopLossPriceForCalc('');
      setLastEditedSLField(null);
    }

    // --- Take Profit Resync ---
    if (lastEditedTPField === 'price' && takeProfitPriceInput !== '') {
      const derivedPips = getPipsFromPrices(currentEntryPrice, takeProfitPriceInput, currencyPair);
      setTakeProfitPipsInput(derivedPips);
      setEffectiveTakeProfitPriceForCalc(takeProfitPriceInput);
    } else if (lastEditedTPField === 'pips' && takeProfitPipsInput !== '') {
      const derivedPrice = getPriceFromPips(currentEntryPrice, takeProfitPipsInput, currencyPair, tradeType, false);
      setTakeProfitPriceInput(derivedPrice);
      setEffectiveTakeProfitPriceForCalc(derivedPrice);
    } else {
      setTakeProfitPriceInput('');
      setTakeProfitPipsInput('');
      setEffectiveTakeProfitPriceForCalc('');
      setLastEditedTPField(null);
    }

  }, [
    entryPrice,
    currencyPair,
    tradeType,
    lastEditedSLField,
    stopLossPriceInput, // Values of the inputs are needed to re-derive from them
    stopLossPipsInput,
    lastEditedTPField,
    takeProfitPriceInput,
    takeProfitPipsInput,
    getPipsFromPrices,
    getPriceFromPips,
  ]);

  // --- Input Change Handlers ---
  const handleEntryPriceChange = (value: number | '') => {
    setEntryPrice(value);
  };

  const handleSLPriceInputChange = (value: number | '') => {
    updateSLValues('price', value);
  };

  const handleSLPipsInputChange = (value: number | '') => {
    updateSLValues('pips', value);
  };

  const handleTPPriceInputChange = (value: number | '') => {
    updateTPValues('price', value);
  };

  const handleTPPipsInputChange = (value: number | '') => {
    updateTPValues('pips', value);
  };
  // --- End Input Change Handlers ---


  const getRiskLevel = (effectiveRiskPercentage: number): RiskLevel => {
    if (effectiveRiskPercentage <= RISK_PERCENTAGE_THRESHOLDS.LOW_MAX) {
      return RiskLevel.LOW;
    } else if (effectiveRiskPercentage <= RISK_PERCENTAGE_THRESHOLDS.MEDIUM_MAX) {
      return RiskLevel.MEDIUM;
    } else {
      return RiskLevel.HIGH;
    }
  };

  const formatCurrency = (amount: number | null | undefined): string => {
    if (amount === null || amount === undefined || isNaN(amount)) return 'N/A';
    return amount.toLocaleString('en-US', {
      style: 'currency',
      currency: accountCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatNumber = (num: number | null | undefined, decimals: number = 2): string => {
    if (num === null || num === undefined || isNaN(num)) return 'N/A';
    // For pips, typically 1 decimal place is common
    return num.toFixed(decimals);
  };

  const formatLotSize = (lotSize: number | null | undefined): string => {
    if (lotSize === null || lotSize === undefined || isNaN(lotSize)) return '0.00';
    // Ensure at least two decimal places for lot size
    return lotSize.toFixed(2);
  };

  const handleCopyLotSize = () => {
    if (results?.finalLotSize) {
      navigator.clipboard.writeText(formatLotSize(results.finalLotSize)).then(
        () => {
          alert(`Lot size ${formatLotSize(results.finalLotSize)} copied to clipboard!`);
        },
        (err) => {
          console.error('Failed to copy lot size: ', err);
          alert('Failed to copy lot size.');
        },
      );
    }
  };

  // Dynamically get pipPriceStep using the new helper function
  const pipPriceStep = getPairPipMultiplier(currencyPair.symbol);
  const pipsStep = 0.1; // Common step for pips input

  return (
    <div className="min-h-screen flex flex-col items-center py-8 px-4 sm:px-6 lg:px-8 bg-tst-white dark:bg-tst-black text-tst-black dark:text-tst-white transition-colors duration-300">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <h1 className="text-4xl font-extrabold text-tst-blue mb-8 text-center">
        Forex Lot Size Calculator
      </h1>
      <p className="text-lg text-center max-w-2xl mb-10 text-gray-700 dark:text-gray-300">
        Calculate your precise lot size based on your account, risk, and trade
        parameters to enhance your risk management.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full max-w-6xl">
        {/* Input Form */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-tst-blue mb-6">Trade Details</h2>
          <form>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Dropdown<AccountCurrency>
                id="accountCurrency"
                label="Account Currency"
                options={ACCOUNT_CURRENCIES}
                value={accountCurrency}
                onChange={setAccountCurrency}
              />
              <NumericInput
                id="accountSize"
                label="Account Size"
                value={accountSize}
                onChange={setAccountSize}
                min={0}
                step={100}
                placeholder="e.g., 10000"
                unit={accountCurrency}
              />
            </div>

            <Dropdown<Leverage>
              id="leverage"
              label="Leverage"
              options={LEVERAGE_OPTIONS}
              value={leverage}
              onChange={setLeverage}
            />

            <div className="mb-4">
              <label className="block text-sm font-medium text-tst-black dark:text-tst-white mb-2">
                Risk Type
              </label>
              <div className="flex space-x-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="riskType"
                    value="percentage"
                    checked={riskType === 'percentage'}
                    onChange={() => setRiskType('percentage')}
                    className="form-radio text-tst-blue h-4 w-4"
                  />
                  <span className="ml-2 text-tst-black dark:text-tst-white">Risk %</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="riskType"
                    value="amount"
                    checked={riskType === 'amount'}
                    onChange={() => setRiskType('amount')}
                    className="form-radio text-tst-blue h-4 w-4"
                  />
                  <span className="ml-2 text-tst-black dark:text-tst-white">Risk Amount</span>
                </label>
              </div>
            </div>

            <NumericInput
              id="riskValue"
              label={riskType === 'percentage' ? 'Risk Percentage' : 'Risk Amount'}
              value={riskValue}
              onChange={setRiskValue}
              min={0.01}
              step={riskType === 'percentage' ? 0.1 : 1}
              placeholder={riskType === 'percentage' ? 'e.g., 1' : 'e.g., 100'}
              unit={riskType === 'percentage' ? '%' : accountCurrency}
            />

            <Dropdown<CurrencyPair>
              id="currencyPair"
              label="Currency Pair"
              options={CURRENCY_PAIRS.flatMap((cat) =>
                cat.pairs.map((pair) => ({
                  value: pair,
                  label: `${pair.symbol} (${cat.category})`,
                })),
              )}
              value={currencyPair}
              onChange={setCurrencyPair}
            />

            {/* NEW: Trade Type Selection */}
            <Dropdown<TradeType>
              id="tradeType"
              label="Trade Type"
              options={TRADE_TYPES}
              value={tradeType}
              onChange={setTradeType}
            />

            {/* Entry Price */}
            <NumericInput
              id="entryPrice"
              label="Entry Price"
              value={entryPrice}
              onChange={handleEntryPriceChange}
              min={0}
              step={pipPriceStep}
              placeholder="e.g., 1.0700"
            />

            {/* NEW: Stop Loss Price & Pips */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <NumericInput
                id="stopLossPrice"
                label="Stop Loss Price"
                value={stopLossPriceInput}
                onChange={handleSLPriceInputChange}
                min={0}
                step={pipPriceStep}
                placeholder="e.g., 1.0650"
              />
              <NumericInput
                id="stopLossPips"
                label="Stop Loss Pips"
                value={stopLossPipsInput}
                onChange={handleSLPipsInputChange}
                min={0}
                step={pipsStep}
                placeholder="e.g., 50"
                unit="pips"
              />
            </div>

            {/* NEW: Take Profit Price & Pips */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <NumericInput
                id="takeProfitPrice"
                label="Take Profit Price (Optional)"
                value={takeProfitPriceInput}
                onChange={handleTPPriceInputChange}
                min={0}
                step={pipPriceStep}
                placeholder="e.g., 1.0800"
              />
              <NumericInput
                id="takeProfitPips"
                label="Take Profit Pips (Optional)"
                value={takeProfitPipsInput}
                onChange={handleTPPipsInputChange}
                min={0}
                step={pipsStep}
                placeholder="e.g., 100"
                unit="pips"
              />
            </div>

          </form>
        </div>

        {/* Results Display */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-tst-blue mb-6">Calculation Results</h2>

          {results && results.finalLotSize > 0 ? (
            <div>
              {/* Final Lot Size */}
              <div className="bg-tst-blue text-tst-white p-6 rounded-lg text-center mb-6 shadow-md">
                <p className="text-sm font-medium opacity-80 mb-1">Recommended Lot Size</p>
                <p className="text-5xl font-extrabold">{formatLotSize(results.finalLotSize)}</p>
                <p className="text-sm font-medium opacity-80 mt-1">({results.lotSizeCategory} lot)</p>
              </div>

              {/* Trade Summary */}
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="font-medium text-gray-700 dark:text-gray-300">Pair:</span>
                  <span className="font-semibold text-tst-black dark:text-tst-white">{currencyPair.symbol}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="font-medium text-gray-700 dark:text-gray-300">Trade Type:</span>
                  <span className="font-semibold text-tst-black dark:text-tst-white">{tradeType === 'buy' ? 'Buy (Long)' : 'Sell (Short)'}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="font-medium text-gray-700 dark:text-gray-300">Risk Level:</span>
                  <span>
                    <RiskIndicator level={getRiskLevel(results.effectiveRiskPercentage)} />
                    <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">({formatNumber(results.effectiveRiskPercentage, 2)}%)</span>
                  </span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="font-medium text-gray-700 dark:text-gray-300">Total Risk:</span>
                  <span className="font-semibold text-tst-black dark:text-tst-white">{formatCurrency(results.totalRiskAmount)}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="font-medium text-gray-700 dark:text-gray-300">Risk per Pip:</span>
                  <span className="font-semibold text-tst-black dark:text-tst-white">{formatCurrency(results.riskPerPip)}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="font-medium text-gray-700 dark:text-gray-300">Stop Loss Pips:</span>
                  <span className="font-semibold text-tst-black dark:text-tst-white">{formatNumber(results.stopLossPips, 1)} pips</span>
                </div>
                {results.takeProfitPips !== null && (
                  <div className="flex justify-between items-center pb-2 border-b border-gray-200 dark:border-gray-700">
                    <span className="font-medium text-gray-700 dark:text-gray-300">Take Profit Pips:</span>
                    <span className="font-semibold text-tst-black dark:text-tst-white">{formatNumber(results.takeProfitPips, 1)} pips</span>
                  </div>
                )}
                {results.potentialProfitAtTP !== null && (
                  <div className="flex justify-between items-center pb-2 border-b border-gray-200 dark:border-gray-700">
                    <span className="font-medium text-gray-700 dark:text-gray-300">Potential Profit (at TP):</span>
                    <span className="font-semibold text-green-500">{formatCurrency(results.potentialProfitAtTP)}</span>
                  </div>
                )}
                {results.riskToRewardRatio !== null && (
                  <div className="flex justify-between items-center pb-2 border-b border-gray-200 dark:border-gray-700">
                    <span className="font-medium text-gray-700 dark:text-gray-300">Risk-to-Reward (R:R):</span>
                    <span className="font-semibold text-tst-black dark:text-tst-white">1:{formatNumber(results.riskToRewardRatio, 2)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-700 dark:text-gray-300">Margin Required:</span>
                  <span className="font-semibold text-tst-black dark:text-tst-white">{formatCurrency(results.marginRequired)}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-8 flex justify-center">
                <button
                  onClick={handleCopyLotSize}
                  className="px-6 py-3 bg-tst-blue hover:bg-tst-dark-blue text-white font-bold rounded-md shadow-md transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-tst-blue focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                >
                  Copy Lot Size
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              <p className="text-lg mb-2">Please enter valid trade details to calculate lot size.</p>
              <p>Ensure all required fields are filled and values are positive, and Stop Loss is defined.</p>
            </div>
          )}
        </div>
      </div>

      <footer className="mt-16 text-center text-gray-600 dark:text-gray-400 text-sm">
        &copy; {new Date().getFullYear()} TouchSkyTrader. All rights reserved.
      </footer>
    </div>
  );
}

export default App;