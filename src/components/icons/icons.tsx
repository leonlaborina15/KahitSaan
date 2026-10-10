import { createIcon } from "./base";

// All glyphs sit inside the 3..21 live area so they read the same size in the nav.

export const HomeIcon = createIcon("HomeIcon", (
  <>
    <path d="M3.5 10.5 12 3.75l8.5 6.75" />
    <path d="M5.5 9v10.25c0 .41.34.75.75.75H10v-5.5h4V20h3.75c.41 0 .75-.34.75-.75V9" />
  </>
));

export const HistoryIcon = createIcon("HistoryIcon", (
  <>
    <path d="M3.75 12a8.25 8.25 0 1 0 2.42-5.83" />
    <path d="M3.75 4v4h4" />
    <path d="M12 8v4.25l2.75 1.75" />
  </>
));

export const ShuffleIcon = createIcon("ShuffleIcon", (
  <>
    <path d="M3.5 7h3.2c1.6 0 3.1.8 4 2.1l2.6 3.8c.9 1.3 2.4 2.1 4 2.1h3.2" />
    <path d="M3.5 17h3.2c1.1 0 2.2-.4 3-1.1" />
    <path d="M14.3 8.1c.8-.7 1.9-1.1 3-1.1h3.2" />
    <path d="m18 4.5 2.5 2.5L18 9.5" />
    <path d="m18 14.5 2.5 2.5-2.5 2.5" />
  </>
));

export const HeartIcon = createIcon("HeartIcon", (
  <path d="M12 20s-7.75-4.6-7.75-10.1A4.15 4.15 0 0 1 12 7.5a4.15 4.15 0 0 1 7.75 2.4C19.75 15.4 12 20 12 20Z" />
));

export const UserIcon = createIcon("UserIcon", (
  <>
    <circle cx="12" cy="8.25" r="4" />
    <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
  </>
));

export const WalletIcon = createIcon("WalletIcon", (
  <>
    <path d="M18.5 7.5V6a1.75 1.75 0 0 0-1.75-1.75H5.5A2 2 0 0 0 3.5 6.25v11.5c0 1.1.9 2 2 2h13c1.1 0 2-.9 2-2v-8.25c0-1.1-.9-2-2-2H5.5a2 2 0 0 1-2-2" />
    <circle cx="16.25" cy="13.75" r="1" fill="currentColor" stroke="none" />
  </>
));

export const MapPinIcon = createIcon("MapPinIcon", (
  <>
    <path d="M12 20.5s-6.5-5.4-6.5-10.75a6.5 6.5 0 0 1 13 0C18.5 15.1 12 20.5 12 20.5Z" />
    <circle cx="12" cy="9.75" r="2.25" />
  </>
));

export const ClockIcon = createIcon("ClockIcon", (
  <>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </>
));

export const FlameIcon = createIcon("FlameIcon", (
  <path d="M12 20.5c3.6 0 6.25-2.6 6.25-6.1 0-3.9-3-6.4-4.4-10.9-2.4 1.7-3.6 4-3.6 6.2-1-.6-1.6-1.6-1.8-2.8-1.6 1.7-2.7 4-2.7 6.8 0 3.9 2.65 6.8 6.25 6.8Z" />
));

export const MicIcon = createIcon("MicIcon", (
  <>
    <rect x="9" y="3.5" width="6" height="11" rx="3" />
    <path d="M5.75 11.5a6.25 6.25 0 0 0 12.5 0" />
    <path d="M12 17.75v2.75" />
  </>
));

export const SearchIcon = createIcon("SearchIcon", (
  <>
    <circle cx="11" cy="11" r="6.75" />
    <path d="m16 16 4.25 4.25" />
  </>
));

export const SparklesIcon = createIcon("SparklesIcon", (
  <>
    <path d="M10 4.5c.5 3.2 2.3 5 5.5 5.5-3.2.5-5 2.3-5.5 5.5-.5-3.2-2.3-5-5.5-5.5 3.2-.5 5-2.3 5.5-5.5Z" />
    <path d="M17.5 14.5c.25 1.6 1.15 2.5 2.75 2.75-1.6.25-2.5 1.15-2.75 2.75-.25-1.6-1.15-2.5-2.75-2.75 1.6-.25 2.5-1.15 2.75-2.75Z" />
  </>
));

export const ThumbsUpIcon = createIcon("ThumbsUpIcon", (
  <>
    <path d="M7.5 10.5v9.25" />
    <path d="M7.5 10.5 11 3.75c1.5 0 2.5 1.1 2.25 2.6L12.75 9.5h5.1c1.25 0 2.15 1.2 1.85 2.4l-1.6 6.3c-.2.9-1 1.55-1.95 1.55H4.75c-.7 0-1.25-.55-1.25-1.25v-6.75c0-.7.55-1.25 1.25-1.25H7.5Z" />
  </>
));

export const ThumbsDownIcon = createIcon("ThumbsDownIcon", (
  <>
    <path d="M16.5 13.5V4.25" />
    <path d="M16.5 13.5 13 20.25c-1.5 0-2.5-1.1-2.25-2.6l.5-3.15h-5.1c-1.25 0-2.15-1.2-1.85-2.4l1.6-6.3c.2-.9 1-1.55 1.95-1.55h11.4c.7 0 1.25.55 1.25 1.25v6.75c0 .7-.55 1.25-1.25 1.25H16.5Z" />
  </>
));

export const ChevronRightIcon = createIcon("ChevronRightIcon", <path d="m9.5 5.5 6.5 6.5-6.5 6.5" />);

export const DownloadIcon = createIcon("DownloadIcon", (
  <>
    <path d="M12 3.75v11" />
    <path d="m7.5 10.5 4.5 4.5 4.5-4.5" />
    <path d="M4.25 16.5v2c0 .97.78 1.75 1.75 1.75h12c.97 0 1.75-.78 1.75-1.75v-2" />
  </>
));

export const ResetIcon = createIcon("ResetIcon", (
  <>
    <path d="M4.25 12a7.75 7.75 0 1 0 2.3-5.5" />
    <path d="M4.25 3.75v4.5h4.5" />
  </>
));

export const ShieldIcon = createIcon("ShieldIcon", (
  <>
    <path d="M12 20.75s7-3 7-9.25V6l-7-2.75L5 6v5.5c0 6.25 7 9.25 7 9.25Z" />
    <path d="m9 12 2.25 2.25L15.25 10" />
  </>
));

export const CheckIcon = createIcon("CheckIcon", <path d="m5 12.5 4.5 4.5L19 7.5" />);

export const ChevronLeftIcon = createIcon("ChevronLeftIcon", <path d="M14.5 5.5 8 12l6.5 6.5" />);

export const XIcon = createIcon("XIcon", <path d="M6 6l12 12M18 6 6 18" />);

export const SlidersIcon = createIcon("SlidersIcon", (
  <>
    <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
    <circle cx="15" cy="7" r="2" />
    <circle cx="9" cy="17" r="2" />
  </>
));

export const SpinnerIcon = createIcon("SpinnerIcon", <path d="M12 3.5a8.5 8.5 0 1 1-8.5 8.5" />);
