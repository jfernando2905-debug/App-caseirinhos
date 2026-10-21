import React, { useState, useEffect, useRef } from 'react';

interface NumericInputProps {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  allowDecimals?: boolean;
  maxDecimals?: number;
  min?: number;
  max?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
  disabled?: boolean;
  id?: string;
  autoFocus?: boolean;
}

/**
 * Robust Brazilian decimal/numeric input component.
 * Allows typing commas (',') and dots ('.') naturally without premature resetting or wiping.
 * Keeps local string state while focused so trailing commas (e.g. "1,") or leading zeroes ("0,") work smoothly.
 */
export const NumericInput: React.FC<NumericInputProps> = ({
  value,
  onChange,
  placeholder,
  allowDecimals = true,
  maxDecimals = 2,
  min,
  max,
  className = '',
  prefix,
  suffix,
  disabled = false,
  id,
  autoFocus = false,
}) => {
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const [text, setText] = useState<string>(() => formatInitial(value));
  const isInternalChange = useRef<boolean>(false);

  function formatInitial(val: number): string {
    if (val === undefined || val === null || isNaN(val) || val === 0) {
      return '';
    }
    // Format with Brazilian comma
    if (allowDecimals) {
      // Avoid scientific notation and round to maxDecimals
      const rounded = Math.round(val * Math.pow(10, maxDecimals)) / Math.pow(10, maxDecimals);
      return String(rounded).replace('.', ',');
    }
    return String(Math.round(val));
  }

  // Sync external changes only when not focused or when value changed externally
  useEffect(() => {
    if (!isFocused && !isInternalChange.current) {
      setText(formatInitial(value));
    }
    isInternalChange.current = false;
  }, [value, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let inputVal = e.target.value;

    // Convert any dot to comma for Brazilian standard consistency
    inputVal = inputVal.replace('.', ',');

    // Filter characters
    if (allowDecimals) {
      // Allow only numbers and a single comma
      inputVal = inputVal.replace(/[^0-9,]/g, '');
      const parts = inputVal.split(',');
      if (parts.length > 2) {
        // Keep only first comma
        inputVal = parts[0] + ',' + parts.slice(1).join('');
      }
      if (parts[1] && parts[1].length > maxDecimals) {
        inputVal = parts[0] + ',' + parts[1].slice(0, maxDecimals);
      }
    } else {
      // Only integers
      inputVal = inputVal.replace(/[^0-9]/g, '');
    }

    setText(inputVal);
    isInternalChange.current = true;

    // Calculate numeric value
    if (inputVal === '' || inputVal === ',') {
      onChange(0);
      return;
    }

    const clean = inputVal.replace(',', '.');
    let num = parseFloat(clean);
    if (!isNaN(num)) {
      if (min !== undefined && num < min) {
        num = min;
      }
      if (max !== undefined && num > max) {
        num = max;
      }
      onChange(num);
    } else {
      onChange(0);
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    // If value is 0, keep text as is or empty so user doesn't have to delete 0
    if (value === 0 && (text === '0' || text === '0,00' || text === '0,0')) {
      setText('');
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    isInternalChange.current = false;

    if (!text.trim() || text === ',') {
      setText('');
      onChange(0);
      return;
    }

    const clean = text.replace(',', '.');
    let num = parseFloat(clean);
    if (isNaN(num)) {
      setText('');
      onChange(0);
      return;
    }

    if (min !== undefined && num < min) num = min;
    if (max !== undefined && num > max) num = max;

    onChange(num);
    setText(formatInitial(num));
  };

  return (
    <div className="relative flex items-center w-full">
      {prefix && (
        <span className="absolute left-2.5 text-xs text-stone-400 select-none pointer-events-none font-medium">
          {prefix}
        </span>
      )}
      <input
        id={id}
        type="text"
        inputMode={allowDecimals ? 'decimal' : 'numeric'}
        value={text}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        className={`w-full transition-colors outline-hidden focus:ring-1 focus:ring-amber-500 ${
          prefix ? 'pl-8' : ''
        } ${suffix ? 'pr-7' : ''} ${className}`}
      />
      {suffix && (
        <span className="absolute right-2.5 text-xs text-stone-400 select-none pointer-events-none font-medium">
          {suffix}
        </span>
      )}
    </div>
  );
};
