import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({ className, children, showCloseButton = true, ...props }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/55 backdrop-blur-[1px] transition-opacity" />
      <DialogPrimitive.Popup className={cn("fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-background p-5 shadow-2xl", className)} {...props}>
        {children}
        {showCloseButton && <DialogPrimitive.Close aria-label="Cerrar" className="absolute right-3 top-3 rounded-md p-1.5 text-muted-foreground hover:bg-muted"><X className="size-4" /></DialogPrimitive.Close>}
      </DialogPrimitive.Popup>
    </DialogPrimitive.Portal>
  );
}

export function DialogHeader({ className, ...props }) { return <div className={cn("mb-3 space-y-1", className)} {...props} />; }
export function DialogFooter({ className, ...props }) { return <div className={cn("mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)} {...props} />; }
export function DialogTitle({ className, ...props }) { return <DialogPrimitive.Title className={cn("text-lg font-semibold", className)} {...props} />; }
export function DialogDescription({ className, ...props }) { return <DialogPrimitive.Description className={cn("text-sm text-muted-foreground", className)} {...props} />; }
