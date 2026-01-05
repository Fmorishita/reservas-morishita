import { ReactNode, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "@/hooks/use-toast";

interface AdminRouteProps {
  children: ReactNode;
}

export function AdminRoute({ children }: AdminRouteProps) {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { isAdmin, isLoading: roleLoading } = useUserRole(user?.id);

  useEffect(() => {
    if (!authLoading && user?.id && !roleLoading && !isAdmin) {
      navigate("/", { replace: true });
      toast({
        variant: "destructive",
        title: "Acceso denegado",
        description: "Solo los administradores pueden acceder a esta página",
      });
    }
  }, [authLoading, roleLoading, isAdmin, navigate, user?.id]);

  if (authLoading || !user?.id || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return <>{children}</>;
}
