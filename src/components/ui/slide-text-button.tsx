'use client';

/**
 * Slide Text Button with animated vertical text transition on hover.
 * Built with React, Motion, and Tailwind CSS.
 */

import { motion } from 'motion/react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface SlideTextButtonProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  text?: string;
  hoverText?: string;
  href?: string;
  className?: string;
  variant?: 'default' | 'ghost' | 'emerald';
}

export function SlideTextButton({
  text = 'Explore Markets',
  hoverText,
  href = '/markets',
  className,
  variant = 'default',
  ...props
}: SlideTextButtonProps) {
  const slideText = hoverText ?? text;
  const variantStyles =
    variant === 'ghost'
      ? 'border border-[#3f3f46] text-[#e5e2e1] hover:bg-[#27272A] bg-transparent'
      : variant === 'emerald'
      ? 'bg-[#22C55E] text-black hover:bg-[#1ea750] shadow-lg shadow-[#22C55E]/10'
      : 'bg-white text-black hover:bg-[#e4e4e7] shadow-lg';

  return (
    <motion.div
      animate={{ x: 0, opacity: 1, transition: { duration: 0.2 } }}
      className="relative inline-block"
      initial={{ x: 20, opacity: 0 }}
    >
      <Link
        className={cn(
          'group relative inline-flex h-11 items-center justify-center overflow-hidden rounded-full px-7 font-["Epilogue"] font-bold text-xs uppercase tracking-wider transition-all duration-300',
          variantStyles,
          className
        )}
        href={href}
        {...props}
      >
        <span className="relative flex flex-col items-center justify-center transition-transform duration-300 ease-in-out group-hover:-translate-y-full">
          <span className="flex items-center justify-center gap-2 opacity-100 transition-opacity duration-300 group-hover:opacity-0 whitespace-nowrap">
            <span>{text}</span>
          </span>
          <span className="absolute top-full flex items-center justify-center gap-2 opacity-0 transition-opacity duration-300 group-hover:opacity-100 whitespace-nowrap">
            <span>{slideText}</span>
          </span>
        </span>
      </Link>
    </motion.div>
  );
}

export default SlideTextButton;
