import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "./alert";
import { Button } from "./button";
import { cn } from "@/lib/utils";
export function ErrorState({ title = "No se pudo cargar el contenido", description, onRetry, className, ...props }) { return <Alert variant="destructive" className={cn("flex items-start gap-3", className)} {...props}><AlertCircle className="mt-0.5 size-5 shrink-0" /><div className="min-w-0 flex-1"><AlertTitle>{title}</AlertTitle>{description && <AlertDescription>{description}</AlertDescription>}{onRetry && <Button variant="outline" size="sm" className="mt-3" onClick={onRetry}>Reintentar</Button>}</div></Alert>; }
