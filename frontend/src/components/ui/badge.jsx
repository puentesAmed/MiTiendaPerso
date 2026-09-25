import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex w-fit items-center rounded-md px-2 py-0.5 text-[11px] font-semibold", {
  variants: {
    variant: {
      default: "bg-primary text-primary-foreground",
      secondary: "bg-secondary text-secondary-foreground",
      outline: "border border-border text-foreground",
      success: "bg-success/12 text-success",
      warning: "bg-warning/15 text-warning",
      destructive: "bg-destructive/12 text-destructive",
    },
  },
  defaultVariants: { variant: "secondary" },
});

export function Badge({ className, variant, ...props }) { return <span className={cn(badgeVariants({ variant }), className)} {...props} />; }
