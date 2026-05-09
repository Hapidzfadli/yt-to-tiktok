interface Props {
  className?: string;
}

export function Logo({ className = "" }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-2 font-bold tracking-tight ${className}`}
    >
      <span className="relative inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand/15 ring-1 ring-brand/30">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          aria-hidden="true"
        >
          <path
            d="M5 5v14l5-3.5V8.5L5 5Z"
            fill="#ff0050"
          />
          <path
            d="M11 8.5v7l5 3.5V5l-5 3.5Z"
            fill="#ff0050"
            fillOpacity="0.55"
          />
          <path
            d="M17 12h3"
            stroke="#ff0050"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </span>
      <span className="text-base">
        yt-to-<span className="text-brand">tiktok</span>
      </span>
    </span>
  );
}
