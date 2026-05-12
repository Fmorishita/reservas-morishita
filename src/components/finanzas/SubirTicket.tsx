import { useRef, useState } from "react";
import { Camera, ImageIcon, X, Loader2, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { subirTicket } from "@/lib/finanzas/queries";
import { leerTicket, type DatosTicket } from "@/lib/finanzas/ocr";

interface SubirTicketProps {
  semanaId: string;
  onSubido: (url: string) => void;
  onOcr?: (datos: DatosTicket) => void;
  urlActual?: string | null;
}

type Estado = "idle" | "subiendo" | "ocr" | "listo";

export function SubirTicket({
  semanaId,
  onSubido,
  onOcr,
  urlActual,
}: SubirTicketProps) {
  const camaraRef = useRef<HTMLInputElement>(null);
  const galeriaRef = useRef<HTMLInputElement>(null);

  const [abierto, setAbierto] = useState(false);
  const [estado, setEstado] = useState<Estado>("idle");
  const [ocrPct, setOcrPct] = useState(0);
  const [preview, setPreview] = useState<string | null>(urlActual ?? null);
  const [mensajeOcr, setMensajeOcr] = useState<string | null>(null);

  const procesarArchivo = async (file: File) => {
    setAbierto(false);
    setPreview(URL.createObjectURL(file));
    setEstado("subiendo");
    setMensajeOcr(null);

    try {
      // 1. Subir a Supabase Storage
      const url = await subirTicket(file, semanaId);
      onSubido(url);

      // 2. OCR automático
      if (onOcr) {
        setEstado("ocr");
        setOcrPct(0);
        const datos = await leerTicket(file, (pct) => setOcrPct(pct));
        onOcr(datos);

        // Mensaje resumen
        const partes: string[] = [];
        if (datos.monto) partes.push(`$${datos.monto.toFixed(2)}`);
        if (datos.proveedor) partes.push(datos.proveedor);
        setMensajeOcr(
          partes.length
            ? `✓ Detectado: ${partes.join(" · ")}`
            : "No se detectaron datos automáticamente",
        );
      }

      setEstado("listo");
    } catch (err) {
      console.error("Error procesando ticket:", err);
      setPreview(null);
      setEstado("idle");
    }
  };

  const handleInputChange =
    (ref: React.RefObject<HTMLInputElement | null>) =>
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      // Limpiar input para permitir re-selección del mismo archivo
      if (ref.current) ref.current.value = "";
      await procesarArchivo(file);
    };

  const limpiar = () => {
    setPreview(null);
    setEstado("idle");
    setMensajeOcr(null);
    onSubido("");
    if (onOcr) onOcr({ monto: null, proveedor: null, descripcion: null, fecha: null });
  };

  const cargando = estado === "subiendo" || estado === "ocr";

  return (
    <div className="space-y-2">
      {/* Preview del ticket */}
      {preview ? (
        <div className="relative w-full h-40 rounded-xl overflow-hidden border border-border">
          <img src={preview} alt="Ticket" className="w-full h-full object-cover" />

          {/* Overlay de progreso */}
          {cargando && (
            <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center gap-2">
              {estado === "subiendo" ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <span className="text-xs text-muted-foreground">Subiendo foto…</span>
                </>
              ) : (
                <>
                  <ScanLine className="w-6 h-6 text-primary animate-pulse" />
                  <span className="text-xs text-muted-foreground">
                    Leyendo ticket… {ocrPct}%
                  </span>
                  <div className="w-32 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${ocrPct}%` }}
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {/* Botón eliminar */}
          {!cargando && (
            <button
              type="button"
              onClick={limpiar}
              className="absolute top-2 right-2 bg-background/80 rounded-full p-1 hover:bg-background"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      ) : (
        /* Botón para abrir el drawer */
        <Button
          type="button"
          variant="outline"
          className="w-full h-20 border-dashed flex flex-col gap-1 text-muted-foreground"
          onClick={() => setAbierto(true)}
        >
          <Camera className="w-5 h-5" />
          <span className="text-xs">Foto del ticket (opcional)</span>
        </Button>
      )}

      {/* Mensaje de resultado OCR */}
      {mensajeOcr && (
        <p
          className={`text-xs px-1 ${
            mensajeOcr.startsWith("✓")
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-muted-foreground"
          }`}
        >
          {mensajeOcr}
        </p>
      )}

      {/* Drawer: elegir fuente de imagen */}
      <Drawer open={abierto} onOpenChange={setAbierto}>
        <DrawerContent>
          <DrawerHeader className="pb-2">
            <DrawerTitle className="text-center text-base">
              Agregar foto del ticket
            </DrawerTitle>
          </DrawerHeader>

          <div className="p-4 flex flex-col gap-3 pb-8">
            {/* Cámara */}
            <Button
              type="button"
              variant="outline"
              className="h-16 flex gap-3 text-base justify-start px-5"
              onClick={() => camaraRef.current?.click()}
            >
              <Camera className="w-6 h-6 text-primary" />
              <div className="text-left">
                <div className="font-medium">Tomar foto</div>
                <div className="text-xs text-muted-foreground">Abrir cámara</div>
              </div>
            </Button>

            {/* Galería */}
            <Button
              type="button"
              variant="outline"
              className="h-16 flex gap-3 text-base justify-start px-5"
              onClick={() => galeriaRef.current?.click()}
            >
              <ImageIcon className="w-6 h-6 text-primary" />
              <div className="text-left">
                <div className="font-medium">Elegir de galería</div>
                <div className="text-xs text-muted-foreground">Carrete / biblioteca de fotos</div>
              </div>
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="text-muted-foreground"
              onClick={() => setAbierto(false)}
            >
              Cancelar
            </Button>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Inputs ocultos */}
      {/* Cámara: capture=environment fuerza cámara trasera */}
      <input
        ref={camaraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleInputChange(camaraRef)}
      />
      {/* Galería: sin capture para abrir biblioteca */}
      <input
        ref={galeriaRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleInputChange(galeriaRef)}
      />
    </div>
  );
}
