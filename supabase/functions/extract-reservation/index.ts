// ============================================================
// MORISHITA — extract-reservation
// Edge Function que recibe imagen base64 (screenshot de DM)
// y devuelve datos estructurados de reservación.
// Usa Google Gemini API directamente (no Lovable AI Gateway).
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Validación de imagen
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
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
- horario: El horario de sesión más cercano: "COMIDA" (1pm/13:00), "TARDE" (3:30pm/15:30), "CENA" (6pm/18:00), "NOCHE" (8:30pm/20:30)
- numero_personas: Número de comensales (máximo 4)
- nombre_cliente: Nombre del cliente
- whatsapp: Número de WhatsApp si aparece
- motivo_visita: Motivo de la visita (cumpleaños, aniversario, negocios, amigos, pareja, etc.)
- tipo_menu: Siempre "Omakase 14 tiempos" (es el único menú disponible)
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

Responde ÚNICAMENTE con un JSON válido (sin markdown, sin texto extra, sin backticks). Estructura:
{
  "fecha": "YYYY-MM-DD",
  "dia_mencionado": "...",
  "dia_real": "...",
  "horario_solicitado": "...",
  "horario": "COMIDA|TARDE|CENA|NOCHE",
  "numero_personas": 0,
  "nombre_cliente": "...",
  "whatsapp": "...",
  "motivo_visita": "...",
  "tipo_menu": "Omakase 14 tiempos",
  "alergias": "...",
  "advertencias": []
}`;

function validateImageData(imageBase64: string): { valid: boolean; error?: string } {
  const hasValidPrefix = VALID_IMAGE_PREFIXES.some((prefix) =>
    imageBase64.startsWith(prefix)
  );

  if (!hasValidPrefix && !imageBase64.match(/^[A-Za-z0-9+/=]+$/)) {
    return { valid: false, error: "Formato de imagen no válido" };
  }

  const base64Data = imageBase64.includes(",")
    ? imageBase64.split(",")[1]
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

/**
 * Detecta el mime type de una imagen base64.
 * Si viene con prefijo (data:image/png;base64,...) lo extrae;
 * si no, asume JPEG.
 */
function getMimeType(imageBase64: string): string {
  const match = imageBase64.match(/^data:(image\/[a-z]+);base64,/);
  if (match) return match[1];
  return "image/jpeg";
}

serve(async (req) => {
  console.log("Extract reservation function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Verificar autenticación (cualquier user logueado en el panel puede llamarla)
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.log("Missing or invalid authorization header");
    return new Response(
      JSON.stringify({ error: "Autenticación requerida" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
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

    const validation = validateImageData(imageBase64);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── Configuración de Google Gemini ───
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Error de configuración del servidor" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Limpiar prefijo data: si viene
    const base64Data = imageBase64.includes(",")
      ? imageBase64.split(",")[1]
      : imageBase64;
    const mimeType = getMimeType(imageBase64);
    const estimatedSizeKB = Math.round((base64Data.length * 3) / 4 / 1024);
    console.log(`Processing image, mime=${mimeType}, size=${estimatedSizeKB}KB`);

    // ─── Llamada a Google Gemini API (formato nativo) ───
    // Modelo: gemini-2.5-flash (rápido, multimodal, soporta imágenes)
    // Endpoint oficial de Google AI Studio
    const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    console.log("Calling Google Gemini API...");

    const response = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        // El system prompt va como systemInstruction (forma nativa de Gemini)
        systemInstruction: {
          parts: [{ text: SYSTEM_PROMPT }],
        },
        contents: [
          {
            role: "user",
            parts: [
              {
                text: "Analiza esta imagen y extrae la información de la reservación. Responde SOLO con JSON válido.",
              },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: base64Data,
                },
              },
            ],
          },
        ],
        generationConfig: {
          // Pedirle que devuelva JSON estricto (Gemini lo respeta)
          responseMimeType: "application/json",
          temperature: 0.2, // baja para más consistencia
        },
      }),
    });

    console.log(`Gemini response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Servicio temporalmente ocupado. Intenta de nuevo en unos segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 408 || response.status === 504) {
        return new Response(
          JSON.stringify({ error: "La imagen tardó demasiado en procesarse. Intenta con una foto más pequeña." }),
          { status: 408, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Error al procesar la imagen. Intenta de nuevo." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    console.log("Gemini response received");

    // ─── Parseo del JSON devuelto por Gemini ───
    // Estructura típica de Gemini:
    // { candidates: [ { content: { parts: [ { text: "..." } ] } } ] }
    const aiContent = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!aiContent) {
      console.error("No content in Gemini response", JSON.stringify(data).slice(0, 500));
      return new Response(
        JSON.stringify({ error: "No se pudo extraer información de la imagen" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let extractedData;
    try {
      // Por si Gemini envuelve en ```json ... ``` (raro con responseMimeType, pero por seguridad)
      const cleanContent = aiContent
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      extractedData = JSON.parse(cleanContent);
      console.log("Extracted data successfully");
    } catch (parseError) {
      console.error("Failed to parse Gemini response:", aiContent.slice(0, 300));
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
