/**
 * PasswordModal
 * A reusable modal-based password gate that prompts for a password before
 * gating a specific action (e.g. viewing a map). Unlike PasswordAccessGate
 * which locks an entire page, this renders as a modal overlay.
 * Uses the same server-side verification via an API endpoint.
 * Supports "Remember me" — saves password to localStorage for auto-login.
 */

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-toastify';
import { ShieldAlert, Lock, Eye, EyeOff, X, type LucideIcon } from 'lucide-react';
import { authenticatedFetch } from '@/lib/api-client';
import type { PasswordAccessGateConfig } from '@/components/ui/PasswordAccessGate';

interface PasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  config: PasswordAccessGateConfig;
}

export function PasswordModal({ isOpen, onClose, onSuccess, config }: PasswordModalProps) {
  const [password, setPassword] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const initDone = useRef(false);

  const STORAGE_KEY = `${config.storageKeyPrefix}_access_password`;
  const REMEMBER_KEY = `${config.storageKeyPrefix}_access_remember`;

  const Icon = config.icon;
  const gradient = config.gradient ?? 'from-violet-600 via-purple-600 to-indigo-700';

  // On mount: check localStorage for saved credentials and auto-verify
  useEffect(() => {
    if (!isOpen) return;

    // Reset state each time the modal opens (except for auto-login path)
    setPassword('');
    setVerifying(true);
    setShowPassword(false);
    setRememberMe(false);
    initDone.current = false;
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || initDone.current) return;
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
  }, [isOpen]);

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
        if (isAutoLogin) {
          // Auto-login: just call onSuccess without showing modal
          onSuccess();
        } else {
          setVerifying(false);
          toast.success('Access granted');
          onSuccess();
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
        setVerifying(false);
        toast.success('Access granted');
        onSuccess();
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
  }, [password, rememberMe, onSuccess, config, STORAGE_KEY, REMEMBER_KEY]);

  const handleClose = useCallback(() => {
    // Don't close while verifying
    if (verifying) return;
    onClose();
  }, [verifying, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // If auto-login succeeds immediately, never render the modal
  // (initDone triggers auto-verify which calls onSuccess, and isOpen stays false)
  if (!isOpen) return null;

  // If already verifying from saved creds (auto-login path), don't flash the modal
  if (verifying && !password) {
    return null;
  }

  const modalContent = (
    <div
      className="fixed inset-0 bg-black/50 z-[99999] flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
      onKeyDown={(e) => { if (e.key === 'Escape') handleClose(); }}
    >
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Header */}
          <div className={`bg-gradient-to-r ${gradient} px-6 py-8 text-center relative overflow-hidden`}>
            {/* Decorative blobs */}
            <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/5 blur-xl" />
            <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-pink-400/10 blur-2xl" />
            <div className="absolute top-4 left-10 w-12 h-12 rounded-full bg-amber-300/10 blur-lg" />

            {/* Close button */}
            <button
              onClick={handleClose}
              className="absolute top-3 right-3 text-white/70 hover:text-white transition-colors z-10"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-white/15 backdrop-blur-sm mb-3 ring-2 ring-white/20 shadow-xl relative">
              <Icon className="h-7 w-7 text-white" />
            </div>
            <h2 className="text-xl font-extrabold text-white drop-shadow-sm">{config.title}</h2>
            <p className="text-purple-200 text-xs mt-1 font-medium drop-shadow-sm">
              🔒 {config.subtitle}
            </p>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-300">
                This feature is password-protected. Enter the access password configured in your environment variables.
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

  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : null;
}
