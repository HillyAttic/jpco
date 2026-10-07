import React, { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  required?: boolean;
  /** Pinned to the field's right edge, e.g. a show/hide password toggle. */
  suffix?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  required,
  suffix,
  className = '',
  ...props
}) => {
  return (
    <div className="mb-4">
      <label className="mb-2.5 block font-medium text-black dark:text-white">
        {label} {required && <span className="text-red">*</span>}
      </label>
      <div className="relative">
        <input
          {...props}
          className={`w-full rounded-lg border border-stroke bg-transparent py-3 px-5 font-medium outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary ${
            error ? '!border-red' : ''
          } ${suffix ? 'pr-12' : ''} ${className}`}
        />
        {suffix && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">{suffix}</div>
        )}
      </div>
      {error && <p className="mt-1 text-sm text-red">{error}</p>}
    </div>
  );
};