import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;

export function SheetContent({ className, children, side = "right", ...props }) {
  const sideClasses = side === "left" ? "inset-y-0 left-0 border-r" : "inset-y-0 right-0 border-l";
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/50" />
      <DialogPrimitive.Popup className={cn("fixed z-50 w-[min(88vw,22rem)] bg-background p-5 shadow-2xl", sideClasses, className)} {...props}>
        {children}
        <DialogPrimitive.Close aria-label="Cerrar" className="absolute right-3 top-3 rounded-md p-2 hover:bg-muted"><X className="size-4" /></DialogPrimitive.Close>
      </DialogPrimitive.Popup>
    </DialogPrimitive.Portal>
  );
}
export const SheetTitle = DialogPrimitive.Title;
export const SheetDescription = DialogPrimitive.Description;
export function SheetHeader({ className, ...props }) { return <div className={cn("mb-5 space-y-1", className)} {...props} />; }
export function SheetFooter({ className, ...props }) { return <div className={cn("mt-5", className)} {...props} />; }
