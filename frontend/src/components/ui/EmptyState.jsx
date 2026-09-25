import { PackageOpen } from "lucide-react";
import { cn } from "@/lib/utils";
export function EmptyState({ title, description, action, className, ...props }) { return <div className={cn("flex min-h-40 flex-col items-center justify-center rounded-xl border border-dashed bg-muted/35 p-6 text-center", className)} {...props}><PackageOpen className="mb-3 size-7 text-muted-foreground" /><h2 className="font-semibold">{title}</h2>{description && <p className="mt-1 max-w-lg text-sm text-muted-foreground">{description}</p>}{action && <div className="mt-4">{action}</div>}</div>; }
