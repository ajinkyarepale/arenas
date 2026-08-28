'use client';

/**
 * Animated loading indicator with rotating gradient rings, size variants and customizable title text.
 * Built with React, Tailwind CSS and Motion.
 */

import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

interface KokonutLoaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function KokonutLoader({
  title = 'Connecting to live arena...',
  subtitle = 'Syncing real-time LMSR odds and price feeds',
  size = 'md',
  className,
  ...props
}: KokonutLoaderProps) {
  const sizeConfig = {
    sm: {
      container: 'size-20',
      titleClass: 'text-sm font-medium',
      subtitleClass: 'text-xs',
      spacing: 'space-y-2',
      maxWidth: 'max-w-48',
    },
    md: {
      container: 'size-28',
      titleClass: 'text-base font-semibold',
      subtitleClass: 'text-xs',
      spacing: 'space-y-2.5',
      maxWidth: 'max-w-64',
    },
    lg: {
      container: 'size-36',
      titleClass: 'text-lg font-bold',
      subtitleClass: 'text-sm',
      spacing: 'space-y-3',
      maxWidth: 'max-w-72',
    },
  };

  const config = sizeConfig[size];

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-6 p-6',
        className
      )}
      {...props}
    >
      {/* Monochrome Conic Ring Loader */}
      <motion.div
        animate={{
          scale: [1, 1.02, 1],
        }}
        className={cn('relative', config.container)}
        transition={{
          duration: 4,
          repeat: Number.POSITIVE_INFINITY,
          ease: [0.4, 0, 0.6, 1],
        }}
      >
        {/* Outer elegant ring with shimmer */}
        <motion.div
          animate={{
            rotate: [0, 360],
          }}
          className="absolute inset-0 rounded-full"
          style={{
            background:
              'conic-gradient(from 0deg, transparent 0deg, rgb(255, 255, 255) 90deg, transparent 180deg)',
            mask: 'radial-gradient(circle at 50% 50%, transparent 35%, black 37%, black 39%, transparent 41%)',
            WebkitMask:
              'radial-gradient(circle at 50% 50%, transparent 35%, black 37%, black 39%, transparent 41%)',
            opacity: 0.8,
          }}
          transition={{
            duration: 3,
            repeat: Number.POSITIVE_INFINITY,
            ease: 'linear',
          }}
        />

        {/* Primary animated ring with gradient */}
        <motion.div
          animate={{
            rotate: [0, 360],
          }}
          className="absolute inset-0 rounded-full"
          style={{
            background:
              'conic-gradient(from 0deg, transparent 0deg, rgb(34, 197, 94) 120deg, rgba(34, 197, 94, 0.5) 240deg, transparent 360deg)',
            mask: 'radial-gradient(circle at 50% 50%, transparent 42%, black 44%, black 48%, transparent 50%)',
            WebkitMask:
              'radial-gradient(circle at 50% 50%, transparent 42%, black 44%, black 48%, transparent 50%)',
            opacity: 0.9,
          }}
          transition={{
            duration: 2.5,
            repeat: Number.POSITIVE_INFINITY,
            ease: [0.4, 0, 0.6, 1],
          }}
        />

        {/* Secondary elegant ring - counter rotation */}
        <motion.div
          animate={{
            rotate: [0, -360],
          }}
          className="absolute inset-0 rounded-full"
          style={{
            background:
              'conic-gradient(from 180deg, transparent 0deg, rgba(255, 255, 255, 0.6) 45deg, transparent 90deg)',
            mask: 'radial-gradient(circle at 50% 50%, transparent 52%, black 54%, black 56%, transparent 58%)',
            WebkitMask:
              'radial-gradient(circle at 50% 50%, transparent 52%, black 54%, black 56%, transparent 58%)',
            opacity: 0.35,
          }}
          transition={{
            duration: 4,
            repeat: Number.POSITIVE_INFINITY,
            ease: [0.4, 0, 0.6, 1],
          }}
        />

        {/* Accent ring */}
        <motion.div
          animate={{
            rotate: [0, 360],
          }}
          className="absolute inset-0 rounded-full"
          style={{
            background:
              'conic-gradient(from 270deg, transparent 0deg, rgba(34, 197, 94, 0.6) 20deg, transparent 40deg)',
            mask: 'radial-gradient(circle at 50% 50%, transparent 61%, black 62%, black 63%, transparent 64%)',
            WebkitMask:
              'radial-gradient(circle at 50% 50%, transparent 61%, black 62%, black 63%, transparent 64%)',
            opacity: 0.6,
          }}
          transition={{
            duration: 3.5,
            repeat: Number.POSITIVE_INFINITY,
            ease: 'linear',
          }}
        />
      </motion.div>

      {/* Typography with Breathing Animation */}
      <motion.div
        animate={{
          opacity: 1,
          y: 0,
        }}
        className={cn('text-center', config.spacing, config.maxWidth)}
        initial={{ opacity: 0, y: 8 }}
        transition={{
          delay: 0.2,
          duration: 0.6,
          ease: [0.4, 0, 0.2, 1],
        }}
      >
        <motion.h3
          className={cn(
            config.titleClass,
            'font-["Geist"] text-white leading-tight'
          )}
        >
          <motion.span
            animate={{
              opacity: [0.95, 0.7, 0.95],
            }}
            transition={{
              duration: 3,
              repeat: Number.POSITIVE_INFINITY,
              ease: [0.4, 0, 0.6, 1],
            }}
          >
            {title}
          </motion.span>
        </motion.h3>

        {subtitle && (
          <motion.p
            className={cn(
              config.subtitleClass,
              'font-["Geist"] text-[#a1a1aa] leading-relaxed'
            )}
          >
            <motion.span
              animate={{
                opacity: [0.7, 0.4, 0.7],
              }}
              transition={{
                duration: 4,
                repeat: Number.POSITIVE_INFINITY,
                ease: [0.4, 0, 0.6, 1],
              }}
            >
              {subtitle}
            </motion.span>
          </motion.p>
        )}
      </motion.div>
    </div>
  );
}

export default KokonutLoader;
