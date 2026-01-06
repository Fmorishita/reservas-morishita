import { ReactNode, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "@/hooks/use-toast";

interface StaffRouteProps {
  children: ReactNode;
}

export function StaffRoute({ children }: StaffRouteProps) {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { isAdmin, isStaff, isLoading: roleLoading, hasFetched } = useUserRole(user?.id);

  const hasAccess = isAdmin || isStaff;

  useEffect(() => {
    const authReady = !authLoading && !!user?.id;
    const roleReady = !roleLoading && hasFetched;

    if (authReady && roleReady && !hasAccess) {
      navigate("/", { replace: true });
      toast({
        variant: "destructive",
        title: "Acceso denegado",
        description: "No tienes permisos para acceder a esta página",
      });
    }
  }, [authLoading, roleLoading, hasAccess, hasFetched, navigate, user?.id]);

  if (authLoading || !user?.id || roleLoading || !hasFetched) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!hasAccess) return null;

  return <>{children}</>;
}
