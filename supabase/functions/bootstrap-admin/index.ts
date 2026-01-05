// Bootstrap admin role when no admin exists.
// This function requires authentication (JWT). It will only grant admin
// to the *first authenticated user* when the database has zero admins.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // userClient is used ONLY to validate the caller and identify the user.
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    // adminClient bypasses RLS and can safely write roles.
    const adminClient = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      console.error("bootstrap-admin: invalid user", userError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
      return new Response(
        JSON.stringify({ ok: true, status: "admin_exists" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // No admins exist: grant admin to the current authenticated user
    const { error: insertError } = await adminClient
      .from("user_roles")
      .insert({ user_id: user.id, role: "admin" });

    if (insertError) {
      console.error("bootstrap-admin: insert failed", insertError);
      return new Response(JSON.stringify({ error: "Could not assign admin" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("bootstrap-admin: granted admin", { userId: user.id, email: user.email });

    return new Response(
      JSON.stringify({ ok: true, status: "bootstrapped", userId: user.id, email: user.email }),
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
