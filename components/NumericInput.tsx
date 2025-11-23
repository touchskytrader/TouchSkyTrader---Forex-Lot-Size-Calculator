import React from 'react';
import { NumericInputProps } from '../types';

const NumericInput: React.FC<NumericInputProps> = ({
  id,
  label,
  value,
  onChange,
  min,
  max,
  step = 0.01,
  placeholder = '',
  className = '',
  unit,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    if (rawValue === '') {
      onChange('');
    } else {
      const numValue = parseFloat(rawValue);
      if (!isNaN(numValue)) {
        onChange(numValue);
      } else {
        onChange(''); // Clear if invalid non-numeric input
      }
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
      <div className="relative">
        <input
          type="number"
          id={id}
          value={value}
          onChange={handleChange}
          min={min}
          max={max}
          step={step}
          placeholder={placeholder}
          className="block w-full pr-10 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-tst-blue focus:border-tst-blue bg-white dark:bg-gray-700 text-tst-black dark:text-tst-white sm:text-sm"
        />
        {unit && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <span className="text-gray-500 dark:text-gray-400 sm:text-sm">
              {unit}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default NumericInput;
