import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";
export function LoadingState({ message = "Cargando…", inline = false, className, ...props }) { return <div role="status" aria-live="polite" className={cn("flex items-center justify-center gap-2 text-sm text-muted-foreground", inline ? "py-2" : "min-h-32 py-8", className)} {...props}><LoaderCircle className="size-5 animate-spin text-primary" /><span>{message}</span></div>; }
