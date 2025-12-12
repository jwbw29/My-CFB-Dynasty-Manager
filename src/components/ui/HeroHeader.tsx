// src/components/ui/HeroHeader.tsx
"use client";

import React, { ReactNode } from "react";
import { LucideIcon } from "lucide-react";

interface HeroHeaderProps {
  /**
   * The main title text to display
   */
  title: string;

  /**
   * Optional subtitle or secondary text
   */
  subtitle?: string;

  /**
   * Optional icon to display alongside the title
   */
  icon?: LucideIcon;

  /**
   * Optional additional content to render (e.g., team logo, badges, etc.)
   */
  children?: ReactNode;

  /**
   * Custom className to apply to the outer container
   */
  className?: string;
}

/**
 * Reusable Hero Header component used across multiple pages
 * Provides consistent styling with gradient backgrounds and text
 */
export const HeroHeader: React.FC<HeroHeaderProps> = ({
  title,
  subtitle,
  icon: Icon,
  children,
  className = "",
}) => {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 to-accent dark:from-blue-950/30 dark:via-purple-950/30 dark:to-pink-950/30 border border-gray-200 dark:border-gray-700 shadow-lg ${className}`}
    >
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      <div className="relative p-6 md:p-8">
        {/* Main content area */}
        <div className="flex flex-col justify-center items-center text-center gap-2">
          {/* Title with optional icon */}
          <h1 className="text-4xl md:text-5xl leading-relaxed md:leading-relaxed font-black bg-gradient-to-r from-gray-900 via-gray-700 to-gray-900 dark:from-gray-100 dark:via-gray-300 dark:to-gray-100 bg-clip-text text-transparent flex items-center gap-3 justify-center">
            {Icon && <Icon className="h-10 w-10 text-blue-600 dark:text-blue-400" />}
            {title}
          </h1>

          {/* Optional subtitle */}
          {subtitle && (
            <p className="text-lg font-semibold text-gray-600 dark:text-gray-400">
              {subtitle}
            </p>
          )}

          {/* Custom children content */}
          {children}
        </div>
      </div>
    </div>
  );
};
