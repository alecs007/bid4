import type { ComponentType } from "react";
import {
  LuArrowRight,
  LuBell,
  LuBookmark,
  LuBuilding2,
  LuCalendar,
  LuCheck,
  LuChevronDown,
  LuChevronRight,
  LuChevronUp,
  LuCircleAlert,
  LuCircleCheck,
  LuCircleHelp,
  LuCopy,
  LuCreditCard,
  LuDownload,
  LuExpand,
  LuEye,
  LuEyeOff,
  LuFileText,
  LuFlame,
  LuHandCoins,
  LuHeartHandshake,
  LuImage,
  LuInfo,
  LuFilter,
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
  LuSearch,
  LuSettings,
  LuShare2,
  LuShieldCheck,
  LuSparkles,
  LuStar,
  LuTimer,
  LuTrash2,
  LuTriangleAlert,
  LuTruck,
  LuUpload,
  LuUser,
  LuUserRound,
  LuUserCog,
  LuUsers,
  LuWallet,
  LuX,
  LuZoomIn,
  LuZoomOut,
} from "react-icons/lu";

export interface IconProps {
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
  title?: string;
}

export type Icon = ComponentType<IconProps>;

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
  auction: LuHandCoins,
  // The same glyph as `cause`, and deliberately: giving and the thing given to
  // are one idea here, and two drawings for it only asked the reader which was
  // which.
  donation: LuHeartHandshake,
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

  clock: LuTimer,
  urgent: LuFlame,
  calendar: LuCalendar,

  success: LuCircleCheck,
  error: LuCircleAlert,
  warning: LuTriangleAlert,
  info: LuInfo,
  help: LuCircleHelp,
  notification: LuBell,
  /** A letter, not a tray: what arrives here is a message from a person. */
  inbox: LuMail,

  add: LuPlus,
  edit: LuPencil,
  remove: LuTrash2,
  download: LuDownload,
  upload: LuUpload,
  search: LuSearch,
  zoomIn: LuZoomIn,
  zoomOut: LuZoomOut,
  fitToScreen: LuExpand,
  filter: LuFilter,
  refresh: LuRotateCcw,
  close: LuX,
  forward: LuArrowRight,
  share: LuShare2,
  check: LuCheck,
  copy: LuCopy,
  expand: LuChevronDown,
  crumb: LuChevronRight,
  collapse: LuChevronUp,
  loading: LuLoaderCircle,

  settings: LuSettings,
  account: LuUser,
  /** The signed-out stand-in for an avatar: rounded already, so it needs no ring. */
  accountRound: LuUserRound,
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
