import { Menu } from "@base-ui/react/menu";
import { Check, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export const DropdownMenu = Menu.Root;
export const DropdownMenuTrigger = Menu.Trigger;
export function DropdownMenuContent({ className, sideOffset = 6, ...props }) {
  return <Menu.Portal><Menu.Positioner sideOffset={sideOffset} className="z-50"><Menu.Popup className={cn("min-w-44 rounded-lg border bg-background p-1 shadow-xl", className)} {...props} /></Menu.Positioner></Menu.Portal>;
}
export function DropdownMenuItem({ className, ...props }) { return <Menu.Item className={cn("flex cursor-default items-center gap-2 rounded-md px-2.5 py-2 text-sm outline-none data-[highlighted]:bg-accent", className)} {...props} />; }
export function DropdownMenuSeparator({ className, ...props }) { return <Menu.Separator className={cn("my-1 h-px bg-border", className)} {...props} />; }
export function DropdownMenuLabel({ className, ...props }) { return <div className={cn("px-2.5 py-1.5 text-xs font-semibold", className)} {...props} />; }
export function DropdownMenuCheckboxItem({ className, children, ...props }) { return <Menu.CheckboxItem className={cn("flex items-center gap-2 rounded-md px-2.5 py-2 text-sm data-[highlighted]:bg-accent", className)} {...props}><Menu.CheckboxItemIndicator><Check className="size-4" /></Menu.CheckboxItemIndicator>{children}</Menu.CheckboxItem>; }
export function DropdownMenuSubmenuTrigger({ children, ...props }) { return <Menu.SubmenuTrigger {...props}>{children}<ChevronRight className="ml-auto size-4" /></Menu.SubmenuTrigger>; }
