import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 20, children, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export const PlayIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="M7.5 4.8v14.4a1 1 0 0 0 1.5.86l11.6-7.2a1 1 0 0 0 0-1.72L9 3.94a1 1 0 0 0-1.5.86z" fill="currentColor" stroke="none" />
  </Svg>
);

export const PauseIcon = (props: IconProps) => (
  <Svg {...props}>
    <rect x="6" y="4.5" width="4.2" height="15" rx="1.2" fill="currentColor" stroke="none" />
    <rect x="13.8" y="4.5" width="4.2" height="15" rx="1.2" fill="currentColor" stroke="none" />
  </Svg>
);

export const LoopIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="M17 2.5l3 3-3 3" />
    <path d="M4 11.5v-1a5 5 0 0 1 5-5h11" />
    <path d="M7 21.5l-3-3 3-3" />
    <path d="M20 12.5v1a5 5 0 0 1-5 5H4" />
  </Svg>
);

export const SpeedIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="M4.2 17.5a9 9 0 1 1 15.6 0" />
    <path d="M12 13.5l4-5" />
    <circle cx="12" cy="13.5" r="1.4" fill="currentColor" />
  </Svg>
);

export const PitchIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="M9 18V5.5l10-2V16" />
    <circle cx="6.5" cy="18" r="2.5" />
    <circle cx="16.5" cy="16" r="2.5" />
  </Svg>
);

export const VolumeIcon = ({ muted, ...props }: IconProps & { muted?: boolean }) => (
  <Svg {...props}>
    <path d="M11 5L6.5 9H3v6h3.5L11 19V5z" fill="currentColor" stroke="none" />
    {muted ? (
      <path d="M16 9.5l5 5M21 9.5l-5 5" />
    ) : (
      <>
        <path d="M15.5 8.8a4.5 4.5 0 0 1 0 6.4" />
        <path d="M18.4 6a8.5 8.5 0 0 1 0 12" />
      </>
    )}
  </Svg>
);

export const FollowIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="M12 4v11" />
    <path d="M7.5 10.5L12 15l4.5-4.5" />
    <path d="M5 20h14" />
  </Svg>
);

export const VideoIcon = (props: IconProps) => (
  <Svg {...props}>
    <rect x="2.5" y="5" width="19" height="14" rx="3.5" />
    <path d="M10 9.2v5.6l4.8-2.8z" fill="currentColor" stroke="none" />
  </Svg>
);

export const TracksIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="M4 6h16M4 12h16M4 18h10" />
  </Svg>
);

export const UploadIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="M12 15V4" />
    <path d="M7.5 8.5L12 4l4.5 4.5" />
    <path d="M4.5 14.5v3a2.5 2.5 0 0 0 2.5 2.5h10a2.5 2.5 0 0 0 2.5-2.5v-3" />
  </Svg>
);

export const JsonIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="M8 4H7a2 2 0 0 0-2 2v3.5a2 2 0 0 1-2 2.5 2 2 0 0 1 2 2.5V18a2 2 0 0 0 2 2h1" />
    <path d="M16 4h1a2 2 0 0 1 2 2v3.5a2 2 0 0 0 2 2.5 2 2 0 0 0-2 2.5V18a2 2 0 0 1-2 2h-1" />
  </Svg>
);

export const CloseIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Svg>
);

export const ChevronIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="M6 9l6 6 6-6" />
  </Svg>
);

export const LogoMark = (props: IconProps) => (
  <Svg strokeWidth={2} {...props}>
    <path d="M3 6.5h18M3 10.5h18M3 14.5h18M3 18.5h18" opacity="0.35" />
    <path d="M6 18.5l4-8 4 4 4-8" strokeWidth={2.6} />
  </Svg>
);

export const GuitarIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="M20.5 3.5l-7.3 7.3" />
    <path d="M18.4 2.7l2.9 2.9" />
    <path d="M12.3 9.2c-1.6-1.3-3.8-1-4.8.4-.6.8-.5 1.8-1.4 2.6-.9.7-2.3.7-3 1.8-1.1 1.7-.3 4 1.3 5.2 1.5 1.1 3.8 1.2 5.1-.1 1-1 .8-2.5 1.8-3.4.8-.8 2-.7 2.8-1.4 1.3-1.2 1.2-3.5-.8-5.1z" />
    <circle cx="8.6" cy="15.4" r="1.3" />
  </Svg>
);

export const BassIcon = (props: IconProps) => (
  <Svg {...props}>
    <path d="M21 3l-8.6 8.6" />
    <path d="M18.3 2.3l3.4 3.4" />
    <path d="M11.8 10.2c-1.4-1-3.4-.7-4.3.6-.5.7-.5 1.6-1.3 2.3-.8.7-2.1.6-2.8 1.6-1 1.5-.3 3.6 1.2 4.7 1.4 1 3.5 1.1 4.7-.1.9-.9.7-2.2 1.6-3 .7-.7 1.8-.7 2.5-1.3 1.2-1.1 1.1-3.2-1.6-4.8z" />
    <path d="M6.8 15.2l2 2" />
  </Svg>
);

export const DrumsIcon = (props: IconProps) => (
  <Svg {...props}>
    <ellipse cx="12" cy="10" rx="8" ry="3" />
    <path d="M4 10v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
    <path d="M8 12.8v6M16 12.8v6" />
    <path d="M9 7L5 2.5M15 7l4-4.5" />
  </Svg>
);

export const KeysIcon = (props: IconProps) => (
  <Svg {...props}>
    <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
    <path d="M7.5 5v14M12 5v14M16.5 5v14" />
    <path d="M7.5 5v7M12 5v7M16.5 5v7" strokeWidth={3.2} />
  </Svg>
);

export const VocalsIcon = (props: IconProps) => (
  <Svg {...props}>
    <rect x="9" y="2.5" width="6" height="11" rx="3" />
    <path d="M5.5 11a6.5 6.5 0 0 0 13 0" />
    <path d="M12 17.5v4M8.5 21.5h7" />
  </Svg>
);
