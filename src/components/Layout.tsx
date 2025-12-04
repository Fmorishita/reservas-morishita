import { NavLink, Outlet } from "react-router-dom";
import { Calendar, Plus, Lock, List, Camera } from "lucide-react";
import morishitaLogo from "@/assets/morishita-logo.png";

const navItems = [
  { to: "/", icon: Calendar, label: "Agenda" },
  { to: "/nueva", icon: Plus, label: "Nueva" },
  { to: "/desde-imagen", icon: Camera, label: "Foto" },
  { to: "/bloqueos", icon: Lock, label: "Bloqueos" },
  { to: "/lista", icon: List, label: "Lista" },
];

export function Layout() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border glass">
        <div className="container flex items-center justify-center h-14 md:h-16">
          <img src={morishitaLogo} alt="Morishita" className="h-8 md:h-10" />
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 container py-4 pb-20 md:pb-6">
        <Outlet />
      </main>

      {/* Bottom navigation (mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border glass md:hidden">
        <div className="flex items-center justify-around h-16">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 px-4 py-2 transition-colors ${
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`
              }
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Desktop navigation */}
      <nav className="hidden md:block fixed top-14 left-0 right-0 z-40 border-b border-border glass">
        <div className="container flex items-center justify-center gap-8 h-12">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "text-foreground border-b-2 border-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Spacer for desktop nav */}
      <div className="hidden md:block h-12" />
    </div>
  );
}
