import { cn } from "@/lib/utils";
const widths = { narrow: "max-w-3xl", default: "max-w-7xl", wide: "max-w-[1440px]" };
export function PageContainer({ children, size = "default", className, ...props }) { return <div className={cn("mx-auto w-full px-4 py-6 sm:px-5 md:px-6 lg:px-8", widths[size], className)} {...props}>{children}</div>; }
