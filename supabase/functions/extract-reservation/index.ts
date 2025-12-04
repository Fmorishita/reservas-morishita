import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

serve(async (req) => {
  console.log("Extract reservation function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64 } = await req.json();
    
    if (!imageBase64) {
      console.error("No image provided");
      return new Response(
        JSON.stringify({ error: "No se proporcionó una imagen" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "API key no configurada" }),
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
          JSON.stringify({ error: "Límite de solicitudes excedido. Intenta de nuevo en unos momentos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos agotados. Agrega créditos a tu workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Error al procesar la imagen con IA" }),
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
      console.log("Extracted data:", extractedData);
    } catch (parseError) {
      console.error("Failed to parse AI response:", aiContent);
      return new Response(
        JSON.stringify({ 
          error: "No se pudo interpretar la información extraída",
          rawContent: aiContent 
        }),
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
      JSON.stringify({ error: error instanceof Error ? error.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
