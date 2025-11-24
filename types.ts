export interface CurrencyPair {
  symbol: string;
  base: string;
  quote: string;
  contractSize: number; // Units per standard lot (e.g., 100,000 for FX, 100 for XAUUSD, 1 for BTCUSDT)
}

export type AccountCurrency = 'USD' | 'INR' | 'GBP' | 'EUR';
export type Leverage = '1:30' | '1:50' | '1:100' | '1:200' | '1:500' | '1:1000';
export type RiskType = 'percentage' | 'amount';
export type TradeType = 'buy' | 'sell'; // NEW: Trade type

export interface CalculationInputs {
  accountCurrency: AccountCurrency;
  accountSize: number;
  leverage: Leverage;
  riskType: RiskType;
  riskValue: number; // percentage or amount
  currencyPair: CurrencyPair;
  entryPrice: number;
  stopLossPrice: number;
  takeProfitPrice?: number;
  tradeType: TradeType; // NEW: Trade type
}

export interface CalculationResults {
  finalLotSize: number;
  totalRiskAmount: number; // in account currency
  riskPerPip: number; // in account currency
  stopLossPips: number;
  takeProfitPips: number | null; // NEW: Take Profit pips
  potentialProfitAtTP: number | null; // in account currency
  marginRequired: number; // in account currency
  riskToRewardRatio: number | null;
  lotSizeCategory: 'standard' | 'mini' | 'micro';
  effectiveRiskPercentage: number; // Actual risk percentage based on final lot size
}

export interface HistoryEntry {
  id: string; // Unique ID for each entry
  timestamp: string; // Date/time of calculation
  inputs: {
    accountCurrency: AccountCurrency;
    accountSize: number | '';
    leverage: Leverage;
    riskType: RiskType;
    riskValue: number | '';
    currencyPair: CurrencyPair;
    tradeType: TradeType;
    entryPrice: number | '';
    stopLossPriceInput: number | '';
    stopLossPipsInput: number | '';
    takeProfitPriceInput: number | '';
    takeProfitPipsInput: number | '';
    lastEditedSLField: 'price' | 'pips' | null;
    lastEditedTPField: 'price' | 'pips' | null;
  };
  results: CalculationResults | null; // Store the calculated results
}

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

export interface Option<T> {
  value: T;
  label: string;
}

export interface DropdownProps<T> {
  id: string;
  label: string;
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export interface NumericInputProps {
  id: string;
  label: string;
  value: number | '';
  onChange: (value: number | '') => void;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  className?: string;
  unit?: string;
}