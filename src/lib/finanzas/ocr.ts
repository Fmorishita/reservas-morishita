/**
 * OCR de tickets — usa la Edge Function `extract-ticket` de Supabase,
 * que internamente llama a Google Gemini Vision.
 *
 * Mucho más preciso que Tesseract.js para tickets fotografiados.
 */

import { supabase } from "@/integrations/supabase/client";

export interface DatosTicket {
  monto: number | null;
  proveedor: string | null;
  descripcion: string | null;
  fecha: string | null;
  tipo: "insumos" | "publicidad" | "operacion" | null;
}

const EMPTY: DatosTicket = {
  monto: null,
  proveedor: null,
  descripcion: null,
  fecha: null,
  tipo: null,
};

/**
 * Convierte un File a data URL base64.
 */
function fileToDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * Re-comprime una imagen muy grande a JPEG ≤ 1600px de lado mayor.
 * Mejora velocidad de subida y precisión (Gemini funciona bien con ~1024-1600px).
 */
async function comprimirSiEsGrande(file: File | Blob): Promise<Blob> {
  if (file.size < 1_500_000) return file; // < 1.5MB → no comprimir

  const dataUrl = await fileToDataUrl(file);
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("No se pudo leer la imagen"));
    i.src = dataUrl;
  });

  const MAX = 1600;
  const scale = Math.min(1, MAX / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(img, 0, 0, w, h);

  return new Promise<Blob>((resolve) => {
    canvas.toBlob(
      (blob) => resolve(blob ?? (file as Blob)),
      "image/jpeg",
      0.85,
    );
  });
}

/**
 * Llama a la edge function `extract-ticket` con la imagen del ticket
 * y devuelve los datos estructurados.
 *
 * @param imagen  File o Blob con la foto del ticket
 * @param onProgress  Callback de progreso 0–100 (orientativo)
 */
export async function leerTicket(
  imagen: File | Blob,
  onProgress?: (pct: number) => void,
): Promise<DatosTicket> {
  try {
    onProgress?.(10);

    const comprimida = await comprimirSiEsGrande(imagen);
    onProgress?.(30);

    const dataUrl = await fileToDataUrl(comprimida);
    onProgress?.(50);

    const { data, error } = await supabase.functions.invoke("extract-ticket", {
      body: { image: dataUrl },
    });

    onProgress?.(95);

    if (error) {
      console.error("[ocr] edge function error:", error);
      return EMPTY;
    }

    if (!data || typeof data !== "object") {
      return EMPTY;
    }

    const r = data as Record<string, unknown>;
    const result: DatosTicket = {
      monto:
        typeof r.monto === "number" && r.monto > 0 ? Number(r.monto.toFixed(2)) : null,
      proveedor:
        typeof r.proveedor === "string" && r.proveedor.trim()
          ? r.proveedor.trim()
          : null,
      descripcion:
        typeof r.descripcion === "string" && r.descripcion.trim()
          ? r.descripcion.trim()
          : null,
      fecha:
        typeof r.fecha === "string" && /^\d{4}-\d{2}-\d{2}$/.test(r.fecha)
          ? r.fecha
          : null,
      tipo:
        r.tipo === "insumos" || r.tipo === "publicidad" || r.tipo === "operacion"
          ? r.tipo
          : null,
    };

    onProgress?.(100);
    return result;
  } catch (err) {
    console.error("[ocr] error:", err);
    return EMPTY;
  }
}
