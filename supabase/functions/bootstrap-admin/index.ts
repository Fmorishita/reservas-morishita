// Bootstrap admin role when no admin exists.
// This function requires authentication (JWT). It will only grant admin
// to the *first authenticated user* when the database has zero admins.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple JWT decode (no verification - we trust Supabase's verification)
function decodeJwt(token: string): { sub?: string; email?: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload;
  } catch {
    return null;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("bootstrap-admin: no auth header");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract JWT token from Authorization header
    const token = authHeader.replace("Bearer ", "");
    
    // Decode the JWT to get user info (Supabase already validated it)
    const payload = decodeJwt(token);
    
    if (!payload || !payload.sub) {
      console.error("bootstrap-admin: invalid token payload");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = payload.sub;
    const email = payload.email || "unknown";

    console.log("bootstrap-admin: validated user", { userId, email });

    // adminClient bypasses RLS and can safely write roles.
    const adminClient = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    // Check if an admin already exists
    const { data: existingAdmin, error: adminCheckError } = await adminClient
      .from("user_roles")
      .select("id")
      .eq("role", "admin")
      .limit(1);

    if (adminCheckError) {
      console.error("bootstrap-admin: admin check failed", adminCheckError);
      return new Response(JSON.stringify({ error: "Server error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (existingAdmin && existingAdmin.length > 0) {
      console.log("bootstrap-admin: admin already exists");
      return new Response(
        JSON.stringify({ ok: true, status: "admin_exists" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // No admins exist: grant admin to the current authenticated user
    const { error: insertError } = await adminClient
      .from("user_roles")
      .insert({ user_id: userId, role: "admin" });

    if (insertError) {
      console.error("bootstrap-admin: insert failed", insertError);
      return new Response(JSON.stringify({ error: "Could not assign admin" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("bootstrap-admin: granted admin", { userId, email });

    return new Response(
      JSON.stringify({ ok: true, status: "bootstrapped", userId, email }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("bootstrap-admin: unexpected", err);
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
