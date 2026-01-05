import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation constants
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB max
const VALID_IMAGE_PREFIXES = [
  "data:image/jpeg",
  "data:image/png",
  "data:image/gif",
  "data:image/webp",
  "data:image/jpg",
];

const SYSTEM_PROMPT = `Eres un asistente especializado en extraer información de reservaciones de restaurante desde imágenes.

Tu tarea es analizar la imagen proporcionada y extraer la siguiente información de una reservación:
- fecha: La fecha de la reservación (formato YYYY-MM-DD si es posible identificar el año, o el texto original si no)
- horario: El horario de la reservación. Solo son válidos: "13:00", "15:30", "18:00" (1pm, 3:30pm, 6pm)
- numero_personas: Número de comensales (máximo 4)
- nombre_cliente: Nombre del cliente
- whatsapp: Número de WhatsApp si aparece
- motivo_visita: Motivo de la visita (cumpleaños, aniversario, negocios, amigos, pareja, etc.)
- tipo_menu: "Omakase 12 tiempos" si mencionan 12 tiempos/course/degustación, o "Omakase Libre" si mencionan libre/free-style. Default: "Omakase 12 tiempos"
- alergias_restricciones: Alergias o restricciones alimentarias mencionadas
- errores: Lista de problemas encontrados (horario inválido, más de 4 personas, fecha pasada, información faltante)

Reglas importantes:
1. Si el horario NO es 1pm/13:00, 3:30pm/15:30, o 6pm/18:00, indica el error y sugiere el horario más cercano
2. Si hay más de 4 personas, indica el error
3. Si falta fecha u horario, indica que es información crítica faltante
4. Reconoce fechas en múltiples formatos: "Domingo 8 de diciembre", "08/12/2025", "Dec 8", "8 dic"
5. Reconoce horarios en múltiples formatos: "1pm", "1:00 pm", "13:00", "3:30pm"
6. El restaurante solo abre sábados y domingos

Responde SOLO con un objeto JSON válido, sin markdown ni explicaciones adicionales.`;

// Validate base64 image data
function validateImageData(imageBase64: string): { valid: boolean; error?: string } {
  // Check if it has a valid data URL prefix
  const hasValidPrefix = VALID_IMAGE_PREFIXES.some(prefix => 
    imageBase64.toLowerCase().startsWith(prefix)
  );
  
  if (!hasValidPrefix && !imageBase64.match(/^[A-Za-z0-9+/=]+$/)) {
    return { valid: false, error: "Formato de imagen no válido" };
  }
  
  // Calculate approximate size (base64 is ~33% larger than binary)
  const base64Data = imageBase64.includes(',') 
    ? imageBase64.split(',')[1] 
    : imageBase64;
  
  const estimatedSize = (base64Data.length * 3) / 4;
  
  if (estimatedSize > MAX_IMAGE_SIZE_BYTES) {
    return { valid: false, error: "La imagen es demasiado grande (máximo 5MB)" };
  }
  
  if (base64Data.length < 100) {
    return { valid: false, error: "La imagen parece estar vacía o corrupta" };
  }
  
  return { valid: true };
}

// Verify user authentication
async function verifyAuth(req: Request): Promise<{ authenticated: boolean; userId?: string; error?: string }> {
  const authHeader = req.headers.get("Authorization");
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { authenticated: false, error: "Se requiere autenticación" };
  }
  
  const token = authHeader.replace("Bearer ", "");
  
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Missing Supabase configuration");
    return { authenticated: false, error: "Error de configuración del servidor" };
  }
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    console.error("Auth verification failed:", error?.message);
    return { authenticated: false, error: "Sesión inválida o expirada" };
  }
  
  return { authenticated: true, userId: user.id };
}

serve(async (req) => {
  console.log("Extract reservation function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authResult = await verifyAuth(req);
    if (!authResult.authenticated) {
      return new Response(
        JSON.stringify({ error: authResult.error }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log("User authenticated:", authResult.userId);

    // Parse and validate request body
    let requestBody;
    try {
      requestBody = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Solicitud inválida" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const { imageBase64 } = requestBody;
    
    if (!imageBase64 || typeof imageBase64 !== "string") {
      return new Response(
        JSON.stringify({ error: "No se proporcionó una imagen válida" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate image data
    const validation = validateImageData(imageBase64);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Error de configuración del servidor" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Calling Lovable AI Gateway with image...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analiza esta imagen y extrae la información de la reservación. Responde SOLO con JSON válido.",
              },
              {
                type: "image_url",
                image_url: {
                  url: imageBase64.startsWith("data:") ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`,
                },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Servicio temporalmente no disponible. Intenta de nuevo en unos momentos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Servicio no disponible temporalmente." }),
          { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Error al procesar la imagen" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    console.log("AI response received");
    
    const aiContent = data.choices?.[0]?.message?.content;
    if (!aiContent) {
      console.error("No content in AI response");
      return new Response(
        JSON.stringify({ error: "No se pudo extraer información de la imagen" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse the JSON from AI response
    let extractedData;
    try {
      // Remove markdown code blocks if present
      const cleanContent = aiContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      extractedData = JSON.parse(cleanContent);
      console.log("Extracted data successfully");
    } catch (parseError) {
      console.error("Failed to parse AI response");
      return new Response(
        JSON.stringify({ error: "No se pudo interpretar la información de la imagen" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, data: extractedData }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in extract-reservation function:", error);
    return new Response(
      JSON.stringify({ error: "Error al procesar la solicitud" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
