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
  const { isAdmin, isLoading: roleLoading, hasFetched } = useUserRole(user?.id);

  useEffect(() => {
    // Only redirect when we're 100% sure:
    // 1. Auth finished loading
    // 2. We have a user
    // 3. Role finished loading AND we actually fetched the role
    // 4. User is NOT admin
    const authReady = !authLoading && !!user?.id;
    const roleReady = !roleLoading && hasFetched;

    if (authReady && roleReady && !isAdmin) {
      navigate("/", { replace: true });
      toast({
        variant: "destructive",
        title: "Acceso denegado",
        description: "Solo los administradores pueden acceder a esta página",
      });
    }
  }, [authLoading, roleLoading, isAdmin, hasFetched, navigate, user?.id]);

  // Show loading while auth or role is loading
  if (authLoading || !user?.id || roleLoading || !hasFetched) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return <>{children}</>;
}
