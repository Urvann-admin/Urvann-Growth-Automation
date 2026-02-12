'use client';

import { ChristmasTheme } from '@/components/theme/ChristmasTheme';
import { THEME_CONFIG, CHRISTMAS_COLORS } from '@/config/theme';

export function ListingLoadingScreen() {
  const isChristmasTheme = THEME_CONFIG.ENABLE_CHRISTMAS_THEME;

  return (
    <ChristmasTheme variant="dashboard">
      <div
        className={`min-h-screen flex items-center justify-center ${isChristmasTheme ? '' : 'bg-gradient-to-br from-slate-50 via-white to-emerald-50/30'}`}
        style={
          isChristmasTheme
            ? {
                background: `linear-gradient(135deg, ${CHRISTMAS_COLORS.background} 0%, ${CHRISTMAS_COLORS.white} 50%, ${CHRISTMAS_COLORS.light} 100%)`,
              }
            : {}
        }
      >
        <div className="flex flex-col items-center space-y-4">
          <div
            className={`animate-spin rounded-full h-12 w-12 border-3 border-t-transparent ${isChristmasTheme ? '' : 'border-emerald-500'}`}
            style={
              isChristmasTheme
                ? {
                    borderColor: `${CHRISTMAS_COLORS.primary} transparent transparent transparent`,
                  }
                : {}
            }
          />
          <p className={`text-sm ${isChristmasTheme ? 'text-slate-700' : 'text-slate-600'}`}>
            Loading...
          </p>
        </div>
      </div>
    </ChristmasTheme>
  );
}
