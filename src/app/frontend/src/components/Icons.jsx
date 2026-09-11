"use client";

// Clean, restrained SVG icons designed specifically for SkyGuard AI.
// Replaces heavy generic icon libraries with lightweight, consistent geometry.

export function IconOverview({ size = 16, color = "currentColor", ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="3" width="6" height="6" rx="1.5" />
      <rect x="11" y="3" width="6" height="6" rx="1.5" />
      <rect x="3" y="11" width="6" height="6" rx="1.5" />
      <rect x="11" y="11" width="6" height="6" rx="1.5" />
    </svg>
  );
}

export function IconMap({ size = 16, color = "currentColor", ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polygon points="3 5 7.5 3 12.5 5 17 3 17 15 12.5 17 7.5 15 3 17" />
      <line x1="7.5" y1="3" x2="7.5" y2="15" />
      <line x1="12.5" y1="5" x2="12.5" y2="17" />
    </svg>
  );
}

export function IconAnomalies({ size = 16, color = "currentColor", ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M10.29 3.86L1.82 18a1 1 0 0 0 .86 1.5h14.64a1 1 0 0 0 .86-1.5L9.71 3.86a1 1 0 0 0-1.72 0z" />
      <line x1="10" y1="9" x2="10" y2="13" />
      <circle cx="10" cy="16" r="0.5" fill={color} />
    </svg>
  );
}

export function IconStations({ size = 16, color = "currentColor", ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="10" cy="10" r="2.5" />
      <path d="M14.5 5.5a6.5 6.5 0 0 1 0 9" />
      <path d="M5.5 5.5a6.5 6.5 0 0 0 0 9" />
    </svg>
  );
}

export function IconHealth({ size = 16, color = "currentColor", ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M10 18l-7-7a4.5 4.5 0 0 1 6.36-6.36L10 5.27l.64-.63a4.5 4.5 0 1 1 6.36 6.36l-7 7z" />
      <path d="M7 11h2l1.5-3 2 6 1.5-3h2" />
    </svg>
  );
}

export function IconAnalysis({ size = 16, color = "currentColor", ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="3" y1="17" x2="17" y2="17" />
      <polyline points="4 13 8 9 12 11 16 5" />
      <polyline points="13 5 16 5 16 8" />
    </svg>
  );
}

export function IconEvaluation({ size = 16, color = "currentColor", ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="10" cy="10" r="7" />
      <circle cx="10" cy="10" r="3.5" />
      <line x1="10" y1="3" x2="10" y2="5" />
      <line x1="10" y1="15" x2="10" y2="17" />
      <line x1="3" y1="10" x2="5" y2="10" />
      <line x1="15" y1="10" x2="17" y2="10" />
    </svg>
  );
}

export function IconArchitecture({ size = 16, color = "currentColor", ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="3" width="14" height="4" rx="1" />
      <rect x="3" y="9" width="14" height="4" rx="1" />
      <rect x="3" y="15" width="14" height="4" rx="1" />
      <line x1="6" y1="5" x2="6.01" y2="5" />
      <line x1="6" y1="11" x2="6.01" y2="11" />
      <line x1="6" y1="17" x2="6.01" y2="17" />
    </svg>
  );
}

export function IconSettings({ size = 16, color = "currentColor", ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="10" cy="10" r="3" />
      <path d="M16.2 12.3a1.5 1.5 0 0 0 .3 1.6l.4.4a1.7 1.7 0 0 1-2.4 2.4l-.4-.4a1.5 1.5 0 0 0-1.6-.3 1.5 1.5 0 0 0-1 1.4v.6a1.7 1.7 0 0 1-3.4 0v-.6a1.5 1.5 0 0 0-1-1.4 1.5 1.5 0 0 0-1.6.3l-.4.4a1.7 1.7 0 0 1-2.4-2.4l.4-.4a1.5 1.5 0 0 0 .3-1.6 1.5 1.5 0 0 0-1.4-1h-.6a1.7 1.7 0 0 1 0-3.4h.6a1.5 1.5 0 0 0 1.4-1 1.5 1.5 0 0 0-.3-1.6l-.4-.4a1.7 1.7 0 0 1 2.4-2.4l.4.4a1.5 1.5 0 0 0 1.6.3 1.5 1.5 0 0 0 1-1.4v-.6a1.7 1.7 0 0 1 3.4 0v.6a1.5 1.5 0 0 0 1 1.4 1.5 1.5 0 0 0 1.6-.3l.4-.4a1.7 1.7 0 0 1 2.4 2.4l-.4.4a1.5 1.5 0 0 0-.3 1.6 1.5 1.5 0 0 0 1.4 1h.6a1.7 1.7 0 0 1 0 3.4h-.6a1.5 1.5 0 0 0-1.4 1z" />
    </svg>
  );
}

export function IconSearch({ size = 15, color = "currentColor", ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="8.5" cy="8.5" r="5.5" />
      <line x1="13" y1="13" x2="17.5" y2="17.5" />
    </svg>
  );
}

export function IconFilter({ size = 15, color = "currentColor", ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polygon points="3 4 17 4 11.5 10.5 11.5 16 8.5 14 8.5 10.5 3 4" />
    </svg>
  );
}

export function IconRefresh({ size = 15, color = "currentColor", ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="18 4 18 9 13 9" />
      <polyline points="2 16 2 11 7 11" />
      <path d="M3.51 9a7 7 0 0 1 12-3.18L18 9M2 11l2.49 3.18A7 7 0 0 0 16.49 11" />
    </svg>
  );
}

export function IconDownload({ size = 15, color = "currentColor", ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M17 13v3a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-3" />
      <polyline points="7 10 10 13 13 10" />
      <line x1="10" y1="3" x2="10" y2="13" />
    </svg>
  );
}

export function IconChevronRight({ size = 15, color = "currentColor", ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="7.5 4 13.5 10 7.5 16" />
    </svg>
  );
}

export function IconChevronDown({ size = 15, color = "currentColor", ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="4 7.5 10 13.5 16 7.5" />
    </svg>
  );
}

export function IconArrowRight({ size = 15, color = "currentColor", ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="3" y1="10" x2="17" y2="10" />
      <polyline points="11 4 17 10 11 16" />
    </svg>
  );
}

export function IconArrowUpRight({ size = 14, color = "currentColor", ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="5" y1="15" x2="15" y2="5" />
      <polyline points="7 5 15 5 15 13" />
    </svg>
  );
}

export function IconCheck({ size = 15, color = "currentColor", ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="4 11 8 15 16 6" />
    </svg>
  );
}

export function IconAlertCircle({ size = 15, color = "currentColor", ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="10" cy="10" r="7" />
      <line x1="10" y1="7" x2="10" y2="11" />
      <circle cx="10" cy="14" r="0.5" fill={color} />
    </svg>
  );
}

export function IconInfo({ size = 15, color = "currentColor", ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="10" cy="10" r="7" />
      <line x1="10" y1="9" x2="10" y2="14" />
      <circle cx="10" cy="6.5" r="0.5" fill={color} />
    </svg>
  );
}

export function IconSun({ size = 15, color = "currentColor", ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="10" cy="10" r="3.5" />
      <line x1="10" y1="2" x2="10" y2="4" />
      <line x1="10" y1="16" x2="10" y2="18" />
      <line x1="2" y1="10" x2="4" y2="10" />
      <line x1="16" y1="10" x2="18" y2="10" />
    </svg>
  );
}

export function IconMoon({ size = 15, color = "currentColor", ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M16.5 12.8A7 7 0 1 1 8.2 4.5a5.5 5.5 0 0 0 8.3 8.3z" />
    </svg>
  );
}

export function IconPlay({ size = 14, color = "currentColor", ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polygon points="6 4 16 10 6 16 6 4" fill={color} fillOpacity="0.2" />
    </svg>
  );
}

export function IconPause({ size = 14, color = "currentColor", ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="5" y="4" width="3.5" height="12" rx="0.5" fill={color} fillOpacity="0.3" />
      <rect x="11.5" y="4" width="3.5" height="12" rx="0.5" fill={color} fillOpacity="0.3" />
    </svg>
  );
}

export function IconStep({ size = 14, color = "currentColor", ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polygon points="5 4 13 10 5 16 5 4" fill={color} fillOpacity="0.2" />
      <line x1="15" y1="4" x2="15" y2="16" />
    </svg>
  );
}

export function IconClose({ size = 15, color = "currentColor", ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="5" y1="5" x2="15" y2="15" />
      <line x1="15" y1="5" x2="5" y2="15" />
    </svg>
  );
}
