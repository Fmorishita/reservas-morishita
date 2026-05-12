// ============================================================
// MORISHITA — extract-ticket
// Edge Function que recibe la foto de un ticket (base64) y
// devuelve datos estructurados usando Google Gemini Vision.
//
// Mucho más preciso que Tesseract.js para tickets fotografiados.
// ============================================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_IMAGE_SIZE_BYTES = 8 * 1024 * 1024; // 8MB
const VALID_IMAGE_PREFIXES = [
  "data:image/jpeg",
  "data:image/png",
  "data:image/gif",
  "data:image/webp",
  "data:image/jpg",
  "data:image/heic",
];

function buildSystemPrompt(today: string): string {
  return `Eres un asistente que extrae información de tickets/recibos de compra para un restaurante en México.

CONTEXTO IMPORTANTE: La fecha de hoy es ${today} (formato YYYY-MM-DD). Los tickets siempre corresponden a una compra reciente — usa esto para desambiguar formatos de fecha.

Analiza la imagen del ticket y devuelve EXACTAMENTE un JSON con estos campos. Si algún dato no está visible o no estás seguro, devuelve null para ese campo.

Campos:
- proveedor: nombre del negocio donde se hizo la compra (ej: "el Roble", "Walmart", "Costco"). Solo el nombre comercial, nunca el RFC ni el nombre de la persona. Capitalización normal (ej: "EL ROBLE" → "el Roble").
- descripcion: descripción corta del gasto. Si hay UN artículo, usa su nombre (ej: "Galletas Biscoff Lotus 250"). Si hay varios, resume (ej: "Compra de insumos varios"). Máximo 80 caracteres. Capitalización normal.
- monto: el TOTAL final pagado (no subtotal). Número decimal (ej: 128.95).
- fecha: fecha del ticket en formato YYYY-MM-DD.
  IMPORTANTE para desambiguar: los tickets en México pueden venir en formato DD/MM/YYYY o MM/DD/YYYY (depende del POS).
  REGLA: elige la interpretación que dé una fecha PASADA y RECIENTE (entre 90 días atrás y hoy). Si ambas interpretaciones funcionan, elige la más cercana a hoy. Si solo una es plausible (pasada y dentro de 6 meses), usa esa. Una fecha en el futuro NUNCA es válida para un ticket.
- tipo: clasifica el gasto en una de tres categorías:
  - "insumos" → alimentos, bebidas, ingredientes, abarrotes, frutas, verduras, carnes, productos de limpieza para cocina
  - "publicidad" → impresiones, redes sociales, anuncios, diseño, fotografía profesional
  - "operacion" → todo lo demás (luz, gas, gasolina, papelería, mantenimiento, servicios, etc.)
  Si no puedes determinar, usa "operacion".

IMPORTANTE:
- Responde ÚNICAMENTE con JSON válido, nada más.
- No incluyas markdown, no agregues \`\`\`json.
- Si la imagen no es un ticket o no se ve, devuelve todos los campos en null.

Formato exacto:
{"proveedor": "...", "descripcion": "...", "monto": 0.00, "fecha": "YYYY-MM-DD", "tipo": "insumos"}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { image, today } = await req.json();

    if (!image || typeof image !== "string") {
      return jsonResponse({ error: "Falta el campo 'image' (data URL base64)" }, 400);
    }

    // Fecha de hoy (la pasa el cliente; fallback: now en UTC).
    const todayStr =
      typeof today === "string" && /^\d{4}-\d{2}-\d{2}$/.test(today)
        ? today
        : new Date().toISOString().slice(0, 10);

    if (!VALID_IMAGE_PREFIXES.some((p) => image.startsWith(p))) {
      return jsonResponse({ error: "Formato de imagen no válido. Usa JPEG, PNG, WebP o HEIC." }, 400);
    }

    const base64Part = image.split(",")[1] ?? "";
    const estimatedBytes = (base64Part.length * 3) / 4;
    if (estimatedBytes > MAX_IMAGE_SIZE_BYTES) {
      return jsonResponse({ error: "Imagen demasiado grande (máx 8MB)" }, 400);
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return jsonResponse({ error: "GEMINI_API_KEY no configurada" }, 500);
    }

    const mimeMatch = image.match(/^data:(image\/[^;]+);base64,/);
    const mimeType = mimeMatch?.[1] ?? "image/jpeg";

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: buildSystemPrompt(todayStr) }],
          },
          contents: [
            {
              role: "user",
              parts: [
                { text: "Analiza este ticket y extrae los datos. Responde SOLO con JSON válido." },
                { inline_data: { mime_type: mimeType, data: base64Part } },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.1,
          },
        }),
      },
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("[extract-ticket] Gemini error", geminiRes.status, errText);
      return jsonResponse(
        { error: `Gemini API ${geminiRes.status}`, detail: errText.slice(0, 400) },
        502,
      );
    }

    const geminiData = await geminiRes.json();
    const rawText: string =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";

    let parsed: Record<string, unknown>;
    try {
      const cleanText = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(cleanText);
    } catch (e) {
      console.error("[extract-ticket] No es JSON:", rawText.slice(0, 300));
      return jsonResponse(
        { error: "Respuesta de Gemini no es JSON válido", raw: rawText.slice(0, 200) },
        502,
      );
    }

    // Sanity check de fecha: si vino futura, intentar swap DD↔MM
    function corregirFecha(fechaIso: string | null): string | null {
      if (!fechaIso || !/^\d{4}-\d{2}-\d{2}$/.test(fechaIso)) return null;
      const hoy = new Date(todayStr + "T12:00:00").getTime();
      const candidata = new Date(fechaIso + "T12:00:00").getTime();
      if (isNaN(candidata)) return null;
      if (candidata <= hoy) return fechaIso; // ok, está en el pasado o hoy
      // futura → swap DD↔MM
      const [y, m, d] = fechaIso.split("-");
      const swapped = `${y}-${d}-${m}`;
      const swappedTs = new Date(swapped + "T12:00:00").getTime();
      if (!isNaN(swappedTs) && swappedTs <= hoy) {
        console.log(`[extract-ticket] fecha futura ${fechaIso} corregida a ${swapped}`);
        return swapped;
      }
      console.log(`[extract-ticket] fecha futura ${fechaIso} sin corrección viable`);
      return null;
    }

    // Saneamiento
    const result = {
      proveedor:
        typeof parsed.proveedor === "string" && parsed.proveedor.trim()
          ? parsed.proveedor.trim()
          : null,
      descripcion:
        typeof parsed.descripcion === "string" && parsed.descripcion.trim()
          ? parsed.descripcion.trim()
          : null,
      monto:
        typeof parsed.monto === "number" && parsed.monto > 0 ? parsed.monto : null,
      fecha: corregirFecha(typeof parsed.fecha === "string" ? parsed.fecha : null),
      tipo:
        typeof parsed.tipo === "string" &&
        ["insumos", "publicidad", "operacion"].includes(parsed.tipo)
          ? parsed.tipo
          : null,
    };

    return jsonResponse(result, 200);
  } catch (err) {
    console.error("[extract-ticket] Error:", err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      500,
    );
  }
});

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
