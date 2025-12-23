'use client';

import { Snowfall } from 'react-snowfall';
import { THEME_CONFIG } from '@/config/theme';

interface SnowfallEffectProps {
  enabled?: boolean;
}

export function SnowfallEffect({ enabled }: SnowfallEffectProps) {
  if (!THEME_CONFIG.ENABLE_CHRISTMAS_THEME || !enabled) {
    return null;
  }

  return (
    <Snowfall
      color="#FFFFFF"
      snowflakeCount={100}
      speed={[0.5, 2]}
      wind={[-0.5, 2]}
      radius={[0.5, 3]}
      style={{
        position: 'fixed',
        width: '100%',
        height: '100%',
        top: 0,
        left: 0,
        zIndex: 1000,
        pointerEvents: 'none',
      }}
    />
  );
}



