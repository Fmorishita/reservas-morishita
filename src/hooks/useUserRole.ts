import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "admin" | "staff";

export function useUserRole(userId: string | undefined) {
  const [role, setRole] = useState<AppRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRole = useCallback(async () => {
    if (!userId) {
      setRole(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // 1) Fast-path: try reading role row (works when user can SELECT their row)
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();

    if (!error && data?.role) {
      setRole(data.role as AppRole);
      setIsLoading(false);
      return;
    }

    // 2) Fallback: use SECURITY DEFINER RPC (more reliable with RLS)
    const [{ data: isAdmin }, { data: isStaff }] = await Promise.all([
      supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
      supabase.rpc("has_role", { _user_id: userId, _role: "staff" }),
    ]);

    if (isAdmin) setRole("admin");
    else if (isStaff) setRole("staff");
    else setRole(null);

    setIsLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchRole();
  }, [fetchRole]);

  const isAdmin = role === "admin";
  const isStaff = role === "staff";

  return {
    role,
    isAdmin,
    isStaff,
    isLoading,
    refetch: fetchRole,
  };
}
