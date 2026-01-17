"use client";

import Image, { ImageProps } from 'next/image';
import { useResponsive } from '@/hooks/use-responsive';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface ResponsiveImageProps extends Omit<ImageProps, 'src' | 'sizes'> {
  src: string;
  alt: string;
  // Responsive source sets
  mobileSrc?: string;
  tabletSrc?: string;
  desktopSrc?: string;
  // Responsive sizes
  mobileWidth?: number;
  mobileHeight?: number;
  tabletWidth?: number;
  tabletHeight?: number;
  desktopWidth?: number;
  desktopHeight?: number;
  // Lazy loading options
  lazy?: boolean;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  // Responsive behavior
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  aspectRatio?: 'square' | '16/9' | '4/3' | '3/2' | 'auto';
  // Performance options
  priority?: boolean;
  quality?: number;
}

export function ResponsiveImage({
  src,
  alt,
  mobileSrc,
  tabletSrc,
  desktopSrc,
  mobileWidth,
  mobileHeight,
  tabletWidth,
  tabletHeight,
  desktopWidth,
  desktopHeight,
  lazy = true,
  placeholder = 'empty',
  blurDataURL,
  objectFit = 'cover',
  aspectRatio = 'auto',
  priority = false,
  quality = 75,
  className,
  ...props
}: ResponsiveImageProps) {
  const { device, breakpoint } = useResponsive();
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Determine the appropriate source based on device type
  const getResponsiveSrc = () => {
    switch (device.type) {
      case 'mobile':
        return mobileSrc || src;
      case 'tablet':
        return tabletSrc || src;
      case 'desktop':
        return desktopSrc || src;
      default:
        return src;
    }
  };

  // Determine responsive dimensions
  const getResponsiveDimensions = () => {
    switch (device.type) {
      case 'mobile':
        return {
          width: mobileWidth || 375,
          height: mobileHeight || 250
        };
      case 'tablet':
        return {
          width: tabletWidth || 768,
          height: tabletHeight || 400
        };
      case 'desktop':
        return {
          width: desktopWidth || 1200,
          height: desktopHeight || 600
        };
      default:
        return {
          width: 800,
          height: 400
        };
    }
  };

  // Generate responsive sizes string for Next.js Image
  const getResponsiveSizes = () => {
    const sizes = [];
    
    if (mobileWidth) {
      sizes.push(`(max-width: 767px) ${mobileWidth}px`);
    }
    if (tabletWidth) {
      sizes.push(`(max-width: 1023px) ${tabletWidth}px`);
    }
    if (desktopWidth) {
      sizes.push(`${desktopWidth}px`);
    }
    
    return sizes.length > 0 ? sizes.join(', ') : '100vw';
  };

  const aspectRatioClasses = {
    'square': 'aspect-square',
    '16/9': 'aspect-video',
    '4/3': 'aspect-[4/3]',
    '3/2': 'aspect-[3/2]',
    'auto': ''
  };

  const objectFitClasses = {
    'contain': 'object-contain',
    'cover': 'object-cover',
    'fill': 'object-fill',
    'none': 'object-none',
    'scale-down': 'object-scale-down'
  };

  const dimensions = getResponsiveDimensions();
  const responsiveSrc = getResponsiveSrc();

  if (hasError) {
    return (
      <div 
        className={cn(
          'flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600',
          aspectRatioClasses[aspectRatio],
          className
        )}
        style={{ 
          width: dimensions.width, 
          height: aspectRatio === 'auto' ? dimensions.height : 'auto' 
        }}
      >
        <svg 
          className="w-12 h-12" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" 
          />
        </svg>
      </div>
    );
  }

  return (
    <div className={cn('relative overflow-hidden', aspectRatioClasses[aspectRatio])}>
      {/* Loading placeholder */}
      {isLoading && (
        <div 
          className={cn(
            'absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse',
            'flex items-center justify-center'
          )}
        >
          <div className="w-8 h-8 border-2 border-gray-300 border-t-primary rounded-full animate-spin" />
        </div>
      )}

      <Image
        src={responsiveSrc}
        alt={alt}
        width={dimensions.width}
        height={dimensions.height}
        sizes={getResponsiveSizes()}
        quality={quality}
        priority={priority}
        placeholder={placeholder}
        blurDataURL={blurDataURL}
        className={cn(
          objectFitClasses[objectFit],
          'transition-opacity duration-300',
          isLoading ? 'opacity-0' : 'opacity-100',
          className
        )}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
        }}
        {...props}
      />
    </div>
  );
}

// Utility component for responsive background images
interface ResponsiveBackgroundImageProps {
  src: string;
  mobileSrc?: string;
  tabletSrc?: string;
  desktopSrc?: string;
  children?: React.ReactNode;
  className?: string;
  overlay?: boolean;
  overlayOpacity?: number;
}

export function ResponsiveBackgroundImage({
  src,
  mobileSrc,
  tabletSrc,
  desktopSrc,
  children,
  className,
  overlay = false,
  overlayOpacity = 0.5
}: ResponsiveBackgroundImageProps) {
  const { device } = useResponsive();

  const getBackgroundSrc = () => {
    switch (device.type) {
      case 'mobile':
        return mobileSrc || src;
      case 'tablet':
        return tabletSrc || src;
      case 'desktop':
        return desktopSrc || src;
      default:
        return src;
    }
  };

  return (
    <div 
      className={cn('relative bg-cover bg-center bg-no-repeat', className)}
      style={{ backgroundImage: `url(${getBackgroundSrc()})` }}
    >
      {overlay && (
        <div 
          className="absolute inset-0 bg-black"
          style={{ opacity: overlayOpacity }}
        />
      )}
      {children && (
        <div className="relative z-10">
          {children}
        </div>
      )}
    </div>
  );
}

// Responsive image gallery component
interface ResponsiveImageGalleryProps {
  images: Array<{
    src: string;
    alt: string;
    mobileSrc?: string;
    tabletSrc?: string;
    desktopSrc?: string;
  }>;
  columns?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
  gap?: 'sm' | 'md' | 'lg';
  aspectRatio?: 'square' | '16/9' | '4/3' | '3/2';
  onImageClick?: (index: number) => void;
}

export function ResponsiveImageGallery({
  images,
  columns = { mobile: 1, tablet: 2, desktop: 3 },
  gap = 'md',
  aspectRatio = 'square',
  onImageClick
}: ResponsiveImageGalleryProps) {
  const { device } = useResponsive();

  const gapClasses = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6'
  };

  const getGridCols = () => {
    switch (device.type) {
      case 'mobile':
        return `grid-cols-${columns.mobile || 1}`;
      case 'tablet':
        return `grid-cols-${columns.tablet || 2}`;
      case 'desktop':
        return `grid-cols-${columns.desktop || 3}`;
      default:
        return 'grid-cols-1';
    }
  };

  return (
    <div className={cn('grid', getGridCols(), gapClasses[gap])}>
      {images.map((image, index) => (
        <div
          key={index}
          className={cn(
            'cursor-pointer transition-transform hover:scale-105',
            onImageClick && 'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'
          )}
          onClick={() => onImageClick?.(index)}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ' ') && onImageClick) {
              e.preventDefault();
              onImageClick(index);
            }
          }}
          tabIndex={onImageClick ? 0 : -1}
          role={onImageClick ? 'button' : undefined}
          aria-label={onImageClick ? `View image: ${image.alt}` : undefined}
        >
          <ResponsiveImage
            src={image.src}
            alt={image.alt}
            mobileSrc={image.mobileSrc}
            tabletSrc={image.tabletSrc}
            desktopSrc={image.desktopSrc}
            aspectRatio={aspectRatio}
            className="w-full h-full"
          />
        </div>
      ))}
    </div>
  );
}