'use client';

/**
 * Switch Button — Sleek circular theme toggle icon button.
 * Built with React, Lucide icons, and next-themes.
 */

import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

interface SwitchButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: 'sm' | 'default' | 'lg';
  showLabel?: boolean;
}

export function SwitchButton({
  className,
  size = 'default',
  showLabel = false,
  ...props
}: SwitchButtonProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentTheme = mounted ? (resolvedTheme || theme || 'dark') : 'dark';
  const isDark = currentTheme === 'dark';

  const handleThemeToggle = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  const sizeClasses = {
    sm: 'w-7 h-7',
    default: 'w-8 h-8',
    lg: 'w-9 h-9',
  };

  const iconSizes = {
    sm: 'h-3.5 w-3.5',
    default: 'h-4 w-4',
    lg: 'h-4.5 w-4.5',
  };

  if (!mounted) {
    return (
      <div
        className={cn(
          'rounded-full border border-[#27272A] bg-[#201f1f] opacity-50 shrink-0',
          sizeClasses[size],
          className
        )}
      />
    );
  }

  return (
    <button
      className={cn(
        'group relative rounded-full border border-[#27272A] bg-[#201f1f] hover:bg-[#2a2a2a] hover:border-[#3f3f46]',
        'flex items-center justify-center cursor-pointer transition-all duration-300 shadow-sm shrink-0',
        sizeClasses[size],
        className
      )}
      onClick={handleThemeToggle}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      type="button"
      {...props}
    >
      {isDark ? (
        <Sun
          className={cn(
            'transition-all duration-500 ease-in-out text-amber-400 group-hover:rotate-90 group-hover:scale-110 transform-gpu',
            iconSizes[size]
          )}
        />
      ) : (
        <Moon
          className={cn(
            'transition-all duration-500 ease-in-out text-blue-500 group-hover:-rotate-45 group-hover:scale-110 transform-gpu',
            iconSizes[size]
          )}
        />
      )}

      {showLabel && (
        <span className="ml-2 text-xs font-semibold font-['Epilogue']">
          {isDark ? 'Dark' : 'Light'}
        </span>
      )}
    </button>
  );
}

export default SwitchButton;
