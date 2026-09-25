import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export const Select = forwardRef(function Select({ className, ...props }, ref) {
  return <select ref={ref} className={cn("h-10 w-full rounded-lg border border-input bg-background px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50", className)} {...props} />;
});
