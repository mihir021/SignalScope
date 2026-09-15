import React from 'react';

/**
 * Semi-circle radial speedometer gauge inspired by the "Sales Overview" card
 * in the reference dashboard.
 * Renders 24 radial tick marks along a 180-degree arc.
 */
export default function ConfidenceGauge({ value = 0, isReal = true, hasResult = false }) {
  const totalTicks = 28;
  const activeTicks = hasResult ? Math.round((value / 100) * totalTicks) : 0;

  // Generate radial ticks coordinates
  const ticks = [];
  const cx = 100;
  const cy = 95;
  const rInner = 60;
  const rOuter = 82;

  for (let i = 0; i < totalTicks; i++) {
    // Angle from 180deg (left) to 0deg (right)
    const angleDeg = 180 - (i / (totalTicks - 1)) * 180;
    const angleRad = (angleDeg * Math.PI) / 180;

    const x1 = cx + rInner * Math.cos(angleRad);
    const y1 = cy - rInner * Math.sin(angleRad);
    const x2 = cx + rOuter * Math.cos(angleRad);
    const y2 = cy - rOuter * Math.sin(angleRad);

    const isActive = i < activeTicks;
    ticks.push({ x1, y1, x2, y2, isActive });
  }

  // Accent color: soft gold/yellow from reference image, or emerald if authentic
  const activeStroke = isReal ? '#F5CA38' : '#F59E0B';
  const inactiveStroke = '#EAE6DF';

  return (
    <div className="relative flex flex-col items-center justify-center my-2">
      <svg viewBox="0 0 200 115" className="w-56 sm:w-64 overflow-visible">
        {/* Radial tick marks */}
        {ticks.map((tick, idx) => (
          <line
            key={idx}
            x1={tick.x1}
            y1={tick.y1}
            x2={tick.x2}
            y2={tick.y2}
            stroke={tick.isActive ? activeStroke : inactiveStroke}
            strokeWidth="3"
            strokeLinecap="round"
            className="transition-colors duration-500"
          />
        ))}

        {/* Center Text */}
        <text
          x={cx}
          y={cy - 12}
          textAnchor="middle"
          className="text-3xl sm:text-4xl font-bold fill-charcoal-900 font-sans tracking-tight"
        >
          {hasResult ? `${value.toFixed(1)}%` : '0.0%'}
        </text>
        <text
          x={cx}
          y={cy + 8}
          textAnchor="middle"
          className="text-[10px] font-medium fill-charcoal-400 font-sans uppercase tracking-wider"
        >
          {hasResult ? 'Confidence Score' : 'Awaiting Input'}
        </text>
      </svg>
    </div>
  );
}
