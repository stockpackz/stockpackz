import { BlurFade } from "@/components/ui/blur-fade";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  label?: string;
  title: string;
  description?: string;
  className?: string;
  align?: "left" | "center";
}

export function SectionHeader({
  label,
  title,
  description,
  className,
  align = "left",
}: SectionHeaderProps) {
  return (
    <BlurFade inView className={cn(align === "center" && "text-center", className)}>
      {label && (
        <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.3em] text-white/30">
          {label}
        </p>
      )}
      <h2 className="text-[clamp(2rem,5vw,3.5rem)] font-bold leading-[1.05] tracking-[-0.03em] text-white">
        {title}
      </h2>
      {description && (
        <p className="mt-5 max-w-xl text-base leading-relaxed text-white/40 sm:text-lg">
          {description}
        </p>
      )}
    </BlurFade>
  );
}
