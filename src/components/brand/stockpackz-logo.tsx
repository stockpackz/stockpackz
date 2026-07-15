import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

const ASSETS = {
  full: "/graphics/stockpackz-logo-v4.png",
  icon: "/graphics/stockpackz-icon-v4.png",
  wordmark: "/graphics/stockpackz-wordmark-v4.png",
} as const;

type LogoVariant = keyof typeof ASSETS;

const sizeMap: Record<LogoVariant, { width: number; height: number; className?: string }> = {
  full: { width: 626, height: 327, className: "h-auto w-[min(100%,280px)]" },
  icon: { width: 64, height: 64, className: "h-8 w-8 sm:h-9 sm:w-9" },
  wordmark: { width: 626, height: 61, className: "h-5 w-auto" },
};

interface StockpackzLogoProps {
  variant?: LogoVariant;
  className?: string;
  href?: string;
  priority?: boolean;
}

export function StockpackzLogo({
  variant = "full",
  className,
  href,
  priority = false,
}: StockpackzLogoProps) {
  const s = sizeMap[variant];
  const img = (
    <Image
      src={ASSETS[variant]}
      alt="Stockpackz"
      width={s.width}
      height={s.height}
      priority={priority}
      className={cn("object-contain", s.className, className)}
    />
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex shrink-0 items-center">
        {img}
      </Link>
    );
  }

  return img;
}

export { ASSETS as STOCKPACKZ_LOGO_ASSETS };
