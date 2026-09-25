import { Moon, Sun } from "lucide-react";
import { useTheme } from "../theme-provider";
import { Button } from "../ui/button";

export function ThemeToggle({ showLabel = false, className = "" }) {
  const { theme, toggleTheme } = useTheme();
  const dark = theme === "dark";
  const label = dark ? "Activar modo claro" : "Activar modo oscuro";

  return (
    <Button
      type="button"
      variant="ghost"
      size={showLabel ? "default" : "icon"}
      className={`${showLabel ? "w-full justify-start" : "size-11"} ${className}`}
      onClick={toggleTheme}
      aria-label={label}
      title={label}
    >
      {dark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
      {showLabel && <span>{dark ? "Modo claro" : "Modo oscuro"}</span>}
    </Button>
  );
}
