'use client';

import React, { useEffect, useCallback, useState, cloneElement } from 'react';
import { cn } from '@/lib/utils';

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

function Sheet({ open, onOpenChange, children }: SheetProps) {
  const [visible, setVisible] = useState(false);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    },
    [onOpenChange]
  );

  useEffect(() => {
    if (open) {
      setVisible(true);
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      const timer = setTimeout(() => setVisible(false), 300);
      document.body.style.overflow = '';
      return () => clearTimeout(timer);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, handleKeyDown]);

  if (!visible) return null;

  // Clone children to inject data-open for animation
  const clonedChildren = React.Children.map(children, child => {
    if (React.isValidElement(child)) {
      return cloneElement(child as React.ReactElement<any>, { 'data-open': open ? 'true' : 'false' });
    }
    return child;
  });

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 bg-black/50 transition-opacity duration-300',
          open ? 'opacity-100' : 'opacity-0'
        )}
        onClick={() => onOpenChange(false)}
      />
      {clonedChildren}
    </div>
  );
}

interface SheetContentProps extends React.HTMLAttributes<HTMLDivElement> {
  side?: 'left' | 'right' | 'top' | 'bottom';
}

const SheetContent = React.forwardRef<HTMLDivElement, SheetContentProps>(
  ({ side = 'right', className, children, ...props }, ref) => {
    const sideClasses = {
      right: 'fixed inset-y-0 right-0 h-full w-full max-w-md border-l bg-white shadow-xl transition-transform duration-300 ease-in-out',
      left: 'fixed inset-y-0 left-0 h-full w-full max-w-md border-r bg-white shadow-xl transition-transform duration-300 ease-in-out',
      top: 'fixed inset-x-0 top-0 border-b bg-white shadow-xl transition-transform duration-300 ease-in-out',
      bottom: 'fixed inset-x-0 bottom-0 border-t bg-white shadow-xl transition-transform duration-300 ease-in-out',
    };

    const translateClasses = {
      right: 'data-[open="false"]:translate-x-full data-[open="true"]:translate-x-0',
      left: 'data-[open="false"]:-translate-x-full data-[open="true"]:translate-x-0',
      top: 'data-[open="false"]:-translate-y-full data-[open="true"]:translate-y-0',
      bottom: 'data-[open="false"]:translate-y-full data-[open="true"]:translate-y-0',
    };

    return (
      <div
        ref={ref}
        className={cn(sideClasses[side], translateClasses[side], className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);
SheetContent.displayName = 'SheetContent';

function SheetHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex flex-col space-y-2 p-6 text-center sm:text-left', className)}
      {...props}
    />
  );
}

function SheetTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn('text-lg font-semibold text-foreground', className)}
      {...props}
    />
  );
}

function SheetFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 p-6',
        className
      )}
      {...props}
    />
  );
}

export { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter };
