import type { ReactNode } from "react";

// Stroke icon set (Lucide-like, stroke ~1.8) used across the redesigned screens.
// Pure presentational component — safe in both Server and Client Components.
const paths: Record<string, ReactNode> = {
  search: (
    <>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </>
  ),
  plus: <path d="M5 12h14M12 5v14" />,
  minus: <path d="M5 12h14" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </>
  ),
  users: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  flame: (
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5Z" />
  ),
  back: <path d="M19 12H5M12 19l-7-7 7-7" />,
  arrow: <path d="M5 12h14M12 5l7 7-7 7" />,
  chevron: <path d="m9 18 6-6-6-6" />,
  check: <path d="M20 6 9 17l-5-5" />,
  x: <path d="M18 6 6 18M6 6l12 12" />,
  star: <path d="M12 2.5l2.9 5.88 6.5.95-4.7 4.58 1.1 6.47L12 17.9 6.2 20.96l1.1-6.47-4.7-4.58 6.5-.95L12 2.5Z" />,
  heart: (
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.5 4.04 3 5.5l7 7Z" />
  ),
  leaf: (
    <>
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.52-4.48 10-10 10Z" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6" />
    </>
  ),
  filter: <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3Z" />,
  image: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2.5" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21" />
    </>
  ),
  chef: (
    <>
      <path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z" />
      <path d="M6 17h12" />
    </>
  ),
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  grip: <path d="M4 6h16M4 12h16M4 18h16" />,
  menu: <path d="M3 6h18M3 12h18M3 18h18" />,
  home: (
    <>
      <path d="M3 10.2 12 3l9 7.2" />
      <path d="M5.5 9.3V20h13V9.3" />
      <path d="M10 20v-5h4v5" />
    </>
  ),
  book: (
    <>
      <path d="M12 6.5C10.4 5.1 8 4.5 4.5 4.5V18c3.5 0 5.9.6 7.5 2 1.6-1.4 4-2 7.5-2V4.5c-3.5 0-5.9.6-7.5 2Z" />
      <path d="M12 6.5V20" />
    </>
  ),
  cart: (
    <>
      <circle cx="9" cy="20" r="1.4" />
      <circle cx="18" cy="20" r="1.4" />
      <path d="M2.5 3.5H5l2.3 11.1a1.5 1.5 0 0 0 1.5 1.2h8.5a1.5 1.5 0 0 0 1.5-1.2L21.5 7H6" />
    </>
  ),
  sliders: (
    <>
      <path d="M4 7h6M14 7h6M4 12h10M18 12h2M4 17h3M11 17h9" />
      <circle cx="12" cy="7" r="2.2" />
      <circle cx="16" cy="12" r="2.2" />
      <circle cx="9" cy="17" r="2.2" />
    </>
  ),
  dots: (
    <>
      <circle cx="5" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="19" cy="12" r="1.6" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" />
    </>
  ),
  tool: (
    <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-2.7 2.7-2-2 2.7-2.7Z" />
  ),
  cherry: (
    <>
      <circle cx="7.5" cy="16.5" r="3.3" />
      <circle cx="16.5" cy="15" r="3.3" />
      <path d="M9.5 13.4C11 8 14 5 19 4" />
      <path d="M16.3 12C15.2 8.5 16.6 5.8 19 4" />
    </>
  ),
  carrot: (
    <>
      <path d="M14.6 9.4 6 18a2.1 2.1 0 0 0 3 3l8.6-8.6Z" />
      <path d="M14.6 9.4c.2-2 1.5-3.4 3.5-3.5M14.6 9.4c-1.7-.7-2.4-2.6-1.7-4.5" />
      <path d="M11.2 11.4l3.4 3.4" />
    </>
  ),
  sprout: (
    <>
      <path d="M12 22V12" />
      <path d="M12 12C12 8 9 6 4 6c0 4 3 6 8 6Z" />
      <path d="M12 12c0-3 2-5 6-5 0 3-2 5-6 5Z" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
      <path d="M3 9h18M8 2.5v4M16 2.5v4" />
    </>
  ),
  palette: (
    <>
      <path d="M12 2a10 10 0 1 0 0 20c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.2 0-1 .8-1.8 1.8-1.8H16a6 6 0 0 0 6-6c0-5-4.5-7.7-10-7.7Z" />
      <circle cx="9.5" cy="7.5" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="13.5" cy="6.5" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="17" cy="10" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="6.5" cy="12" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),
  ruler: (
    <>
      <path d="M3 8.5 8.5 3 21 15.5 15.5 21Z" />
      <path d="M7 7l2 2M10.5 10.5l2 2M14 14l2 2" />
    </>
  ),
  key: (
    <>
      <circle cx="8" cy="15" r="4" />
      <path d="M10.8 12.2 21 2M17 6l2 2M14 9l2 2" />
    </>
  ),
  sparkle: <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8Z" />,
  camera: (
    <>
      <path d="M3 8a2 2 0 0 1 2-2h2l1.5-2h7L19 6h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
      <circle cx="12" cy="12.5" r="3.2" />
    </>
  ),
  refresh: (
    <>
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
      <path d="M3 21v-5h5" />
    </>
  ),
  merge: (
    <>
      <path d="M7 21V9M7 9 3.5 12.5M7 9l3.5 3.5" />
      <path d="M7 9c0-3 2-4 5-4h8.5M17 1.5 21 5l-4 3.5" />
    </>
  ),
  alert: (
    <>
      <path d="M12 9v4M12 17h.01" />
      <path d="M10.3 3.8 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0Z" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.6 2.7 2.6 15.3 0 18M12 3c-2.6 2.7-2.6 15.3 0 18" />
    </>
  ),
  download: (
    <>
      <path d="M12 3v12M7 11l5 5 5-5" />
      <path d="M4 20h16" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>
  ),
  trash: <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />,
  bell: (
    <>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </>
  ),
};

export type IconName = keyof typeof paths;

export function Icon({
  name,
  size = 18,
  strokeWidth = 1.8,
  className,
  fill = "none",
}: {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  className?: string;
  fill?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
