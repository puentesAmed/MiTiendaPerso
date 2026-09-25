import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import { cn } from "@/lib/utils";

export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;
export function TooltipContent({ className, sideOffset = 5, ...props }) { return <TooltipPrimitive.Portal><TooltipPrimitive.Positioner sideOffset={sideOffset} className="z-50"><TooltipPrimitive.Popup className={cn("rounded-md bg-foreground px-2 py-1 text-xs text-background shadow-lg", className)} {...props} /></TooltipPrimitive.Positioner></TooltipPrimitive.Portal>; }
