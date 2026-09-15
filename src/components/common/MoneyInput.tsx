import React, { useState, useEffect } from 'react';
import { formatMoneyNumber, parseMoneyValue, toFarsiDigits } from '../../utils/persianUtils';

interface MoneyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: number | string;
  onChange: (value: number) => void;
  unit?: string;
  className?: string;
}

export const MoneyInput: React.FC<MoneyInputProps> = ({
  value,
  onChange,
  unit = 'تومان',
  className = '',
  placeholder = '۰',
  disabled,
  ...props
}) => {
  const [displayValue, setDisplayValue] = useState<string>(() => {
    const num = parseMoneyValue(value);
    return num ? formatMoneyNumber(num) : '';
  });

  useEffect(() => {
    const num = parseMoneyValue(value);
    setDisplayValue(num ? formatMoneyNumber(num) : '');
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputVal = e.target.value;
    if (!inputVal.trim()) {
      setDisplayValue('');
      onChange(0);
      return;
    }

    const numeric = parseMoneyValue(inputVal);
    const formatted = formatMoneyNumber(numeric);
    setDisplayValue(formatted);
    onChange(numeric);
  };

  return (
    <div className="relative flex items-center w-full">
      <input
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        disabled={disabled}
        placeholder={toFarsiDigits(placeholder)}
        className={`w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:border-indigo-500 font-bold ${
          unit ? 'pl-14' : ''
        } ${disabled ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : ''} ${className}`}
        {...props}
      />
      {unit && (
        <span className="absolute left-3 text-xs text-slate-400 font-medium pointer-events-none select-none">
          {unit}
        </span>
      )}
    </div>
  );
};
