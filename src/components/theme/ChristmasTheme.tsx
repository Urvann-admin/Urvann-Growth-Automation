'use client';

import { ReactNode } from 'react';
import { THEME_CONFIG, CHRISTMAS_COLORS } from '@/config/theme';

interface ChristmasThemeProps {
  children: ReactNode;
  variant?: 'login' | 'dashboard';
}

export function ChristmasTheme({ children, variant = 'dashboard' }: ChristmasThemeProps) {
  if (!THEME_CONFIG.ENABLE_CHRISTMAS_THEME) {
    return <>{children}</>;
  }

  const baseStyles: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    minHeight: '100vh',
  };

  const backgroundGradient = variant === 'login' 
    ? `linear-gradient(135deg, ${CHRISTMAS_COLORS.gradient.from} 0%, ${CHRISTMAS_COLORS.gradient.via} 50%, ${CHRISTMAS_COLORS.gradient.to} 100%)`
    : `linear-gradient(135deg, ${CHRISTMAS_COLORS.background} 0%, #FFFFFF 50%, ${CHRISTMAS_COLORS.light} 100%)`;

  return (
    <div style={baseStyles}>
      {/* Animated background decorations */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: backgroundGradient,
          zIndex: 0,
          overflow: 'hidden',
        }}
      >
        {/* Floating ornaments */}
        {variant === 'dashboard' && (
          <>
            <div
              style={{
                position: 'absolute',
                top: '10%',
                left: '5%',
                width: '20px',
                height: '20px',
                background: CHRISTMAS_COLORS.gold,
                borderRadius: '50%',
                boxShadow: `0 0 10px ${CHRISTMAS_COLORS.gold}`,
                animation: 'float 6s ease-in-out infinite',
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: '20%',
                right: '10%',
                width: '15px',
                height: '15px',
                background: CHRISTMAS_COLORS.green,
                borderRadius: '50%',
                boxShadow: `0 0 8px ${CHRISTMAS_COLORS.green}`,
                animation: 'float 8s ease-in-out infinite',
                animationDelay: '1s',
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: '15%',
                left: '15%',
                width: '18px',
                height: '18px',
                background: CHRISTMAS_COLORS.accent,
                borderRadius: '50%',
                boxShadow: `0 0 10px ${CHRISTMAS_COLORS.accent}`,
                animation: 'float 7s ease-in-out infinite',
                animationDelay: '2s',
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: '50%',
                right: '5%',
                width: '12px',
                height: '12px',
                background: CHRISTMAS_COLORS.gold,
                borderRadius: '50%',
                boxShadow: `0 0 6px ${CHRISTMAS_COLORS.gold}`,
                animation: 'float 9s ease-in-out infinite',
                animationDelay: '0.5s',
              }}
            />
          </>
        )}
      </div>

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {children}
      </div>

      {/* CSS Animations */}
      <style jsx global>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
            opacity: 0.7;
          }
          50% {
            transform: translateY(-20px) rotate(180deg);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}



