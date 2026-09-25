import { Outlet } from "react-router-dom";
import { CookieNotice } from "./components/common/CookieNotice";
import { SiteFooter } from "./components/shell/SiteFooter";
import { SiteHeader } from "./components/shell/SiteHeader";

export function App() {
  return (
    <div className="flex min-h-screen min-w-0 flex-col overflow-x-clip bg-background text-foreground">
      <SiteHeader />
      <main className="min-w-0 flex-1">
        <Outlet />
      </main>
      <SiteFooter />
      <CookieNotice />
    </div>
  );
}
