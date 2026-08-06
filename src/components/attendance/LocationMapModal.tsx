import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LocationMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  latitude: number;
  longitude: number;
  title?: string;
}

/**
 * LocationMapModal Component
 * Displays Google Maps in a modal when clicking on location coordinates
 */
export function LocationMapModal({
  isOpen,
  onClose,
  latitude,
  longitude,
  title = 'Location',
}: LocationMapModalProps) {
  const [address, setAddress] = useState<string | null>(null);
  const [addressLoading, setAddressLoading] = useState(false);

  // Reverse geocode coordinates to human-readable address
  useEffect(() => {
    if (!isOpen || !latitude || !longitude) {
      setAddress(null);
      return;
    }

    const fetchAddress = async () => {
      setAddressLoading(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1&accept-language=en`
        );
        if (res.ok) {
          const data = await res.json();
          setAddress(data.display_name || null);
        }
      } catch (error) {
        console.error('[LocationMapModal] Reverse geocode error:', error);
      } finally {
        setAddressLoading(false);
      }
    };

    fetchAddress();
  }, [isOpen, latitude, longitude]);

  // Prevent body scroll and hide header when modal is open
  useEffect(() => {
    if (isOpen) {
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
      
      // Hide header by adding a class to body
      document.body.classList.add('modal-open');
      
      // Add style to hide header
      const style = document.createElement('style');
      style.id = 'modal-header-hide';
      style.innerHTML = `
        body.modal-open header {
          display: none !important;
        }
      `;
      document.head.appendChild(style);
    } else {
      // Restore body scroll
      document.body.style.overflow = 'unset';
      
      // Remove class from body
      document.body.classList.remove('modal-open');
      
      // Remove style
      const style = document.getElementById('modal-header-hide');
      if (style) {
        style.remove();
      }
    }

    return () => {
      document.body.style.overflow = 'unset';
      document.body.classList.remove('modal-open');
      const style = document.getElementById('modal-header-hide');
      if (style) {
        style.remove();
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Google Maps embed URL
  const mapUrl = `https://www.google.com/maps?q=${latitude},${longitude}&output=embed`;

  const modalContent = (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[99999] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-dark rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {title}
            </h3>
            <p className="text-sm mt-1">
              {addressLoading ? (
                <span className="inline-flex items-center gap-1.5 text-gray-400 dark:text-gray-500">
                  <span className="w-3.5 h-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <span>Resolving address...</span>
                </span>
              ) : address ? (
                <span className="inline-flex items-start gap-1.5 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border border-blue-200/60 dark:border-blue-700/40 text-blue-700 dark:text-blue-300 font-medium leading-snug">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="shrink-0 mt-0.5 text-blue-500 dark:text-blue-400"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"></path><circle cx="12" cy="10" r="3"></circle></svg>
                  <span>{address}</span>
                </span>
              ) : (
                <span className="text-gray-500 dark:text-gray-400">{latitude.toFixed(6)}, {longitude.toFixed(6)}</span>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-gray-700 dark:hover:text-white transition-colors shrink-0"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Map Content */}
        <div className="relative w-full h-[600px]">
          <iframe
            src={mapUrl}
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Google Maps Location"
            className="w-full h-full"
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <a
            href={`https://www.google.com/maps?q=${latitude},${longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
          >
            Open in Google Maps
          </a>
          <Button
            onClick={onClose}
            variant="outline"
            size="sm"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );

  // Render modal using portal to ensure it's at the root level
  return typeof document !== 'undefined' 
    ? createPortal(modalContent, document.body)
    : null;
}
