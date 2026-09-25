import { cn } from "@/lib/utils";

export function ShineBorder({ className, ...props }) {
  return <span aria-hidden="true" className={cn("pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-primary/15 transition-colors group-hover:ring-primary/35", className)} {...props} />;
}
