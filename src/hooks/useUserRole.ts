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
    
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .single();

    if (!error && data) {
      setRole(data.role as AppRole);
    } else {
      setRole(null);
    }
    
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
