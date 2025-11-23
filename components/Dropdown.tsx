import React from 'react';
// Add missing import for CurrencyPair
import { CurrencyPair, DropdownProps } from '../types';

const Dropdown = <T extends string | number | CurrencyPair>(
  props: DropdownProps<T>,
) => {
  const { id, label, options, value, onChange, className = '' } = props;

  // Special handling for CurrencyPair to serialize/deserialize object values
  const stringValue = typeof value === 'object' && 'symbol' in value ? value.symbol : String(value);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedStringValue = e.target.value;
    const selectedOption = options.find(opt => {
        if (typeof opt.value === 'object' && 'symbol' in opt.value) {
            return opt.value.symbol === selectedStringValue;
        }
        return String(opt.value) === selectedStringValue;
    });
    if (selectedOption) {
      onChange(selectedOption.value);
    }
  };

  return (
    <div className={`mb-4 ${className}`}>
      <label
        htmlFor={id}
        className="block text-sm font-medium text-tst-black dark:text-tst-white mb-1"
      >
        {label}
      </label>
      <select
        id={id}
        value={stringValue}
        onChange={handleChange}
        className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-tst-blue focus:border-tst-blue bg-white dark:bg-gray-700 text-tst-black dark:text-tst-white sm:text-sm"
      >
        {options.map((option, index) => {
          const optionValue = typeof option.value === 'object' && 'symbol' in option.value ? option.value.symbol : String(option.value);
          return (
            <option key={index} value={optionValue}>
              {option.label}
            </option>
          );
        })}
      </select>
    </div>
  );
};

export default Dropdown;