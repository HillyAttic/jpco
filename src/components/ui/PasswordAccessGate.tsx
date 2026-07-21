/**
 * PasswordAccessGate
 * A reusable password gate component that locks a page behind a password.
 * The password is verified server-side via an env variable.
 * Supports "Remember me" — saves password to localStorage for auto-login on next visit.
 */

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { ShieldAlert, Lock, Eye, EyeOff, LogOut, Sparkles, type LucideIcon } from 'lucide-react';
import { authenticatedFetch } from '@/lib/api-client';

export interface PasswordAccessGateConfig {
  /** Title shown in the gate header */
  title: string;
  /** Subtitle shown below the title */
  subtitle: string;
  /** Icon component to display (e.g. IndianRupee) */
  icon: LucideIcon;
  /** API endpoint to verify the password (e.g. /api/payroll/verify-access) */
  apiEndpoint: string;
  /** Unique key prefix for localStorage (e.g. 'payroll', 'invoices') */
  storageKeyPrefix: string;
  /** Gradient colors for the header bar */
  gradient?: string;
}

interface PasswordAccessGateProps {
  config: PasswordAccessGateConfig;
  children: React.ReactNode;
}

export function PasswordAccessGate({ config, children }: PasswordAccessGateProps) {
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState('');
  const [verifying, setVerifying] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const initDone = useRef(false);

  const STORAGE_KEY = `${config.storageKeyPrefix}_access_password`;
  const REMEMBER_KEY = `${config.storageKeyPrefix}_access_remember`;

  const Icon = config.icon;
  const gradient = config.gradient ?? 'from-violet-600 via-purple-600 to-indigo-700';

  // On mount: check for saved password and auto-verify
  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;

    const savedPassword = localStorage.getItem(STORAGE_KEY);
    const wasRemembered = localStorage.getItem(REMEMBER_KEY) === 'true';

    if (savedPassword && wasRemembered) {
      setPassword(savedPassword);
      setRememberMe(true);
      verifyPassword(savedPassword, true);
    } else {
      setVerifying(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const verifyPassword = useCallback(async (pw: string, isAutoLogin: boolean) => {
    setVerifying(true);
    try {
      const response = await authenticatedFetch(config.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw.trim() }),
      });

      const data = await response.json();

      if (data.success) {
        setUnlocked(true);
        setVerifying(false);
        if (!isAutoLogin) {
          toast.success('Access granted');
        }
      } else {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(REMEMBER_KEY);
        setRememberMe(false);
        setPassword('');
        if (!isAutoLogin) {
          toast.error(data.error || 'Incorrect password');
        }
        setVerifying(false);
      }
    } catch (error) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(REMEMBER_KEY);
      setRememberMe(false);
      setPassword('');
      if (!isAutoLogin) {
        toast.error('Failed to verify password');
        console.error(error);
      }
      setVerifying(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password.trim()) {
      toast.error('Please enter a password');
      return;
    }

    setVerifying(true);
    try {
      const response = await authenticatedFetch(config.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: password.trim() }),
      });

      const data = await response.json();

      if (data.success) {
        if (rememberMe) {
          localStorage.setItem(STORAGE_KEY, password.trim());
          localStorage.setItem(REMEMBER_KEY, 'true');
        } else {
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem(REMEMBER_KEY);
        }
        setUnlocked(true);
        setVerifying(false);
        toast.success('Access granted');
      } else {
        toast.error(data.error || 'Incorrect password');
        setPassword('');
        setVerifying(false);
      }
    } catch (error) {
      toast.error('Failed to verify password');
      console.error(error);
      setVerifying(false);
    }
  }, [password, rememberMe, config, STORAGE_KEY, REMEMBER_KEY]);

  // Unlocked — show children with a floating lock button
  if (unlocked) {
    return (
      <>
        <button
          onClick={() => {
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem(REMEMBER_KEY);
            setUnlocked(false);
            setPassword('');
            setRememberMe(false);
            setVerifying(false);
            toast.success(`${config.title} locked`);
          }}
          className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-purple-600 text-white px-4 py-2.5 text-xs shadow-lg shadow-violet-200 dark:shadow-violet-900/30 hover:from-violet-500 hover:to-purple-500 transition-all duration-200 hover:shadow-xl hover:shadow-violet-300 dark:hover:shadow-violet-800/40 active:scale-95"
          title={`Lock the ${config.title}`}
        >
          <LogOut className="h-3.5 w-3.5" />
          Lock Panel
        </button>
        {children}
      </>
    );
  }

  // Verifying saved credentials on mount
  if (verifying && !password) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center gap-3">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
          <span className="text-sm text-gray-500 dark:text-gray-400">Verifying saved credentials...</span>
        </div>
      </div>
    );
  }

  // Password prompt
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Header */}
          <div className={`bg-gradient-to-r ${gradient} px-6 py-10 text-center relative overflow-hidden`}>
            {/* Decorative blobs */}
            <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/5 blur-xl" />
            <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-pink-400/10 blur-2xl" />
            <div className="absolute top-4 left-10 w-12 h-12 rounded-full bg-amber-300/10 blur-lg" />
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/15 backdrop-blur-sm mb-4 ring-2 ring-white/20 shadow-xl relative">
              <Icon className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-extrabold text-white drop-shadow-sm">{config.title}</h1>
            <p className="text-purple-200 text-sm mt-1.5 font-medium drop-shadow-sm">
              🔒 {config.subtitle}
            </p>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-300">
                This page is password-protected. Enter the access password configured in your environment variables.
              </p>
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor={`${config.storageKeyPrefix}-password`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Access Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  id={`${config.storageKeyPrefix}-password`}
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  autoFocus
                  autoComplete="off"
                  className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm placeholder:text-gray-400 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <div
                role="checkbox"
                aria-checked={rememberMe}
                tabIndex={0}
                onClick={() => setRememberMe(!rememberMe)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setRememberMe(!rememberMe); } }}
                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                  rememberMe
                    ? 'bg-violet-600 border-violet-600'
                    : 'border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-700'
                }`}
              >
                {rememberMe && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Remember me — stay logged in on this device
              </span>
            </label>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={verifying || !password.trim()}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:from-gray-400 disabled:to-gray-400 text-white font-semibold py-2.5 px-4 text-sm transition-all duration-200 shadow-lg shadow-violet-200 dark:shadow-violet-900/30 hover:shadow-xl hover:shadow-violet-300 dark:hover:shadow-violet-800/40 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 active:scale-[0.98]"
            >
              {verifying ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Verifying...
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  Unlock {config.title}
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
