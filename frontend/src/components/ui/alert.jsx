import { cn } from "@/lib/utils";

export function Alert({ className, variant = "default", ...props }) { return <div role="alert" className={cn("relative rounded-lg border p-3 text-sm", variant === "destructive" && "border-destructive/30 text-destructive", className)} {...props} />; }
export function AlertTitle({ className, ...props }) { return <h5 className={cn("mb-1 font-semibold", className)} {...props} />; }
export function AlertDescription({ className, ...props }) { return <div className={cn("text-sm text-muted-foreground", className)} {...props} />; }
