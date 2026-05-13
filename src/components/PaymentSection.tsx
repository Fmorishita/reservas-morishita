import { useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CreditCard, Banknote, Building2, Check, Camera, Image, X, Loader2, ExternalLink } from "lucide-react";
import {
  PaymentMethod,
  Reservation,
  CobradoPor,
  TipoTarjeta,
} from "@/types/reservation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  FinalPaymentFields,
  FinalPaymentFieldsValue,
  computePropinaMonto,
  computeTotal,
  isValid,
} from "@/components/FinalPaymentFields";

export interface PaymentUpdates {
  metodo_pago: PaymentMethod | null;
  monto_pagado: number | null;
  fecha_pago: string | null;
  notas_pago: string | null;
  ticket_imagen_url: string | null;
  cobrado_por: CobradoPor | null;
  tipo_tarjeta: TipoTarjeta | null;
  propina: number | null;
}

interface PaymentSectionProps {
  reservation: Reservation;
  onUpdatePayment: (updates: PaymentUpdates) => void;
  isUpdating?: boolean;
}

const paymentIcons: Record<PaymentMethod, React.ReactNode> = {
  Efectivo: <Banknote className="w-4 h-4" />,
  Terminal: <CreditCard className="w-4 h-4" />,
  Transferencia: <Building2 className="w-4 h-4" />,
};

interface AnalysisResult {
  monto: number | null;
  confianza?: "alta" | "media" | "baja";
  error?: string;
}

function inferPropinaState(reservation: Reservation, base: number): FinalPaymentFieldsValue {
  const propina = reservation.propina ?? 0;
  const pct = base > 0 ? Math.round((propina / base) * 100) : 0;
  const isCleanPct = base > 0 && Math.abs(base * (pct / 100) - propina) < 0.01;
  return {
    metodo: (reservation.metodo_pago as PaymentMethod | null) ?? null,
    cobradoPor: reservation.cobrado_por ?? null,
    tipoTarjeta: reservation.tipo_tarjeta ?? null,
    propinaMode: isCleanPct ? "porcentaje" : "monto",
    propinaInput: propina === 0 ? "" : isCleanPct ? pct.toString() : propina.toString(),
  };
}

export function PaymentSection({ reservation, onUpdatePayment, isUpdating }: PaymentSectionProps) {
  const defaultAnticipo = (reservation.numero_personas || 1) * 925;
  // Base editable: inicializa con el monto ya pagado (si existe) o el default
  const [baseInput, setBaseInput] = useState<string>(
    () => (reservation.monto_pagado != null
      ? (reservation.monto_pagado - (reservation.propina ?? 0)).toString()
      : defaultAnticipo.toString())
  );
  const expectedAnticipo = Math.max(0, parseFloat(baseInput) || 0);

  const [value, setValue] = useState<FinalPaymentFieldsValue>(() =>
    inferPropinaState(reservation, expectedAnticipo)
  );
  const [notes, setNotes] = useState(reservation.notas_pago || "");
  const [isEditing, setIsEditing] = useState(!reservation.metodo_pago);

  // Ticket image states
  const [ticketFile, setTicketFile] = useState<File | null>(null);
  const [ticketPreview, setTicketPreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [ticketSignedUrl, setTicketSignedUrl] = useState<string | null>(null);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const isPaid = !!reservation.metodo_pago;

  // Generate signed URL for existing ticket images
  useEffect(() => {
    const getSignedUrl = async () => {
      const url = reservation.ticket_imagen_url;
      if (!url) {
        setTicketSignedUrl(null);
        return;
      }
      if (url.startsWith("http")) {
        setTicketSignedUrl(url);
        return;
      }
      const { data, error } = await supabase.storage
        .from("payment-tickets")
        .createSignedUrl(url, 86400);
      if (!error && data) {
        setTicketSignedUrl(data.signedUrl);
      }
    };
    getSignedUrl();
  }, [reservation.ticket_imagen_url]);

  const canSave = isValid(value);

  const handleImageSelect = async (file: File) => {
    setTicketFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setTicketPreview(reader.result as string);
    reader.readAsDataURL(file);

    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      const base64 = await new Promise<string>((resolve) => {
        const r = new FileReader();
        r.onloadend = () => resolve(r.result as string);
        r.readAsDataURL(file);
      });

      const { data, error } = await supabase.functions.invoke("extract-ticket-amount", {
        body: { imageBase64: base64 },
      });

      if (error) {
        console.error("Error analyzing ticket:", error);
        setAnalysisResult({ monto: null, error: "Error al analizar el ticket" });
      } else if (data) {
        setAnalysisResult(data as AnalysisResult);
        if (data.monto && (data.confianza === "alta" || data.confianza === "media")) {
          // Si el monto detectado es mayor que la base, lo metemos como propina
          const detectado = data.monto as number;
          if (detectado > expectedAnticipo) {
            const propina = detectado - expectedAnticipo;
            setValue((v) => ({ ...v, propinaMode: "monto", propinaInput: propina.toString() }));
          }
          toast({
            title: "Monto detectado",
            description: `Se encontró: $${detectado.toLocaleString("es-MX")} (confianza ${data.confianza})`,
          });
        }
      }
    } catch (err) {
      console.error("Error calling extract-ticket-amount:", err);
      setAnalysisResult({ monto: null, error: "Error al conectar con el servicio de análisis" });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageSelect(file);
    }
    e.target.value = "";
  };

  const handleRemoveImage = () => {
    setTicketFile(null);
    setTicketPreview(null);
    setAnalysisResult(null);
  };

  const uploadTicketImage = async (): Promise<string | null> => {
    if (!ticketFile) return reservation.ticket_imagen_url;

    setIsUploading(true);
    try {
      const fileExt = ticketFile.name.split(".").pop();
      const fileName = `${reservation.id}-${Date.now()}.${fileExt}`;
      const filePath = fileName;

      const { error: uploadError } = await supabase.storage
        .from("payment-tickets")
        .upload(filePath, ticketFile, { cacheControl: "3600", upsert: true });

      if (uploadError) {
        console.error("Error uploading ticket:", uploadError);
        throw uploadError;
      }

      return filePath;
    } catch (err) {
      console.error("Error in uploadTicketImage:", err);
      toast({
        title: "Error",
        description: "No se pudo subir la imagen del ticket",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    if (!value.metodo) return;

    let ticketUrl = reservation.ticket_imagen_url;
    if (ticketFile) {
      ticketUrl = await uploadTicketImage();
    } else if (!ticketPreview && !reservation.ticket_imagen_url) {
      ticketUrl = null;
    }

    const propina = computePropinaMonto(value, expectedAnticipo);
    const total = computeTotal(value, expectedAnticipo);

    onUpdatePayment({
      metodo_pago: value.metodo,
      monto_pagado: total,
      fecha_pago: reservation.fecha_pago || new Date().toISOString(),
      notas_pago: notes || null,
      ticket_imagen_url: ticketUrl,
      cobrado_por: value.metodo === "Efectivo" ? value.cobradoPor : null,
      tipo_tarjeta: value.metodo === "Terminal" ? value.tipoTarjeta : null,
      propina,
    });
    setIsEditing(false);
  };

  const handleClear = () => {
    onUpdatePayment({
      metodo_pago: null,
      monto_pagado: null,
      fecha_pago: null,
      notas_pago: null,
      ticket_imagen_url: null,
      cobrado_por: null,
      tipo_tarjeta: null,
      propina: null,
    });
    setValue({
      metodo: null,
      cobradoPor: null,
      tipoTarjeta: null,
      propinaMode: "porcentaje",
      propinaInput: "",
    });
    setNotes("");
    setTicketFile(null);
    setTicketPreview(null);
    setAnalysisResult(null);
    setIsEditing(true);
  };

  if (isPaid && !isEditing) {
    return (
      <div className="space-y-3 p-4 rounded-lg bg-success/10 border border-success/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5 text-success" />
            <span className="font-medium text-success">Anticipo pagado (50%)</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const base = reservation.monto_pagado != null
                ? reservation.monto_pagado - (reservation.propina ?? 0)
                : defaultAnticipo;
              setBaseInput(base.toString());
              setValue(inferPropinaState(reservation, base));
              setIsEditing(true);
            }}
          >
            Editar
          </Button>
        </div>
        <div className="space-y-1 text-sm">
          <div className="flex items-center gap-2">
            {paymentIcons[reservation.metodo_pago as PaymentMethod]}
            <span>{reservation.metodo_pago}</span>
            {reservation.metodo_pago === "Terminal" && reservation.tipo_tarjeta && (
              <span className="text-xs text-muted-foreground">
                · {reservation.tipo_tarjeta === "credito" ? "Crédito" : "Débito"}
              </span>
            )}
          </div>
          {reservation.metodo_pago === "Efectivo" && reservation.cobrado_por && (
            <p className="text-muted-foreground">
              Cobrado por: {reservation.cobrado_por === "veronica" ? "Verónica" : "Fran"}
            </p>
          )}
          {reservation.monto_pagado != null && (
            <p className="text-muted-foreground">
              Monto: ${reservation.monto_pagado.toLocaleString("es-MX")}
            </p>
          )}
          {reservation.propina != null && reservation.propina > 0 && (
            <p className="text-muted-foreground">
              Propina: $
              {reservation.propina.toLocaleString("es-MX", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          )}
          {reservation.fecha_pago && (
            <p className="text-muted-foreground">
              Fecha:{" "}
              {format(new Date(reservation.fecha_pago), "d MMM yyyy, HH:mm", { locale: es })}
            </p>
          )}
          {reservation.notas_pago && (
            <p className="text-muted-foreground">Notas: {reservation.notas_pago}</p>
          )}
        </div>

        {ticketSignedUrl && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Ticket adjunto</Label>
            <a
              href={ticketSignedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block relative group"
            >
              <img
                src={ticketSignedUrl}
                alt="Ticket de pago"
                className="w-full max-w-[200px] h-auto rounded-md border border-border object-cover"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-md">
                <ExternalLink className="w-6 h-6 text-white" />
              </div>
            </a>
          </div>
        )}

        <Button variant="outline" size="sm" onClick={handleClear} className="w-full">
          Quitar pago
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 rounded-lg bg-muted/50 border border-border">
      <div className="flex items-center justify-between">
        <Label className="text-base font-medium">Anticipo (50%)</Label>
        {!isPaid && (
          <Badge variant="outline" className="text-warning border-warning">
            Sin pagar
          </Badge>
        )}
      </div>

      {/* Monto base editable */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label className="text-sm">Monto base</Label>
          <span className="text-xs text-muted-foreground">
            Default: ${defaultAnticipo.toLocaleString("es-MX")} ({reservation.numero_personas} × $925)
          </span>
        </div>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
          <Input
            type="number"
            inputMode="numeric"
            min="0"
            value={baseInput}
            onChange={(e) => setBaseInput(e.target.value)}
            className="pl-7 text-right"
            placeholder={defaultAnticipo.toString()}
          />
        </div>
      </div>

      {/* Hidden file inputs */}
      <input
        type="file"
        ref={cameraInputRef}
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        type="file"
        ref={galleryInputRef}
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      <FinalPaymentFields base={expectedAnticipo} value={value} onChange={setValue} />

      {/* Ticket image upload for Terminal */}
      {value.metodo === "Terminal" && (
        <div className="space-y-3 p-3 rounded-lg bg-background border border-border">
          <Label className="text-sm">Foto del ticket (opcional)</Label>

          {!ticketPreview ? (
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex flex-col items-center gap-2 h-auto py-4"
                onClick={() => cameraInputRef.current?.click()}
              >
                <Camera className="w-5 h-5" />
                <span className="text-xs">Cámara</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex flex-col items-center gap-2 h-auto py-4"
                onClick={() => galleryInputRef.current?.click()}
              >
                <Image className="w-5 h-5" />
                <span className="text-xs">Galería</span>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="relative">
                <img
                  src={ticketPreview}
                  alt="Vista previa del ticket"
                  className="w-full max-h-[200px] object-contain rounded-md border border-border"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8"
                  onClick={handleRemoveImage}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {isAnalyzing && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Analizando ticket...</span>
                </div>
              )}

              {analysisResult && !isAnalyzing && (
                <div
                  className={cn(
                    "p-3 rounded-md text-sm",
                    analysisResult.monto
                      ? "bg-success/10 border border-success/30"
                      : "bg-warning/10 border border-warning/30"
                  )}
                >
                  {analysisResult.monto ? (
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-success" />
                      <span>
                        Monto detectado: <strong>${analysisResult.monto.toLocaleString("es-MX")}</strong>
                      </span>
                      {analysisResult.confianza && (
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs",
                            analysisResult.confianza === "alta" && "border-success text-success",
                            analysisResult.confianza === "media" && "border-warning text-warning",
                            analysisResult.confianza === "baja" && "border-muted-foreground text-muted-foreground"
                          )}
                        >
                          {analysisResult.confianza}
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <p className="text-warning">
                      {analysisResult.error || "No se pudo detectar el monto. Ingresa manualmente."}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Notes */}
      <div className="space-y-2">
        <Label>Notas del pago (opcional)</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Referencia, comprobante, etc."
          rows={2}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {isPaid && (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              const base = reservation.monto_pagado != null
                ? reservation.monto_pagado - (reservation.propina ?? 0)
                : defaultAnticipo;
              setBaseInput(base.toString());
              setValue(inferPropinaState(reservation, base));
              setIsEditing(false);
            }}
            className="flex-1"
          >
            Cancelar
          </Button>
        )}
        <Button
          type="button"
          onClick={handleSave}
          disabled={!canSave || isUpdating || isUploading || isAnalyzing}
          className="flex-1"
        >
          {isUpdating || isUploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Guardando...
            </>
          ) : (
            "Guardar anticipo"
          )}
        </Button>
      </div>
    </div>
  );
}
