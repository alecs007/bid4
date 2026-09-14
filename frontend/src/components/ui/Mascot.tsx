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

const MOOD_IMAGE_MAP: Record<MascotMood, string> = {
  happy: "/images/illustrations/mascot-happy.webp",
  cheer: "/images/illustrations/mascot-happy.webp",
  sad: "/images/illustrations/mascot-thinking.webp",
  love: "/images/illustrations/mascot-heart.webp",
  idea: "/images/illustrations/mascot-idea.webp",
  hello: "/images/illustrations/mascot-hello.webp",
  thinking: "/images/illustrations/mascot-thinking.webp",
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
      <Image
        src={imageSrc}
        alt={title}
        width={size}
        height={size}
        loading="eager"
        fetchPriority="high"
        draggable={false}
      />
    </div>
  );
}
