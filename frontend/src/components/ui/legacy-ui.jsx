/* eslint-disable react-refresh/only-export-components */
import { createContext, createElement, forwardRef, useContext, useMemo, useState } from "react";
import { ChevronDown, CircleAlert, LoaderCircle, X } from "lucide-react";
import { useTheme } from "../theme-provider";
import { cn } from "@/lib/utils";
import { Badge as BaseBadge } from "./badge";
import { Button as BaseButton } from "./button";
import { Card as BaseCard } from "./card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "./dialog";
import { Input as BaseInput } from "./input";
import { Select as BaseSelect } from "./select";
import { Textarea as BaseTextarea } from "./textarea";

const space = (value) => typeof value === "number" ? `${value * 0.25}rem` : value;
const first = (value) => value && typeof value === "object" ? (value.base ?? value.sm ?? value.md ?? Object.values(value)[0]) : value;
const color = (value) => {
  const colors = { textMuted: "var(--muted-foreground)", textPrimary: "var(--foreground)", bgPage: "var(--background)", bgSurface: "var(--surface)", bgSubtle: "var(--muted)", borderSubtle: "var(--border)", actionPrimary: "var(--primary)", white: "white" };
  if (colors[value]) return colors[value];
  if (typeof value === "string" && /^(gray|blue|red|green|purple|orange)\./.test(value)) return undefined;
  return value;
};

function sx(props) {
  const style = { ...props.style };
  const value = (key) => first(props[key]);
  const mappings = {
    bg: "background", color: "color", w: "width", width: "width", h: "height", height: "height", minW: "minWidth", maxW: "maxWidth", minH: "minHeight", maxH: "maxHeight",
    p: "padding", px: ["paddingLeft", "paddingRight"], py: ["paddingTop", "paddingBottom"], pt: "paddingTop", pb: "paddingBottom", pl: "paddingLeft", pr: "paddingRight",
    m: "margin", mx: ["marginLeft", "marginRight"], my: ["marginTop", "marginBottom"], mt: "marginTop", mb: "marginBottom", ml: "marginLeft", mr: "marginRight",
    gap: "gap", spacing: "gap", direction: "flexDirection", align: "alignItems", alignItems: "alignItems", justify: "justifyContent", justifyContent: "justifyContent", wrap: "flexWrap", flexWrap: "flexWrap", flex: "flex", flexShrink: "flexShrink",
    position: "position", top: "top", right: "right", bottom: "bottom", left: "left", zIndex: "zIndex", overflow: "overflow", overflowX: "overflowX", overflowY: "overflowY",
    objectFit: "objectFit", objectPosition: "objectPosition", pointerEvents: "pointerEvents", cursor: "cursor", opacity: "opacity", textAlign: "textAlign", fontWeight: "fontWeight", lineHeight: "lineHeight", whiteSpace: "whiteSpace", wordBreak: "wordBreak", transform: "transform", transition: "transition",
  };
  for (const [source, target] of Object.entries(mappings)) {
    if (props[source] == null) continue;
    const raw = value(source);
    const resolved = ["p","px","py","pt","pb","pl","pr","m","mx","my","mt","mb","ml","mr","gap","spacing","top","right","bottom","left"].includes(source) ? space(raw) : raw;
    (Array.isArray(target) ? target : [target]).forEach((name) => { style[name] = ["background", "color"].includes(name) ? color(resolved) : resolved; });
  }
  if (props.display) style.display = first(props.display);
  if (props.borderWidth || props.border) style.borderWidth = props.borderWidth || 1;
  if (props.borderColor) style.borderColor = color(first(props.borderColor));
  if (props.borderRadius) style.borderRadius = props.borderRadius === "full" ? "9999px" : props.borderRadius === "xl" ? "0.75rem" : props.borderRadius === "lg" ? "0.625rem" : "0.5rem";
  if (props.boxShadow) style.boxShadow = props.boxShadow === "none" ? "none" : "var(--shadow-card)";
  if (props.fontSize) style.fontSize = ({ xs: ".75rem", sm: ".875rem", md: "1rem", lg: "1.125rem", xl: "1.25rem", "2xl": "1.5rem" })[first(props.fontSize)] || first(props.fontSize);
  if (props.noOfLines) { style.display = "-webkit-box"; style.WebkitLineClamp = props.noOfLines; style.WebkitBoxOrient = "vertical"; style.overflow = "hidden"; }
  if (props.columns) style.gridTemplateColumns = `repeat(${first(props.columns)}, minmax(0, 1fr))`;
  if (props.templateColumns) style.gridTemplateColumns = first(props.templateColumns);
  return style;
}

const omit = new Set(["bg","bgGradient","bgClip","w","h","width","height","minW","maxW","minH","maxH","p","px","py","pt","pb","pl","pr","m","mx","my","mt","mb","ml","mr","gap","spacing","direction","align","alignItems","justify","justifyContent","wrap","flexWrap","flex","flexShrink","position","top","right","bottom","left","zIndex","overflow","overflowX","overflowY","objectFit","objectPosition","pointerEvents","cursor","opacity","textAlign","fontWeight","lineHeight","whiteSpace","wordBreak","transform","transition","display","border","borderWidth","borderColor","borderRadius","boxShadow","fontSize","noOfLines","columns","templateColumns","colorScheme","size","variant","_hover","_focus","_focusVisible","_active","isCentered","isInvalid","isRequired","isReadOnly","isDisabled","isChecked","isLoading"]);
function clean(props) { return Object.fromEntries(Object.entries(props).filter(([key]) => !omit.has(key))); }

function primitive(defaultTag, baseClass = "") {
  return forwardRef(function Primitive({ as: Component = defaultTag, className, children, ...props }, ref) { return createElement(Component, { ref, className: cn(baseClass, className), style: sx(props), ...clean(props) }, children); });
}

export const Box = primitive("div");
export const Flex = primitive("div", "flex");
export const Stack = primitive("div", "flex flex-col");
export const VStack = Stack;
export const HStack = primitive("div", "flex items-center");
export const Center = primitive("div", "flex items-center justify-center");
export const SimpleGrid = primitive("div", "grid");
export const Container = primitive("div", "mx-auto w-full max-w-7xl px-4");
export const Text = primitive("p");
export const Heading = forwardRef(function Heading({ as: Component = "h2", size, className, ...props }, ref) { return createElement(Component, { ref, className: cn("font-semibold tracking-tight", size === "lg" ? "text-2xl" : size === "md" ? "text-xl" : size === "sm" ? "text-base" : "text-lg", className), style: sx(props), ...clean(props) }); });
export const Divider = primitive("hr", "border-border");
export const Spacer = primitive("div", "flex-1");
export const Circle = primitive("span", "inline-flex aspect-square items-center justify-center rounded-full");
export const Link = primitive("a", "transition-colors hover:text-primary hover:underline");
export const Image = forwardRef(function Image({ fallbackSrc, onError, ...props }, ref) { return <img ref={ref} {...clean(props)} style={sx(props)} onError={(event) => { if (fallbackSrc) event.currentTarget.src = fallbackSrc; onError?.(event); }} />; });
export const AspectRatio = forwardRef(function AspectRatio({ ratio = 4 / 3, children, ...props }, ref) { return <div ref={ref} {...clean(props)} style={{ ...sx(props), aspectRatio: ratio }}>{children}</div>; });
export const Avatar = ({ name = "", ...props }) => <span className="inline-grid size-8 place-items-center rounded-full bg-muted text-xs font-semibold" {...clean(props)}>{name.slice(0, 2).toUpperCase()}</span>;
export const Spinner = ({ className, ...props }) => <LoaderCircle className={cn("size-5 animate-spin text-primary", className)} {...clean(props)} />;

export const Button = forwardRef(function Button({ as, leftIcon, rightIcon, icon, isDisabled, isLoading, children, ...props }, ref) { return <BaseButton ref={ref} as={as} disabled={isDisabled || isLoading} variant={props.variant} size={props.size} className={props.className} style={sx(props)} {...clean(props)}>{leftIcon || icon}{isLoading ? <LoaderCircle className="animate-spin" /> : children}{rightIcon}</BaseButton>; });
export const IconButton = forwardRef(function IconButton({ icon, children, ...props }, ref) { return <Button ref={ref} size="icon" {...props}>{icon || children}</Button>; });
export const Input = forwardRef(function Input(props, ref) { return <BaseInput ref={ref} {...clean(props)} style={sx(props)} />; });
export const Textarea = forwardRef(function Textarea(props, ref) { return <BaseTextarea ref={ref} {...clean(props)} style={sx(props)} />; });
export const Select = forwardRef(function Select({ placeholder, children, ...props }, ref) { return <BaseSelect ref={ref} {...clean(props)} style={sx(props)}>{placeholder && <option value="">{placeholder}</option>}{children}</BaseSelect>; });
export const Checkbox = forwardRef(function Checkbox({ children, isChecked, isDisabled, ...props }, ref) { return <label className="flex items-center gap-2 text-sm"><input ref={ref} type="checkbox" checked={isChecked} disabled={isDisabled} {...clean(props)} />{children}</label>; });
export const Switch = forwardRef(function Switch({ isChecked, isDisabled, ...props }, ref) { return <input ref={ref} type="checkbox" role="switch" checked={isChecked} disabled={isDisabled} className="h-5 w-9 accent-primary" {...clean(props)} />; });
export const FormControl = primitive("div", "grid gap-1");
export const FormLabel = primitive("label", "text-sm font-medium");
export const FormErrorMessage = primitive("p", "text-xs text-destructive");
export const InputGroup = primitive("div", "relative");
export const InputRightElement = primitive("div", "absolute inset-y-0 right-0 flex items-center");

export const Card = forwardRef(function Card(props, ref) { return <BaseCard ref={ref} {...clean(props)} style={sx(props)} />; });
export const CardBody = primitive("div", "p-4");
export const Badge = ({ colorScheme, variant, ...props }) => <BaseBadge variant={variant === "error" || colorScheme === "red" ? "destructive" : variant === "success" || colorScheme === "green" ? "success" : variant === "outline" ? "outline" : "secondary"} {...clean(props)} />;
export const Alert = primitive("div", "rounded-lg border p-3 text-sm");
export const AlertTitle = primitive("h5", "font-semibold");
export const AlertDescription = primitive("div", "text-sm text-muted-foreground");
export const AlertIcon = (props) => <CircleAlert className="size-5" {...clean(props)} />;

export const Table = primitive("table", "w-full text-sm"); export const Thead = primitive("thead"); export const Tbody = primitive("tbody"); export const Tr = primitive("tr", "border-b"); export const Th = primitive("th", "p-2 text-left font-medium"); export const Td = primitive("td", "p-2");

export function useDisclosure(initial = false) { const [isOpen, setOpen] = useState(initial); return { isOpen, onOpen: () => setOpen(true), onClose: () => setOpen(false), onToggle: () => setOpen((v) => !v) }; }
export function useThemeValue(light, dark) { return useTheme().theme === "dark" ? dark : light; }
export function useToast() { return useMemo(() => ({ title, description, status = "default" }) => { const toast = document.createElement("div"); toast.className = `fixed right-4 top-4 z-[100] max-w-sm rounded-lg border bg-background p-3 text-sm shadow-xl ${status === "error" ? "text-destructive" : ""}`; toast.textContent = [title, description].filter(Boolean).join(": "); document.body.appendChild(toast); setTimeout(() => toast.remove(), 3500); }, []); }

export function Modal({ isOpen, onClose, children }) { return <Dialog open={isOpen} onOpenChange={(open) => !open && onClose?.()}>{children}</Dialog>; }
export const ModalOverlay = () => null;
export function ModalContent({ children, ...props }) { return <DialogContent {...clean(props)}>{children}</DialogContent>; }
export function ModalHeader({ children, ...props }) { return <DialogHeader {...clean(props)}><DialogTitle>{children}</DialogTitle></DialogHeader>; }
export const ModalBody = primitive("div", "text-sm text-muted-foreground");
export function ModalFooter(props) { return <DialogFooter {...clean(props)} />; }
export function ModalCloseButton({ onClick }) { return <button type="button" aria-label="Cerrar" onClick={onClick} className="absolute right-3 top-3 p-2"><X className="size-4" /></button>; }

const MenuContext = createContext(null);
export function Menu({ children }) { const [open, setOpen] = useState(false); return <MenuContext.Provider value={{ open, setOpen }}><div className="relative">{children}</div></MenuContext.Provider>; }
export function MenuButton({ as: Component = Button, children, ...props }) { const { open, setOpen } = useContext(MenuContext); return createElement(Component, { ...props, onClick: () => setOpen(!open) }, children); }
export function MenuList({ children, ...props }) { const { open } = useContext(MenuContext); return open ? <div className="absolute right-0 z-50 mt-1 min-w-44 rounded-lg border bg-background p-1 shadow-xl" {...clean(props)}>{children}</div> : null; }
export const MenuItem = forwardRef(function MenuItem({ as: Component = "button", children, ...props }, ref) { return createElement(Component, { ref, className: "flex w-full items-center rounded-md px-2.5 py-2 text-left text-sm hover:bg-accent", ...clean(props) }, children); });
export const MenuDivider = primitive("hr", "my-1");

export const NumberInput = primitive("div", "relative");
export const NumberInputField = forwardRef(function NumberInputField(props, ref) { return <BaseInput ref={ref} type="number" {...clean(props)} />; });
export const NumberInputStepper = primitive("div", "absolute right-1 top-1 grid");
export const NumberIncrementStepper = primitive("button", "text-xs");
export const NumberDecrementStepper = primitive("button", "text-xs");

export const Accordion = primitive("div", "divide-y rounded-lg border");
export const AccordionItem = primitive("details", "p-3");
export const AccordionButton = primitive("summary", "flex cursor-pointer items-center justify-between font-medium");
export const AccordionPanel = primitive("div", "pt-3 text-sm text-muted-foreground");
export const AccordionIcon = () => <ChevronDown className="size-4" />;

const TabsContext = createContext(null);
export function Tabs({ children, defaultIndex = 0, index, onChange }) { const [local, setLocal] = useState(defaultIndex); const active = index ?? local; const setActive = (next) => { setLocal(next); onChange?.(next); }; return <TabsContext.Provider value={{ active, setActive }}>{children}</TabsContext.Provider>; }
export const TabList = primitive("div", "flex gap-1 border-b");
export function Tab({ children, ...props }) { const context = useContext(TabsContext); const index = Number(props["data-index"] ?? 0); return <button type="button" onClick={() => context?.setActive(index)} className="px-3 py-2 text-sm font-medium">{children}</button>; }
export const TabPanels = primitive("div");
export const TabPanel = primitive("div", "py-3");
