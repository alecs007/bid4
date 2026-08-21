import type { ComponentType } from "react";
import {
  LuArrowRight,
  LuBell,
  LuBookmark,
  LuBuilding2,
  LuCalendar,
  LuChevronDown,
  LuChevronUp,
  LuCircleAlert,
  LuCircleCheck,
  LuCircleHelp,
  LuClock,
  LuCreditCard,
  LuDownload,
  LuFileText,
  LuFlame,
  LuGavel,
  LuHeartHandshake,
  LuImage,
  LuInfo,
  LuListFilter,
  LuLoaderCircle,
  LuLockKeyhole,
  LuLogOut,
  LuMail,
  LuMapPin,
  LuPencil,
  LuPhone,
  LuPlus,
  LuRotateCcw,
  LuScale,
  LuSearch,
  LuSettings,
  LuShieldCheck,
  LuSparkles,
  LuStar,
  LuTrash2,
  LuTriangleAlert,
  LuTruck,
  LuUpload,
  LuUserCog,
  LuUsers,
  LuWallet,
  LuX,
} from "react-icons/lu";

/**
 * ============================================================================
 * ICON REGISTRY  —  the one place to swap in your own artwork
 * ============================================================================
 *
 * Every icon in the app is referenced through this file by MEANING, never by
 * library name. Components import `Icons.donation`, not `LuHeartHandshake`.
 *
 * TO REPLACE AN ICON WITH YOUR OWN SVG:
 *   1. Write a component in the "custom icons" section below, following the
 *      `LeafHeartIcon` template: accept `className`, use `currentColor` for
 *      every stroke and fill, and keep a 24x24 viewBox.
 *   2. Point the registry entry at it, e.g. `donation: LeafHeartIcon`.
 *   3. Done. Every screen that shows that icon updates at once.
 *
 * Sizing and colour are always applied by the consumer through `className`
 * (`h-5 w-5 text-primary-700`), so an icon must never hard-code either.
 */

export interface IconProps {
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
  title?: string;
}

export type Icon = ComponentType<IconProps>;

/* ---------------------------------------------------------------------------
 * Custom icons
 *
 * `LeafHeartIcon` is the working template: copy its shape, replace the paths.
 * ------------------------------------------------------------------------ */

/** bid4's own mark: a heart with a leaf sprout. Used for donation moments. */
export function LeafHeartIcon({ className, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M12 20.5C7 17 3.5 13.8 3.5 10.4A4.4 4.4 0 0 1 8 6c1.7 0 3.2 1 4 2.4C12.8 7 14.3 6 16 6a4.4 4.4 0 0 1 4.5 4.4c0 3.4-3.5 6.6-8.5 10.1Z" />
      <path d="M12 8.4c0-2 .8-3.7 2.4-4.9" />
    </svg>
  );
}

/** A parcel handed over. Nicer than a plain box for fulfilment moments. */
export function ParcelIcon({ className, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M3 8.5 12 4l9 4.5v7L12 20l-9-4.5Z" />
      <path d="m3 8.5 9 4.5 9-4.5" />
      <path d="M12 13v7" />
      <path d="M7.5 6.2 16.5 11" />
    </svg>
  );
}

/* ---------------------------------------------------------------------------
 * The registry
 *
 * Left column: what the icon MEANS in bid4.
 * Right column: what currently draws it. Replace freely.
 * ------------------------------------------------------------------------ */

export const Icons = {
  /* --- domain ---------------------------------------------------------- */
  auction: LuGavel,
  donation: LeafHeartIcon,
  cause: LuHeartHandshake,
  parcel: ParcelIcon,
  delivery: LuTruck,
  locker: LuMapPin,
  escrow: LuShieldCheck,
  payment: LuCreditCard,
  wallet: LuWallet,
  invoice: LuFileText,
  dispute: LuScale,
  members: LuUsers,
  organization: LuBuilding2,
  rating: LuStar,
  watchlist: LuBookmark,
  impact: LuSparkles,

  /* --- time ------------------------------------------------------------ */
  clock: LuClock,
  urgent: LuFlame,
  calendar: LuCalendar,

  /* --- feedback -------------------------------------------------------- */
  success: LuCircleCheck,
  error: LuCircleAlert,
  warning: LuTriangleAlert,
  info: LuInfo,
  help: LuCircleHelp,
  notification: LuBell,

  /* --- actions --------------------------------------------------------- */
  add: LuPlus,
  edit: LuPencil,
  remove: LuTrash2,
  download: LuDownload,
  upload: LuUpload,
  search: LuSearch,
  filter: LuListFilter,
  refresh: LuRotateCcw,
  close: LuX,
  forward: LuArrowRight,
  expand: LuChevronDown,
  collapse: LuChevronUp,
  loading: LuLoaderCircle,

  /* --- account --------------------------------------------------------- */
  settings: LuSettings,
  roleSwitch: LuUserCog,
  signOut: LuLogOut,
  secure: LuLockKeyhole,
  email: LuMail,
  phone: LuPhone,
  photo: LuImage,
} satisfies Record<string, Icon>;

export type IconName = keyof typeof Icons;
