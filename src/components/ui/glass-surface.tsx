import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

type GlassSurfaceProps = ComponentPropsWithoutRef<"div"> & {
  strength?: "soft" | "regular" | "strong";
};

/** Frosted material primitive. Falls back to a solid surface without backdrop-filter. */
export function GlassSurface({
  className,
  strength = "regular",
  ...props
}: GlassSurfaceProps) {
  return (
    <div
      data-strength={strength}
      className={cn("glass-surface", className)}
      {...props}
    />
  );
}
