import Image from "next/image";
import { cn } from "@/lib/utils/cn";

export type MascotMood =
  | "happy"
  | "cheer"
  | "sad"
  | "thinking"
  | "love"
  | "idea"
  | "hello";

/**
 * cheer and sad have no artwork of their own and borrow the nearest pose that
 * exists — wrong in tone, but not the broken-image icon they used to render on
 * every empty state, both route guards and the whole email-confirmation flow.
 * Point them at their own files as soon as those are drawn.
 */
const MOOD_IMAGE_MAP: Record<MascotMood, string> = {
  happy: "/images/illustrations/mascot-happy.svg",
  cheer: "/images/illustrations/mascot-happy.svg",
  sad: "/images/illustrations/mascot-thinking.svg",
  love: "/images/illustrations/mascot-heart.svg",
  idea: "/images/illustrations/mascot-idea.svg",
  hello: "/images/illustrations/mascot-hello.svg",
  thinking: "/images/illustrations/mascot-thinking.svg",
};

export function Mascot({
  mood = "happy",
  size = 120,
  floating = false,
  className,
  title = "Mascot illustration",
}: {
  mood?: MascotMood;
  size?: number;
  floating?: boolean;
  className?: string;
  title?: string;
}) {
  const imageSrc = MOOD_IMAGE_MAP[mood];

  return (
    <div
      className={cn(
        "relative inline-block",
        floating && "animate-float",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <Image src={imageSrc} alt={title} width={size} height={size} priority />
    </div>
  );
}
