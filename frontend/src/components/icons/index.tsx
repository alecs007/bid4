import type { ComponentType } from "react";
import {
  LuArrowRight,
  LuBell,
  LuBookmark,
  LuBuilding2,
  LuCalendar,
  LuChevronDown,
  LuChevronRight,
  LuChevronUp,
  LuCircleAlert,
  LuCircleCheck,
  LuCircleHelp,
  LuCreditCard,
  LuDownload,
  LuEye,
  LuEyeOff,
  LuFileText,
  LuFlame,
  LuHandCoins,
  LuHeartHandshake,
  LuImage,
  LuInfo,
  LuListFilter,
  LuLoaderCircle,
  LuLockKeyhole,
  LuLogOut,
  LuMail,
  LuMapPin,
  LuMenu,
  LuPencil,
  LuPhone,
  LuPlus,
  LuRotateCcw,
  LuScale,
  LuCheck,
  LuSearch,
  LuShare2,
  LuSettings,
  LuShieldCheck,
  LuSparkles,
  LuStar,
  LuTrash2,
  LuTimer,
  LuTriangleAlert,
  LuTruck,
  LuUpload,
  LuUserCog,
  LuUser,
  LuUsers,
  LuWallet,
  LuX,
} from "react-icons/lu";

export interface IconProps {
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
  title?: string;
}

export type Icon = ComponentType<IconProps>;

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
      {/* Filled, because an outlined leaf this small closes up. */}
      <path
        d="M12.3 5.2Q12.9 1.7 16.4 1.4 15.9 4.9 12.3 5.2Z"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  );
}

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

export const Icons = {
  // A hand offering coins, not a courtroom gavel: bidding here is giving.
  auction: LuHandCoins,
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

  // A stopwatch, not a clock face: what matters is the time left, and every
  // interface already has a clock in it.
  clock: LuTimer,
  urgent: LuFlame,
  calendar: LuCalendar,

  success: LuCircleCheck,
  error: LuCircleAlert,
  warning: LuTriangleAlert,
  info: LuInfo,
  help: LuCircleHelp,
  notification: LuBell,

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
  share: LuShare2,
  check: LuCheck,
  expand: LuChevronDown,
  crumb: LuChevronRight,
  collapse: LuChevronUp,
  loading: LuLoaderCircle,

  settings: LuSettings,
  account: LuUser,
  menu: LuMenu,
  roleSwitch: LuUserCog,
  signOut: LuLogOut,
  secure: LuLockKeyhole,
  reveal: LuEye,
  conceal: LuEyeOff,
  email: LuMail,
  phone: LuPhone,
  photo: LuImage,
} satisfies Record<string, Icon>;

export type IconName = keyof typeof Icons;
