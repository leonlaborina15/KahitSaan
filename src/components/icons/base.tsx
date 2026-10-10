import { forwardRef, type SVGProps } from "react";

export type IconProps = SVGProps<SVGSVGElement> & { size?: number; title?: string };

/** Shared frame: 24x24, 2px live-area padding, 1.75 round stroke in currentColor. */
export function createIcon(name: string, paths: React.ReactNode) {
  const Icon = forwardRef<SVGSVGElement, IconProps>(({ size = 24, title, ...props }, ref) => (
    <svg
      ref={ref}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      {...props}
    >
      {title && <title>{title}</title>}
      {paths}
    </svg>
  ));
  Icon.displayName = name;
  return Icon;
}
