import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  AccountCurrency,
  CalculationInputs,
  CalculationResults,
  CurrencyPair,
  Leverage,
  RiskLevel,
  RiskType,
  TradeType,
  HistoryEntry, // Import HistoryEntry
} from './types';
import { calculateLotSize, fetchMarketPrice } from './services/forexCalculatorService'; // Import fetchMarketPrice
import {
  ACCOUNT_CURRENCIES,
  ALL_CURRENCY_PAIRS,
  LEVERAGE_OPTIONS,
  RISK_PERCENTAGE_THRESHOLDS,
  getPairPipMultiplier, // Import the new helper function
} from './constants';
import Dropdown from './components/Dropdown';
import NumericInput from './components/NumericInput';
import ThemeToggle from './components/ThemeToggle';
import RiskIndicator from './components/RiskIndicator';
import AutocompleteInput from './components/AutocompleteInput';

function App() {
  const [accountCurrency, setAccountCurrency] = useState<AccountCurrency>('USD');
  const [accountSize, setAccountSize] = useState<number | ''>(10000);
  const [leverage, setLeverage] = useState<Leverage>('1:500');
  const [riskType, setRiskType] = useState<RiskType>('percentage');
  const [riskValue, setRiskValue] = useState<number | ''>(1); // 1% or 1 unit of currency
  
  // State for manual currency pair input
  const [currencyPairInputSymbol, setCurrencyPairInputSymbol] = useState<string>(ALL_CURRENCY_PAIRS[0].symbol);
  const [currencyPair, setCurrencyPair] = useState<CurrencyPair>(
    ALL_CURRENCY_PAIRS[0], // Default to EUR/USD
  );
  
  const [tradeType, setTradeType] = useState<TradeType>('buy');

  // Entry price will now be auto-filled, start as empty
  const [entryPrice, setEntryPrice] = useState<number | ''>('');

  // Helper function to calculate pips from price distance
  const getPipsFromPrices = useCallback((entry: number | '', target: number | '', pair: CurrencyPair): number | '' => {
    const multiplier = getPairPipMultiplier(pair.symbol);
    if (typeof entry !== 'number' || entry <= 0 || typeof target !== 'number' || target <= 0 || multiplier === 0) {
      return '';
    }
    return Math.abs(entry - target) / multiplier;
  }, []);

  // Helper function to calculate price from pips
  const getPriceFromPips = useCallback((entry: number | '', pips: number | '', pair: CurrencyPair, type: TradeType, isSL: boolean): number | '' => {
    const multiplier = getPairPipMultiplier(pair.symbol);
    if (typeof entry !== 'number' || entry <= 0 || typeof pips !== 'number' || pips < 0 || multiplier === 0) {
      return '';
    }
    const priceChange = pips * multiplier;
    if (type === 'buy') {
      const calculatedPrice = isSL ? entry - priceChange : entry + priceChange; // SL subtracts, TP adds for Buy
      return calculatedPrice > 0 ? calculatedPrice : ''; // Ensure price is not negative
    } else { // 'sell'
      const calculatedPrice = isSL ? entry + priceChange : entry - priceChange; // SL adds, TP subtracts for Sell
      return calculatedPrice > 0 ? calculatedPrice : ''; // Ensure price is not negative
    }
  }, []);

  // Initial values for SL/TP inputs and their effective calculation values (will be re-calculated after entryPrice autofills)
  const [stopLossPriceInput, setStopLossPriceInput] = useState<number | ''>('');
  const [stopLossPipsInput, setStopLossPipsInput] = useState<number | ''>('');
  const [effectiveStopLossPriceForCalc, setEffectiveStopLossPriceForCalc] = useState<number | ''>('');
  const [lastEditedSLField, setLastEditedSLField] = useState<'price' | 'pips' | null>(null);

  const [takeProfitPriceInput, setTakeProfitPriceInput] = useState<number | ''>('');
  const [takeProfitPipsInput, setTakeProfitPipsInput] = useState<number | ''>('');
  const [effectiveTakeProfitPriceForCalc, setEffectiveTakeProfitPriceForCalc] = useState<number | ''>('');
  const [lastEditedTPField, setLastEditedTPField] = useState<'price' | 'pips' | null>(null);

  const [results, setResults] = useState<CalculationResults | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]); // NEW: History state
  const [loadConfirmation, setLoadConfirmation] = useState<string | null>(null); // NEW: Confirmation message state
  const loadConfirmationTimeoutRef = useRef<number | null>(null); // Ref to store timeout ID
  const [hasCalculated, setHasCalculated] = useState(false); // NEW: Track if calculate button has been pressed
  const [calcError, setCalcError] = useState<string | null>(null); // NEW: Error state for calculations
  const [showResults, setShowResults] = useState(false); // NEW: State to toggle between form and results view


  // NEW: Real-time risk conversion display states
  const [calculatedRiskAmountDisplay, setCalculatedRiskAmountDisplay] = useState<number | ''>('');
  const [calculatedRiskPercentageDisplay, setCalculatedRiskPercentageDisplay] = useState<number | ''>('');


  // NEW: Load history from localStorage on mount
  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem('forexCalculatorHistory');
      if (storedHistory) {
        const parsedHistory: HistoryEntry[] = JSON.parse(storedHistory);
        setHistory(parsedHistory);
      }
    } catch (error) {
      console.error("Failed to load history from localStorage", error);
      localStorage.removeItem('forexCalculatorHistory'); // Clear corrupted history
    }
  }, []);

  // NEW: Save history to localStorage whenever history state changes
  useEffect(() => {
    console.log("Saving history to localStorage:", history); // Log for debugging
    localStorage.setItem('forexCalculatorHistory', JSON.stringify(history));
  }, [history]);

  // NEW: Effect to auto-dismiss load confirmation message
  useEffect(() => {
    if (loadConfirmation) {
      if (loadConfirmationTimeoutRef.current) {
        clearTimeout(loadConfirmationTimeoutRef.current);
      }
      loadConfirmationTimeoutRef.current = window.setTimeout(() => {
        setLoadConfirmation(null);
      }, 3000); // Message disappears after 3 seconds
    }

    return () => {
      if (loadConfirmationTimeoutRef.current) {
        clearTimeout(loadConfirmationTimeoutRef.current);
      }
    };
  }, [loadConfirmation]);

  // NEW: Effect for real-time risk conversion display
  useEffect(() => {
    if (typeof accountSize !== 'number' || accountSize <= 0 || typeof riskValue !== 'number' || riskValue <= 0) {
      setCalculatedRiskAmountDisplay('');
      setCalculatedRiskPercentageDisplay('');
      return;
    }

    if (riskType === 'percentage') {
      const amount = (accountSize * riskValue) / 100;
      setCalculatedRiskAmountDisplay(parseFloat(amount.toFixed(2))); // Round for display
      setCalculatedRiskPercentageDisplay(riskValue);
    } else { // riskType === 'amount'
      const percentage = (riskValue / accountSize) * 100;
      setCalculatedRiskPercentageDisplay(parseFloat(percentage.toFixed(2))); // Round for display
      setCalculatedRiskAmountDisplay(riskValue);
    }
  }, [accountSize, riskType, riskValue, accountCurrency]); // Dependencies for real-time risk conversion

  // NEW: Effect to manage currencyPair object from input symbol
  useEffect(() => {
    if (!currencyPairInputSymbol) {
      setCurrencyPair({ symbol: '', base: '', quote: '', contractSize: 0 });
      return;
    }

    const matchedPair = ALL_CURRENCY_PAIRS.find(
      (p) => p.symbol.toLowerCase() === currencyPairInputSymbol.toLowerCase(),
    );

    if (matchedPair) {
      setCurrencyPair(matchedPair);
    } else {
      // Handle custom/unmatched pair
      let base = currencyPairInputSymbol;
      let quote = '';
      const parts = currencyPairInputSymbol.split('/');
      if (parts.length === 2) {
        base = parts[0];
        quote = parts[1];
      }

      let assumedContractSize = 100_000; // Default for FX-like pairs
      if (base.includes("XAU") || base.includes("XAG")) {
        assumedContractSize = 100; // e.g., Gold 100oz contract
      } else if (base.includes("BTC") || base.includes("ETH")) {
        assumedContractSize = 1; // Crypto typically 1 unit
      } else if (base.includes("NAS100") || base.includes("US30")) {
        assumedContractSize = 10; // Indices often have smaller contract sizes
      }

      setCurrencyPair({
        symbol: currencyPairInputSymbol,
        base: base.toUpperCase(),
        quote: quote.toUpperCase(),
        contractSize: assumedContractSize,
      });
    }
    // Also clear previous entry price and reset calculation status
    setEntryPrice('');
    setHasCalculated(false);
    setCalcError(null); // Clear error when currency pair changes

    // Also clear SL/TP inputs and effective values, as they depend on entry price
    setStopLossPriceInput('');
    setStopLossPipsInput('');
    setEffectiveStopLossPriceForCalc('');
    setLastEditedSLField(null);

    setTakeProfitPriceInput('');
    setTakeProfitPipsInput('');
    setEffectiveTakeProfitPriceForCalc('');
    setLastEditedTPField(null);

  }, [currencyPairInputSymbol]); // Dependency array: run when currencyPairInputSymbol changes

  // NEW: Effect to auto-fill Entry Price when Currency Pair object changes
  useEffect(() => {
    // Only fetch if currencyPair has a symbol (i.e., not the initial empty state)
    // and if the symbol is not empty (e.g., if user clears the input)
    if (currencyPair && currencyPair.symbol) {
      const fetchPrice = async () => {
        const price = await fetchMarketPrice(currencyPair.symbol);
        if (typeof price === 'number' && price > 0) {
          setEntryPrice(price);
        } else {
          console.warn(`No mock market price found for ${currencyPair.symbol}. Manual entry required.`);
          // If no mock price, entryPrice remains empty, prompting manual input
        }
      };
      fetchPrice();
    } else {
      setEntryPrice(''); // Clear entry price if currencyPair becomes invalid/empty
    }
  }, [currencyPair]); // Dependency array: run when currencyPair object changes (which is set by currencyPairInputSymbol effect)


  // Centralized function to update SL display and calculation values
  const updateSLValues = useCallback((editedField: 'price' | 'pips', value: number | '') => {
    // Ensure entryPrice is a valid positive number BEFORE any further calculations
    if (typeof entryPrice !== 'number' || entryPrice <= 0 || !currencyPair || !currencyPair.symbol) {
      setStopLossPriceInput('');
      setStopLossPipsInput('');
      setEffectiveStopLossPriceForCalc('');
      setLastEditedSLField(null);
      return;
    }

    const currentEntryPrice = entryPrice;

    setLastEditedSLField(editedField);

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
    // Ensure entryPrice is a valid positive number BEFORE any further calculations
    if (typeof entryPrice !== 'number' || entryPrice <= 0 || !currencyPair || !currencyPair.symbol) {
      setTakeProfitPriceInput('');
      setTakeProfitPipsInput('');
      setEffectiveTakeProfitPriceForCalc('');
      setLastEditedTPField(null);
      return;
    }

    const currentEntryPrice = entryPrice;

    setLastEditedTPField(editedField);

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
    // Clear previous error if any before new calculation attempt
    setCalcError(null);

    // Basic validation before calculating
    if (
      typeof accountSize !== 'number' || accountSize <= 0 ||
      typeof riskValue !== 'number' || riskValue <= 0 ||
      typeof entryPrice !== 'number' || entryPrice <= 0 ||
      !currencyPair || !currencyPair.symbol || currencyPair.contractSize <= 0 ||
      typeof effectiveStopLossPriceForCalc !== 'number' || effectiveStopLossPriceForCalc <= 0
    ) {
      setCalcError("Please fill in all required trade details with valid positive numbers. Stop Loss Price must be defined and positive.");
      setResults(null);
      return;
    }

    // Special check for SL being too close to entry for calculation logic
    const stopLossPipsForCheck = getPipsFromPrices(entryPrice, effectiveStopLossPriceForCalc, currencyPair);
    // Use a small threshold, e.g., half of the smallest pip unit (pipPriceStep)
    const minPipDistance = getPairPipMultiplier(currencyPair.symbol) * 0.5; // Half a pip unit as threshold
    if (typeof stopLossPipsForCheck === 'number' && stopLossPipsForCheck < minPipDistance) {
      setCalcError("Stop Loss Price is too close to Entry Price. Please adjust for a valid calculation (minimum 1 pip distance).");
      setResults(null);
      return;
    }


    const inputs: CalculationInputs = {
      accountCurrency,
      accountSize: accountSize,
      leverage,
      riskType,
      riskValue: riskValue,
      currencyPair,
      entryPrice: entryPrice,
      stopLossPrice: effectiveStopLossPriceForCalc,
      takeProfitPrice: typeof effectiveTakeProfitPriceForCalc === 'number' && effectiveTakeProfitPriceForCalc > 0 ? effectiveTakeProfitPriceForCalc : undefined,
      tradeType,
    };

    const calculatedResults = calculateLotSize(inputs);

    // Post-calculation validation from the service results
    if (calculatedResults && (calculatedResults.finalLotSize <= 0 || isNaN(calculatedResults.finalLotSize) || isNaN(calculatedResults.totalRiskAmount) || isNaN(calculatedResults.marginRequired))) {
      setResults(null);
      setCalcError("Calculation failed: Please ensure Stop Loss Price is significantly different from Entry Price, and all input values are appropriate for a valid trade. Risk per pip might be extremely low, leading to negligible lot size.");
      console.log("Calculation resulted in invalid data, not adding to history.", calculatedResults);
    } else {
      setResults(calculatedResults);
      // Add to history logic
      if (calculatedResults && calculatedResults.finalLotSize > 0) { // This check should be sufficient now
        const newHistoryEntry: HistoryEntry = {
          id: Date.now().toString(), // Simple unique ID
          timestamp: new Date().toLocaleString(),
          inputs: {
            accountCurrency,
            accountSize,
            leverage,
            riskType,
            riskValue,
            currencyPair,
            tradeType,
            entryPrice,
            stopLossPriceInput,
            stopLossPipsInput,
            takeProfitPriceInput,
            takeProfitPipsInput,
            lastEditedSLField,
            lastEditedTPField,
          },
          results: calculatedResults,
        };
        setHistory((prevHistory) => [newHistoryEntry, ...prevHistory].slice(0, 10)); // Keep last 10 entries
      } else {
        // This else block might be redundant now if the above 'if' handles all invalid calcResults
        console.log("Calculation resulted in invalid data (finalLotSize was 0 or invalid), not adding to history.", calculatedResults);
      }
    }
  }, [ // dependencies
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
      stopLossPriceInput,
      stopLossPipsInput,
      takeProfitPriceInput,
      takeProfitPipsInput,
      lastEditedSLField,
      lastEditedTPField,
      getPipsFromPrices,
      getPairPipMultiplier,
  ]);

  // Effect to re-sync SL/TP inputs when entryPrice, currencyPair, or tradeType changes
  // This maintains real-time updates for the SL/TP input section, independent of main lot size calculation
  useEffect(() => {
    // Only re-sync if entryPrice is valid
    if (typeof entryPrice !== 'number' || entryPrice <= 0 || !currencyPair || !currencyPair.symbol) {
      // Clear SL/TP inputs if entryPrice or currencyPair become invalid
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

    // --- Stop Loss Resync ---
    if (lastEditedSLField === 'price' && typeof stopLossPriceInput === 'number' && stopLossPriceInput > 0) {
      const derivedPips = getPipsFromPrices(currentEntryPrice, stopLossPriceInput, currencyPair);
      setStopLossPipsInput(derivedPips);
      setEffectiveStopLossPriceForCalc(stopLossPriceInput);
    } else if (lastEditedSLField === 'pips' && typeof stopLossPipsInput === 'number' && stopLossPipsInput >= 0) {
      const derivedPrice = getPriceFromPips(currentEntryPrice, stopLossPipsInput, currencyPair, tradeType, true);
      setStopLossPriceInput(derivedPrice);
      setEffectiveStopLossPriceForCalc(derivedPrice);
    } else {
      // If no valid input or field was edited, clear values or reset to initial defaults if preferred
      // For now, clear to ensure no stale data if initial state was invalid
      setStopLossPriceInput('');
      setStopLossPipsInput('');
      setEffectiveStopLossPriceForCalc('');
      setLastEditedSLField(null);
    }

    // --- Take Profit Resync ---
    if (lastEditedTPField === 'price' && typeof takeProfitPriceInput === 'number' && takeProfitPriceInput > 0) {
      const derivedPips = getPipsFromPrices(currentEntryPrice, takeProfitPriceInput, currencyPair);
      setTakeProfitPipsInput(derivedPips);
      setEffectiveTakeProfitPriceForCalc(takeProfitPriceInput);
    } else if (lastEditedTPField === 'pips' && typeof takeProfitPipsInput === 'number' && takeProfitPipsInput >= 0) {
      const derivedPrice = getPriceFromPips(currentEntryPrice, takeProfitPipsInput, currencyPair, tradeType, false);
      setTakeProfitPriceInput(derivedPrice);
      setEffectiveTakeProfitPriceForCalc(derivedPrice);
    } else {
      // Clear or reset for TP
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
    stopLossPriceInput,
    stopLossPipsInput,
    lastEditedTPField,
    takeProfitPriceInput,
    takeProfitPipsInput,
    getPipsFromPrices,
    getPriceFromPips,
  ]);

  // --- Input Change Handlers ---
  const handleAccountCurrencyChange = (value: AccountCurrency) => {
    setAccountCurrency(value);
    setHasCalculated(false);
    setCalcError(null);
  };
  const handleAccountSizeChange = (value: number | '') => {
    setAccountSize(value);
    setHasCalculated(false);
    setCalcError(null);
  };
  const handleLeverageChange = (value: Leverage) => {
    setLeverage(value);
    setHasCalculated(false);
    setCalcError(null);
  };
  const handleRiskTypeChange = (value: RiskType) => {
    setRiskType(value);
    setHasCalculated(false);
    setCalcError(null);
  };
  const handleRiskValueChange = (value: number | '') => {
    setRiskValue(value);
    setHasCalculated(false);
    setCalcError(null);
  };
  const handleCurrencyPairInputSymbolChange = (value: string) => {
    setCurrencyPairInputSymbol(value);
    setHasCalculated(false);
    setCalcError(null);
  };
  const handleTradeTypeChange = (value: TradeType) => {
    setTradeType(value);
    setHasCalculated(false);
    setCalcError(null);
  };

  const handleEntryPriceChange = (value: number | '') => {
    setEntryPrice(value);
    setHasCalculated(false); // Reset calculation status on major input change
    setCalcError(null); // Clear error on input change
  };

  const handleSLPriceInputChange = (value: number | '') => {
    updateSLValues('price', value);
    setHasCalculated(false); // Reset calculation status on major input change
    setCalcError(null); // Clear error on input change
  };

  const handleSLPipsInputChange = (value: number | '') => {
    updateSLValues('pips', value);
    setHasCalculated(false); // Reset calculation status on major input change
    setCalcError(null); // Clear error on input change
  };

  const handleTPPriceInputChange = (value: number | '') => {
    updateTPValues('price', value);
    setHasCalculated(false); // Reset calculation status on major input change
    setCalcError(null); // Clear error on input change
  };

  const handleTPPipsInputChange = (value: number | '') => {
    updateTPValues('pips', value);
    setHasCalculated(false); // Reset calculation status on major input change
    setCalcError(null); // Clear error on input change
  };
  // --- End Input Change Handlers ---

  // NEW: Handle the calculate button click
  const handleCalculate = () => {
    setHasCalculated(true);
    performCalculation();
    setShowResults(true); // Switch view to results
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll to top
  };


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

  // FIX: Handle clearing all history
  const handleClearHistory = () => {
    if (window.confirm("Are you sure you want to clear all history?")) {
      console.log("Clearing history...");
      setHistory([]);
      setResults(null); // Clear current calculation results
      setHasCalculated(false); // Hide the results panel
      setCalcError(null); // Clear any active error
      console.log("History cleared. Results and calculation status reset.");
    }
  };

  // NEW: Handle loading a history entry
  const handleLoadHistoryEntry = useCallback((entry: HistoryEntry) => {
    setAccountCurrency(entry.inputs.accountCurrency);
    setAccountSize(entry.inputs.accountSize);
    setLeverage(entry.inputs.leverage);
    setRiskType(entry.inputs.riskType);
    setRiskValue(entry.inputs.riskValue);
    setCurrencyPairInputSymbol(entry.inputs.currencyPair.symbol); // Load the symbol into TextInput
    setTradeType(entry.inputs.tradeType);
    setEntryPrice(entry.inputs.entryPrice);

    setStopLossPriceInput(entry.inputs.stopLossPriceInput);
    setStopLossPipsInput(entry.inputs.stopLossPipsInput);
    setLastEditedSLField(entry.inputs.lastEditedSLField);

    setTakeProfitPriceInput(entry.inputs.takeProfitPriceInput);
    setTakeProfitPipsInput(entry.inputs.takeProfitPipsInput);
    setLastEditedTPField(entry.inputs.lastEditedTPField);
    
    // Load result and switch to result view
    setResults(entry.results);
    setHasCalculated(true); 
    setShowResults(true); 
    setCalcError(null); 
    
    // Show subtle confirmation message
    setLoadConfirmation('Calculation loaded successfully!');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

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

      {/* NEW: Load Confirmation Message */}
      {loadConfirmation && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-green-500 text-white px-6 py-3 rounded-md shadow-lg z-50 animate-fade-in-out">
          {loadConfirmation}
        </div>
      )}

      {/* Main Container - Single Column for View Switching */}
      <div className="w-full max-w-3xl">
        
        {/* VIEW 1: Input Form & History */}
        {!showResults ? (
          <>
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
                    onChange={handleAccountCurrencyChange}
                  />
                  <NumericInput
                    id="accountSize"
                    label="Account Size"
                    value={accountSize}
                    onChange={handleAccountSizeChange}
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
                    onChange={handleLeverageChange}
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
                        onChange={() => handleRiskTypeChange('percentage')}
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
                        onChange={() => handleRiskTypeChange('amount')}
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
                  onChange={handleRiskValueChange}
                  min={0.01}
                  max={riskType === 'percentage' ? 100 : undefined} // Max 100% risk
                  step={riskType === 'percentage' ? 0.1 : 1}
                  placeholder={riskType === 'percentage' ? 'e.g., 1' : 'e.g., 100'}
                  unit={riskType === 'percentage' ? '%' : accountCurrency}
                />

                {/* NEW: Real-time Risk Conversion Display (re-integrated here) */}
                {typeof calculatedRiskAmountDisplay === 'number' && riskType === 'percentage' && (
                  <div className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    <span>Risk Amount: </span>
                    <span className="font-semibold text-tst-black dark:text-tst-white">
                      {formatCurrency(calculatedRiskAmountDisplay)}
                    </span>
                  </div>
                )}
                {typeof calculatedRiskPercentageDisplay === 'number' && riskType === 'amount' && (
                  <div className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    <span>Risk Percentage: </span>
                    <span className="font-semibold text-tst-black dark:text-tst-white">
                      {formatNumber(calculatedRiskPercentageDisplay, 2)}%
                    </span>
                  </div>
                )}
                {/* End Real-time Risk Conversion Display */}

                {/* NEW: Currency Pair AutocompleteInput */}
                <AutocompleteInput
                  id="currencyPair"
                  label="Currency Pair"
                  value={currencyPairInputSymbol}
                  onChange={handleCurrencyPairInputSymbolChange}
                  suggestions={ALL_CURRENCY_PAIRS.map(pair => pair.symbol)}
                  placeholder="e.g., EUR/USD or XAU/USD"
                />

                {/* NEW: Trade Type Buttons */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-tst-black dark:text-tst-white mb-2">
                    Trade Type
                  </label>
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => handleTradeTypeChange('buy')}
                      className={`flex-1 px-4 py-2 rounded-md font-semibold transition-colors duration-200 
                      ${tradeType === 'buy'
                          ? 'bg-green-500 text-white hover:bg-green-600'
                          : 'bg-gray-300 dark:bg-gray-700 text-tst-black dark:text-tst-white hover:bg-gray-400 dark:hover:bg-gray-600'
                        }`}
                    >
                      Buy (Long)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTradeTypeChange('sell')}
                      className={`flex-1 px-4 py-2 rounded-md font-semibold transition-colors duration-200 
                      ${tradeType === 'sell'
                          ? 'bg-red-500 text-white hover:bg-red-600'
                          : 'bg-gray-300 dark:bg-gray-700 text-tst-black dark:text-tst-white hover:bg-gray-400 dark:hover:bg-gray-600'
                        }`}
                    >
                      Sell (Short)
                    </button>
                  </div>
                </div>

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

                {/* NEW: Calculate Button */}
                <div className="mt-6">
                  <button
                    type="button"
                    onClick={handleCalculate}
                    className="w-full px-6 py-3 bg-tst-blue hover:bg-tst-dark-blue text-white font-bold rounded-md shadow-md transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-tst-blue focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                  >
                    Calculate Lot Size
                  </button>
                </div>
              </form>
            </div>

            {/* Calculation History Section - Visible on Form Page */}
            <div className="w-full mt-8">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-tst-blue">Calculation History</h2>
                  {history.length > 0 && (
                    <button
                      onClick={handleClearHistory}
                      className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-md shadow-sm transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                    >
                      Clear History
                    </button>
                  )}
                </div>

                {history.length === 0 ? (
                  <p className="text-center text-gray-500 dark:text-gray-400 py-4">No history yet. Perform a calculation to save it!</p>
                ) : (
                  <div className="space-y-4">
                    {history.map((entry) => (
                      <div key={entry.id} className="bg-gray-100 dark:bg-gray-700 p-4 rounded-md shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                        <div>
                          <p className="text-sm font-semibold text-tst-black dark:text-tst-white">{entry.timestamp}</p>
                          <p className="text-md text-gray-700 dark:text-gray-300">
                            <span className="font-medium">{entry.inputs.currencyPair.symbol}</span> |&nbsp;
                            <span className={`${entry.inputs.tradeType === 'buy' ? 'text-green-500' : 'text-red-500'} font-medium`}>
                              {entry.inputs.tradeType.toUpperCase()}
                            </span> |&nbsp;
                            Lot: <span className="font-medium">{formatLotSize(entry.results?.finalLotSize)}</span> |&nbsp;
                            Risk: <span className="font-medium">{formatCurrency(entry.results?.totalRiskAmount)}</span>
                          </p>
                        </div>
                        <button
                          onClick={() => handleLoadHistoryEntry(entry)}
                          className="px-4 py-2 bg-tst-blue hover:bg-tst-dark-blue text-white font-semibold rounded-md shadow-sm transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-tst-blue focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                        >
                          Load
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          /* VIEW 2: Results Display */
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700">
            {/* Back Button */}
            <button
                onClick={() => setShowResults(false)}
                className="mb-4 flex items-center text-tst-blue font-semibold hover:underline transition-colors"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
                Back to Calculator
            </button>

            <h2 className="text-2xl font-bold text-tst-blue mb-6">Calculation Results</h2>

            {calcError ? (
              <div className="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded relative mb-6" role="alert">
                <strong className="font-bold">Calculation Error!</strong>
                <span className="block sm:inline ml-2">{calcError}</span>
              </div>
            ) : !hasCalculated ? (
              <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                <p className="text-lg mb-2">Enter your trade details and click "Calculate Lot Size" to see results.</p>
              </div>
            ) : results && results.finalLotSize > 0 ? (
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
                <p className="text-lg mb-2">An unexpected issue occurred with the calculation. Please check your inputs.</p>
                <p>Ensure all required fields are filled with positive values, and Stop Loss is defined.</p>
              </div>
            )}
          </div>
        )}
      </div>

      <footer className="mt-16 pb-8 text-center text-gray-600 dark:text-gray-400 text-sm">
        <div className="flex justify-center space-x-6 mb-4">
          <a
            href="https://www.instagram.com/touchskytraderr"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-2 text-gray-600 hover:text-pink-600 dark:text-gray-400 dark:hover:text-pink-400 transition-colors duration-300"
            aria-label="Instagram"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-6 h-6"
            >
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
              <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
            </svg>
            <span className="font-medium">@touchskytraderr</span>
          </a>
        </div>
        <p>
          &copy; {new Date().getFullYear()} TouchSkyTrader. All rights reserved.
        </p>
      </footer>
    </div>
  );
}

export default App;