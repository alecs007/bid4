/**
 * The bid4 design system. Feature code imports from `@/components/ui` only.
 * Anything used on more than one screen belongs here; one-offs stay colocated
 * with their feature.
 */
export { Button, ButtonLink } from "./Button";
export type { ButtonProps, ButtonLinkProps, ButtonVariant, ButtonSize } from "./Button";

export { Card, CardHeader, IconBubble, SectionLabel } from "./Card";
export { Badge, StatusBadge, DonationBadge, MetaChip } from "./Badge";
export { Alert } from "./Alert";

export { Field, Input, Textarea, Select, Checkbox, RadioCard } from "./Field";

export { ProgressBar, GoalProgress } from "./Progress";
export { Avatar, AvatarStack } from "./Avatar";
export type { AvatarSize } from "./Avatar";

export {
  Skeleton,
  SkeletonText,
  SkeletonAuctionCard,
  SkeletonGrid,
  SkeletonRows,
  SkeletonDetail,
  SkeletonStats,
  Reveal,
} from "./Skeleton";

export { EmptyState, ErrorState } from "./EmptyState";
export { Stat, StatInline } from "./Stat";
export { Modal } from "./Modal";
export { SegmentedControl, NavTabs } from "./Tabs";
export type { SegmentOption, NavTabItem } from "./Tabs";

export { Countdown, CountdownInline } from "./Countdown";
export type { CountdownProps } from "./Countdown";

export { FeeBreakdown } from "./FeeBreakdown";
export type { FeePerspective } from "./FeeBreakdown";

export { ShippingLabel, ShippingLabelPreview } from "./ShippingLabel";
export { Confetti } from "./Confetti";
export { ToastProvider, useToast } from "./Toast";
export type { ToastOptions } from "./Toast";
export { Mascot } from "./Mascot";
export type { MascotMood } from "./Mascot";
export { Logo, LogoMark } from "./Logo";
