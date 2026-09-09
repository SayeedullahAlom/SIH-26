interface LogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
}

export default function Logo({
  className = "",
  size = 36,
  showText = true,
}: LogoProps) {
  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Precision Scales + Shield Vector Emblem */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 drop-shadow-xs"
      >
        <defs>
          <linearGradient id="lmLogoGrad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop stopColor="#0A1329" />
            <stop offset="1" stopColor="#1D3587" />
          </linearGradient>
          <linearGradient id="goldGrad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop stopColor="#F59E0B" />
            <stop offset="1" stopColor="#D97706" />
          </linearGradient>
        </defs>

        {/* Shield Container */}
        <rect width="40" height="40" rx="10" fill="url(#lmLogoGrad)" />

        {/* Outer Shield Outline */}
        <path
          d="M20 6L31 10.5V20C31 26.5 26.3 32.2 20 34C13.7 32.2 9 26.5 9 20V10.5L20 6Z"
          stroke="#3B82F6"
          strokeWidth="1.2"
          strokeOpacity="0.4"
          fill="none"
        />

        {/* Central Balance Pillar */}
        <path d="M20 12V28" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M16 28H24" stroke="white" strokeWidth="1.8" strokeLinecap="round" />

        {/* Scale Fulcrum & Horizontal Beam */}
        <circle cx="20" cy="14" r="1.5" fill="url(#goldGrad)" />
        <path d="M13 16.5L20 14L27 16.5" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />

        {/* Left Pan (Weights & Measures) */}
        <path d="M13 16.5V21" stroke="#93C5FD" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M10 21C10 22.7 11.3 24 13 24C14.7 24 16 22.7 16 21H10Z" fill="white" fillOpacity="0.9" />

        {/* Right Pan (Standard Calibration) */}
        <path d="M27 16.5V21" stroke="#93C5FD" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M24 21C24 22.7 25.3 24 27 24C28.7 24 30 22.7 30 21H24Z" fill="white" fillOpacity="0.9" />

        {/* Verification Check Badge */}
        <circle cx="20" cy="22" r="2.2" fill="url(#goldGrad)" />
      </svg>

      {/* Typography */}
      {showText && (
        <div className="flex flex-col leading-none">
          <div className="flex items-center gap-1">
            <span className="font-display font-black text-base tracking-tight text-[#0A1329]">
              LEGAL
            </span>
            <span className="font-display font-black text-base tracking-tight text-[#1D3587]">
              METROLOGY
            </span>
          </div>
          <span className="text-[9px] uppercase tracking-widest font-extrabold text-zinc-400 mt-0.5">
            Enforcement Portal
          </span>
        </div>
      )}
    </div>
  );
}