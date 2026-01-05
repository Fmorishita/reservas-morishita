import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

const SYSTEM_PROMPT = `Eres un asistente especializado en extraer y VALIDAR información de reservaciones de restaurante desde imágenes.

Tu tarea es:
1. Extraer la información de la reservación
2. VALIDAR que la información sea consistente y correcta
3. Reportar TODOS los errores encontrados

Información a extraer:
- fecha: La fecha EXACTA mencionada en formato YYYY-MM-DD (calcula el año actual/próximo basándote en la fecha de hoy)
- dia_mencionado: El día de la semana que el cliente DICE (ej: "sábado", "domingo", "viernes")
- dia_real: El día de la semana que REALMENTE corresponde a la fecha calculada
- horario_solicitado: El horario EXACTO que menciona el cliente (ej: "3pm", "2:00", "a las 5", etc.)
- horario: El horario de sesión más cercano: "COMIDA" (1pm/13:00), "TARDE" (3:30pm/15:30), "CENA" (6pm/18:00)
- numero_personas: Número de comensales (máximo 4)
- nombre_cliente: Nombre del cliente
- whatsapp: Número de WhatsApp si aparece
- motivo_visita: Motivo de la visita (cumpleaños, aniversario, negocios, amigos, pareja, etc.)
- tipo_menu: Siempre "Omakase 12 tiempos" (es el único menú disponible)
- alergias: Alergias o restricciones alimentarias mencionadas
- advertencias: Lista de problemas CRÍTICOS que impiden agendar:
  - Si dia_mencionado NO coincide con dia_real (ej: dicen "sábado 15" pero el 15 es viernes)
  - Si horario_solicitado es diferente a los horarios de sesión disponibles (indicar qué pidió y a cuál se ajustaría)
  - Si la fecha cae en día entre semana (solo sábados y domingos)
  - Si hay más de 4 personas (indicar cuántas pidieron)
  - Si la fecha es en el pasado

Formato de advertencias (ser MUY específico):
- "El cliente dice 'sábado 15 de febrero' pero el 15 de febrero de 2025 es VIERNES. ¿Quizás quiso decir sábado 14 o domingo 16?"
- "El cliente pide las 3pm pero nuestras sesiones son a la 1pm (COMIDA), 3:30pm (TARDE) o 6pm (CENA). Sesión más cercana: TARDE (3:30pm)"
- "El cliente solicita reservar para 6 personas pero el máximo es 4"
- "La fecha solicitada (lunes 10) no es fin de semana. Solo abrimos sábados y domingos"

La fecha de HOY es: ${new Date().toISOString().split('T')[0]}

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

serve(async (req) => {
  console.log("Extract reservation function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Verify authentication
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.log("Missing or invalid authorization header");
    return new Response(
      JSON.stringify({ error: "Autenticación requerida" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
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
