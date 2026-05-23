interface GlowBarProps {
  value: number;
  goal: number;
  label?: string;
  valueLabel?: string;
  height?: number;
}

function barStyle(pct: number): { gradient: string; glow: string } {
  if (pct > 100) return {
    gradient: 'linear-gradient(90deg, #7c3aed, #8B5CF6)',
    glow: '0 0 7px rgba(139,92,246,0.75)',
  };
  if (pct >= 80) return {
    gradient: 'linear-gradient(90deg, #10b981, #F59E0B)',
    glow: '0 0 7px rgba(245,158,11,0.6)',
  };
  if (pct >= 50) return {
    gradient: 'linear-gradient(90deg, #8B5CF6, #00D4FF)',
    glow: '0 0 7px rgba(0,212,255,0.5)',
  };
  return {
    gradient: 'linear-gradient(90deg, #dc2626, #f97316)',
    glow: '0 0 7px rgba(239,68,68,0.5)',
  };
}

export function GlowBar({ value, goal, label, valueLabel, height = 4 }: GlowBarProps) {
  const pct = Math.min(110, (value / goal) * 100);
  const { gradient, glow } = barStyle(pct);

  return (
    <div>
      {(label || valueLabel) && (
        <div className="flex items-baseline justify-between mb-1">
          {label && (
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.58rem',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'rgba(160,175,200,0.55)',
            }}>
              {label}
            </span>
          )}
          {valueLabel && (
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.58rem',
              color: 'rgba(160,175,200,0.45)',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {valueLabel}
            </span>
          )}
        </div>
      )}
      {/* Track */}
      <div style={{
        height: `${height}px`,
        background: 'rgba(255,255,255,0.06)',
        borderRadius: `${height}px`,
        overflow: 'visible',
        position: 'relative',
      }}>
        {/* Fill */}
        <div style={{
          position: 'absolute',
          left: 0,
          top: 0,
          height: `${height}px`,
          width: `${Math.min(100, pct)}%`,
          borderRadius: `${height}px`,
          background: gradient,
          boxShadow: glow,
          transition: 'width 0.5s ease',
        }} />
      </div>
    </div>
  );
}
