import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Calendar, Plus, Lock, List, Camera, LogOut, Shield } from "lucide-react";
import morishitaLogo from "@/assets/morishita-logo.png";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";

const navItems: Array<{
  to: string;
  icon: typeof Calendar;
  label: string;
  requiresAdmin?: boolean;
}> = [
  { to: "/", icon: Calendar, label: "Agenda" },
  { to: "/nueva", icon: Plus, label: "Nueva" },
  { to: "/desde-imagen", icon: Camera, label: "Foto" },
  { to: "/bloqueos", icon: Lock, label: "Bloqueos" },
  { to: "/lista", icon: List, label: "Lista" },
];

export function Layout() {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const { isAdmin } = useUserRole(user?.id);

  const visibleNavItems = navItems.filter((item) => !item.requiresAdmin || isAdmin);

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast({
        title: "Error",
        description: "No se pudo cerrar sesión",
        variant: "destructive",
      });
    } else {
      navigate("/auth");
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border glass">
        <div className="container flex items-center justify-between h-14 md:h-16">
          <div className="w-10" /> {/* Spacer for centering */}
          <img src={morishitaLogo} alt="Morishita" className="h-8 md:h-10" />
          
          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs bg-secondary">
                    {profile?.full_name ? getInitials(profile.full_name) : "?"}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-2 py-1.5 text-sm font-medium truncate">
                {profile?.full_name || "Usuario"}
              </div>
              <DropdownMenuSeparator />
              {isAdmin && (
                <DropdownMenuItem onClick={() => navigate("/admin/usuarios")}>
                  <Shield className="w-4 h-4 mr-2" />
                  Administrar Usuarios
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                <LogOut className="w-4 h-4 mr-2" />
                Cerrar Sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 container py-4 pb-20 md:pb-6">
        <Outlet />
      </main>

      {/* Bottom navigation (mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border glass md:hidden">
        <div className="flex items-center justify-around h-16">
          {visibleNavItems.map(({ to, icon: Icon, label }) => (
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
          {visibleNavItems.map(({ to, icon: Icon, label }) => (
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
