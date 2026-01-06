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
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";

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
      <header className="sticky top-0 z-50 border-b border-border/50 glass-strong">
        <div className="container flex items-center justify-between h-16 md:h-18">
          <div className="w-10" /> {/* Spacer for centering */}
          <div className="relative group">
            <div className="absolute -inset-2 bg-gold/10 rounded-full blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <img 
              src={morishitaLogo} 
              alt="Morishita" 
              className="h-9 md:h-11 relative transition-transform duration-300 group-hover:scale-105" 
            />
          </div>
          
          {/* Theme toggle and User menu */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full hover:bg-secondary/80 transition-colors duration-300">
                <Avatar className="h-9 w-9 ring-2 ring-border/50 hover:ring-gold/50 transition-all duration-300">
                  <AvatarFallback className="text-xs bg-secondary text-secondary-foreground font-medium">
                    {profile?.full_name ? getInitials(profile.full_name) : "?"}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 shadow-medium border-border/50 animate-scale-in">
              <div className="px-3 py-2.5 text-sm font-medium truncate border-b border-border/50">
                {profile?.full_name || "Usuario"}
              </div>
              {isAdmin && (
                <DropdownMenuItem 
                  onClick={() => navigate("/admin/usuarios")}
                  className="cursor-pointer py-2.5 focus:bg-secondary"
                >
                  <Shield className="w-4 h-4 mr-2 text-gold" />
                  Administrar Usuarios
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator className="bg-border/50" />
              <DropdownMenuItem 
                onClick={handleSignOut} 
                className="text-destructive cursor-pointer py-2.5 focus:bg-destructive/10 focus:text-destructive"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Cerrar Sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 container py-6 pb-24 md:pb-8">
        <Outlet />
      </main>

      {/* Bottom navigation (mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 glass-strong md:hidden safe-area-bottom">
        <div className="flex items-center justify-around h-18 px-2">
          {visibleNavItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-1 px-3 py-2.5 rounded-xl transition-all duration-300 min-w-[60px]",
                  isActive
                    ? "text-gold bg-gold/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={cn("w-5 h-5 transition-transform duration-300", isActive && "scale-110")} />
                  <span className="text-xs font-medium">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Desktop navigation */}
      <nav className="hidden md:block fixed top-16 left-0 right-0 z-40 border-b border-border/50 glass">
        <div className="container flex items-center justify-center gap-2 h-14">
          {visibleNavItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg transition-all duration-300",
                  isActive
                    ? "text-gold bg-gold/10 shadow-soft"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                )
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Spacer for desktop nav */}
      <div className="hidden md:block h-14" />
    </div>
  );
}
