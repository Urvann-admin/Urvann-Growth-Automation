'use client';

import React from 'react';

interface ChristmasIconProps {
  className?: string;
  style?: React.CSSProperties;
  size?: number;
}

export function SantaFace({ className = '', style = {}, size = 60 }: ChristmasIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      style={style}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Hat */}
      <path
        d="M30 20 L50 10 L70 20 L70 35 L30 35 Z"
        fill="#DC2626"
      />
      <circle cx="50" cy="15" r="5" fill="#FFFFFF" />
      <path
        d="M30 35 L70 35 L65 50 L35 50 Z"
        fill="#FFFFFF"
      />
      {/* Face */}
      <circle cx="50" cy="50" r="25" fill="#FDB8B8" />
      {/* Eyes */}
      <circle cx="42" cy="48" r="3" fill="#000000" />
      <circle cx="58" cy="48" r="3" fill="#000000" />
      {/* Nose */}
      <circle cx="50" cy="55" r="4" fill="#FF6B6B" />
      {/* Beard */}
      <path
        d="M50 60 Q40 75 30 80 Q50 75 50 60 Q60 75 70 80 Q60 75 50 60"
        fill="#FFFFFF"
      />
      {/* Mustache */}
      <path
        d="M45 55 Q40 58 38 56 Q42 58 45 55 M55 55 Q60 58 62 56 Q58 58 55 55"
        fill="#FFFFFF"
        stroke="#FFFFFF"
        strokeWidth="2"
      />
    </svg>
  );
}

export function Sleigh({ className = '', style = {}, size = 80 }: ChristmasIconProps) {
  return (
    <svg
      width={size}
      height={size * 0.6}
      viewBox="0 0 120 70"
      className={className}
      style={style}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Sleigh body */}
      <path
        d="M10 40 Q20 20 50 25 Q80 30 110 35 L110 50 Q80 45 50 40 Q20 35 10 40"
        fill="#DC2626"
        stroke="#991B1B"
        strokeWidth="2"
      />
      {/* Sleigh runners */}
      <path
        d="M15 50 Q25 48 35 50 Q45 52 55 50 Q65 48 75 50 Q85 52 95 50 Q105 48 110 50"
        fill="none"
        stroke="#1F2937"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* Decorative lines */}
      <line x1="30" y1="30" x2="90" y2="35" stroke="#FFFFFF" strokeWidth="2" opacity="0.7" />
      <line x1="35" y1="38" x2="85" y2="42" stroke="#FFFFFF" strokeWidth="1.5" opacity="0.5" />
      {/* Gifts */}
      <rect x="40" y="28" width="12" height="12" fill="#16A34A" opacity="0.8" />
      <rect x="55" y="30" width="10" height="10" fill="#F59E0B" opacity="0.8" />
      <rect x="68" y="28" width="12" height="12" fill="#DC2626" opacity="0.8" />
    </svg>
  );
}

export function Reindeer({ className = '', style = {}, size = 70 }: ChristmasIconProps) {
  return (
    <svg
      width={size}
      height={size * 1.1}
      viewBox="0 0 70 80"
      className={className}
      style={style}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Body */}
      <ellipse cx="35" cy="50" rx="20" ry="15" fill="#8B4513" />
      {/* Head */}
      <ellipse cx="35" cy="25" rx="12" ry="15" fill="#A0522D" />
      {/* Antlers */}
      <path
        d="M25 15 Q20 5 15 10 Q18 8 25 15 M45 15 Q50 5 55 10 Q52 8 45 15"
        fill="#8B4513"
        stroke="#654321"
        strokeWidth="1"
      />
      <path
        d="M22 12 Q18 2 12 8 Q15 5 22 12 M48 12 Q52 2 58 8 Q55 5 48 12"
        fill="#8B4513"
        stroke="#654321"
        strokeWidth="1"
      />
      {/* Eyes */}
      <circle cx="30" cy="25" r="2" fill="#000000" />
      <circle cx="40" cy="25" r="2" fill="#000000" />
      {/* Nose */}
      <circle cx="35" cy="30" r="2.5" fill="#DC2626" />
      {/* Legs */}
      <rect x="25" y="60" width="4" height="15" fill="#654321" />
      <rect x="41" y="60" width="4" height="15" fill="#654321" />
      {/* Tail */}
      <ellipse cx="15" cy="52" rx="5" ry="8" fill="#8B4513" />
    </svg>
  );
}

export function ChristmasSock({ className = '', style = {}, size = 50 }: ChristmasIconProps) {
  return (
    <svg
      width={size}
      height={size * 1.4}
      viewBox="0 0 50 70"
      className={className}
      style={style}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Sock body */}
      <path
        d="M25 10 Q30 5 35 10 L35 50 Q35 60 30 65 Q25 70 20 65 Q15 60 15 50 L15 10 Q20 5 25 10"
        fill="#DC2626"
        stroke="#991B1B"
        strokeWidth="2"
      />
      {/* Cuff */}
      <rect x="15" y="50" width="20" height="20" fill="#FFFFFF" />
      {/* Stripes */}
      <line x1="15" y1="20" x2="35" y2="20" stroke="#FFFFFF" strokeWidth="2" />
      <line x1="15" y1="30" x2="35" y2="30" stroke="#FFFFFF" strokeWidth="2" />
      <line x1="15" y1="40" x2="35" y2="40" stroke="#FFFFFF" strokeWidth="2" />
      {/* Decorative dots */}
      <circle cx="20" cy="25" r="2" fill="#F59E0B" />
      <circle cx="30" cy="35" r="2" fill="#16A34A" />
      <circle cx="20" cy="45" r="2" fill="#F59E0B" />
    </svg>
  );
}

