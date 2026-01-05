import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { format, parse, isValid, isSaturday, isSunday, isPast, startOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { Upload, Camera, X, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ReservationForm } from "@/components/ReservationForm";
import { useReservations } from "@/hooks/useReservations";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { TimeSlot, MenuType, ReservationStatus } from "@/types/reservation";

interface ExtractedData {
  fecha?: string;
  horario?: string;
  numero_personas?: number;
  nombre_cliente?: string;
  whatsapp?: string;
  motivo_visita?: string;
  tipo_menu?: string;
  alergias?: string;
  errores?: string[];
}

export default function ReservacionDesdeImagen() {
  const navigate = useNavigate();
  const { addReservation, canAddReservation } = useReservations();
  
  const [image, setImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleImageSelect = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setImage(e.target?.result as string);
      setExtractedData(null);
      setErrors([]);
      setShowForm(false);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      handleImageSelect(file);
    }
  }, [handleImageSelect]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageSelect(file);
    }
  }, [handleImageSelect]);

  const processImage = async () => {
    if (!image) return;
    
    setIsProcessing(true);
    setErrors([]);
    
    try {
      const { data, error } = await supabase.functions.invoke("extract-reservation", {
        body: { imageBase64: image },
      });

      if (error) {
        throw new Error(error.message || "Error al procesar la imagen");
      }

      if (!data.success) {
        throw new Error(data.error || "No se pudo extraer información");
      }

      const extracted = data.data as ExtractedData;
      setExtractedData(extracted);
      
      if (extracted.errores && extracted.errores.length > 0) {
        setErrors(extracted.errores);
      }
      
      setShowForm(true);
      
      toast({
        title: "Imagen procesada",
        description: "Se ha extraído la información. Por favor revisa y confirma los datos.",
      });
    } catch (err) {
      console.error("Error processing image:", err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Error al procesar la imagen",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const parseExtractedDate = (dateStr?: string): Date | undefined => {
    if (!dateStr) return undefined;
    
    // Try YYYY-MM-DD format first
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const date = new Date(dateStr + "T12:00:00");
      if (isValid(date)) return date;
    }
    
    // Try various date formats
    const formats = [
      "dd/MM/yyyy",
      "d/M/yyyy",
      "dd-MM-yyyy",
      "d 'de' MMMM",
      "d 'de' MMMM yyyy",
      "EEEE d 'de' MMMM",
    ];
    
    for (const fmt of formats) {
      try {
        const parsed = parse(dateStr, fmt, new Date(), { locale: es });
        if (isValid(parsed)) return parsed;
      } catch {}
    }
    
    return undefined;
  };

  const normalizeTimeSlot = (time?: string): TimeSlot | undefined => {
    if (!time) return undefined;
    
    const normalized = time.toLowerCase().replace(/\s/g, "");
    
    if (normalized.includes("13:00") || normalized.includes("1:00pm") || normalized.includes("1pm") || normalized.includes("comida")) {
      return "COMIDA";
    }
    if (normalized.includes("15:30") || normalized.includes("3:30pm") || normalized.includes("330pm") || normalized.includes("tarde")) {
      return "TARDE";
    }
    if (normalized.includes("18:00") || normalized.includes("6:00pm") || normalized.includes("6pm") || normalized.includes("cena")) {
      return "CENA";
    }
    
    return undefined;
  };

  const normalizeMenuType = (menu?: string): MenuType => {
    if (!menu) return "Omakase 12 tiempos";
    
    const lower = menu.toLowerCase();
    if (lower.includes("libre") || lower.includes("free")) {
      return "Omakase Libre";
    }
    return "Omakase 12 tiempos";
  };

  const getInitialFormData = () => {
    if (!extractedData) return undefined;

    const parsedDate = parseExtractedDate(extractedData.fecha);
    const timeSlot = normalizeTimeSlot(extractedData.horario);
    
    return {
      id: "",
      fecha: parsedDate ? format(parsedDate, "yyyy-MM-dd") : "",
      horario: timeSlot || "COMIDA" as TimeSlot,
      numero_personas: Math.min(extractedData.numero_personas || 2, 4),
      nombre_cliente: extractedData.nombre_cliente || "",
      whatsapp: extractedData.whatsapp || "",
      tipo_menu: normalizeMenuType(extractedData.tipo_menu) as MenuType,
      motivo_visita: extractedData.motivo_visita || "",
      alergias: extractedData.alergias || "",
      estado: "Pendiente" as ReservationStatus,
      notas_internas: "Creada desde imagen 📸",
      reminder_24h_shown: false,
      reminder_2h_shown: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  };

  const handleSubmit = async (data: any) => {
    setValidationError("");
    const fecha = format(data.fecha, "yyyy-MM-dd");

    // Validate it's a weekend
    const dateObj = new Date(fecha + "T12:00:00");
    if (!isSaturday(dateObj) && !isSunday(dateObj)) {
      setValidationError("Solo abrimos sábados y domingos");
      return;
    }

    // Validate not in the past
    if (isPast(startOfDay(dateObj)) && startOfDay(dateObj) < startOfDay(new Date())) {
      setValidationError("La fecha no puede ser en el pasado");
      return;
    }

    // Validate capacity
    const validation = canAddReservation(fecha, data.horario, data.numero_personas);
    if (!validation.allowed) {
      setValidationError(validation.reason);
      return;
    }

    setIsSubmitting(true);

    try {
      await addReservation({
        ...data,
        fecha,
        whatsapp: data.whatsapp || null,
        motivo_visita: data.motivo_visita || null,
        alergias: data.alergias || null,
        notas_internas: data.notas_internas || "Creada desde imagen 📸",
      });

      toast({
        title: "¡Reservación creada! 📸✨",
        description: `Reservación para ${data.nombre_cliente} creada automáticamente desde la imagen.`,
      });

      navigate("/");
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo crear la reservación",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearImage = () => {
    setImage(null);
    setExtractedData(null);
    setErrors([]);
    setShowForm(false);
  };

  return (
    <div className="max-w-lg mx-auto space-y-6 md:pt-14">
      <div>
        <h1 className="text-2xl font-medium">Crear desde foto</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Sube una imagen con los datos de la reservación
        </p>
      </div>

      {!showForm ? (
        <>
          {/* Image upload area */}
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              {image ? (
                <div className="relative">
                  <img
                    src={image}
                    alt="Imagen cargada"
                    className="w-full max-h-80 object-contain bg-muted"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={clearImage}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <label
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  className="flex flex-col items-center justify-center h-64 cursor-pointer border-2 border-dashed border-border rounded-lg m-4 hover:border-accent transition-colors"
                >
                  <Upload className="w-10 h-10 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground text-center px-4">
                    Arrastra una imagen aquí o toca para seleccionar
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Captura de WhatsApp, nota, foto de texto...
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileInput}
                    className="hidden"
                  />
                </label>
              )}
            </CardContent>
          </Card>

          {/* Process button */}
          {image && (
            <Button
              onClick={processImage}
              disabled={isProcessing}
              className="w-full gap-2"
              size="lg"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Procesando imagen...
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4" />
                  Extraer información
                </>
              )}
            </Button>
          )}

          {/* Camera button for mobile */}
          {!image && (
            <label className="block">
              <Button variant="outline" className="w-full gap-2" asChild>
                <span>
                  <Camera className="w-4 h-4" />
                  Tomar foto con cámara
                </span>
              </Button>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileInput}
                className="hidden"
              />
            </label>
          )}
        </>
      ) : (
        <>
          {/* Extracted info preview */}
          {extractedData && (
            <Card className="bg-secondary/50">
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  Información extraída de la imagen
                </div>
                
                {/* Show thumbnail */}
                {image && (
                  <div className="flex gap-3 items-start">
                    <img
                      src={image}
                      alt="Imagen procesada"
                      className="w-16 h-16 object-cover rounded-md border"
                    />
                    <div className="text-xs text-muted-foreground space-y-1">
                      {extractedData.fecha && <p>📅 {extractedData.fecha}</p>}
                      {extractedData.horario && <p>⏰ {extractedData.horario}</p>}
                      {extractedData.nombre_cliente && <p>👤 {extractedData.nombre_cliente}</p>}
                      {extractedData.numero_personas && <p>👥 {extractedData.numero_personas} personas</p>}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Warnings */}
          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>
                <ul className="list-disc list-inside text-sm">
                  {errors.map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Pre-filled form */}
          <div>
            <h2 className="text-lg font-medium mb-4">Revisa y confirma los datos</h2>
            <ReservationForm
              initialData={getInitialFormData()}
              onSubmit={handleSubmit}
              onCancel={() => {
                setShowForm(false);
                setExtractedData(null);
              }}
              validationError={validationError}
              isSubmitting={isSubmitting}
            />
          </div>
        </>
      )}

      {/* Back button */}
      <Button
        variant="ghost"
        onClick={() => navigate("/")}
        className="w-full"
      >
        Volver a la agenda
      </Button>
    </div>
  );
}
