import { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { format, parse, isValid, isSaturday, isSunday, isPast, startOfDay, getDay } from "date-fns";
import { es } from "date-fns/locale";
import { Upload, Camera, X, Loader2, AlertTriangle, CheckCircle2, XCircle, AlertCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ReservationForm } from "@/components/ReservationForm";
import { useReservations } from "@/hooks/useReservations";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { TimeSlot, MenuType, ReservationStatus, MAX_CAPACITY } from "@/types/reservation";
import { Badge } from "@/components/ui/badge";

interface ExtractedData {
  fecha?: string;
  dia_mencionado?: string;
  dia_real?: string;
  horario?: string;
  horario_solicitado?: string;
  numero_personas?: number;
  nombre_cliente?: string;
  whatsapp?: string;
  motivo_visita?: string;
  tipo_menu?: string;
  alergias?: string;
  advertencias?: string[];
  errores?: string[]; // Legacy support
}

interface ValidationResult {
  canProceed: boolean;
  warnings: string[];
  errors: string[];
  capacityInfo?: {
    available: number;
    requested: number;
  };
}

const DIAS_SEMANA = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

export default function ReservacionDesdeImagen() {
  const navigate = useNavigate();
  const { addReservation, canAddReservation, getCapacityForSlot, isSlotBlocked, isLoading: reservationsLoading } = useReservations();
  
  const [image, setImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [showValidation, setShowValidation] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Compress image before processing
  const compressImage = useCallback((base64: string, maxWidth = 1200, quality = 0.7): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        
        // Scale down if needed
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Convert to JPEG with compression
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => {
        // If compression fails, return original
        resolve(base64);
      };
      img.src = base64;
    });
  }, []);

  const handleImageSelect = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setImage(e.target?.result as string);
      setExtractedData(null);
      setShowValidation(false);
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
    
    if (normalized === "comida" || normalized.includes("13:00") || normalized.includes("1:00pm") || normalized.includes("1pm")) {
      return "COMIDA";
    }
    if (normalized === "tarde" || normalized.includes("15:30") || normalized.includes("3:30pm") || normalized.includes("330pm")) {
      return "TARDE";
    }
    if (normalized === "cena" || normalized.includes("18:00") || normalized.includes("6:00pm") || normalized.includes("6pm")) {
      return "CENA";
    }
    if (normalized === "noche" || normalized.includes("20:30") || normalized.includes("8:30pm") || normalized.includes("830pm") || normalized.includes("8pm")) {
      return "NOCHE";
    }
    
    return undefined;
  };

  const normalizeMenuType = (_menu?: string): MenuType => {
    return "Omakase 12 tiempos";
  };

  // Perform complete validation of extracted data
  const validateExtractedData = useCallback((data: ExtractedData): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Add AI-detected warnings
    if (data.advertencias && data.advertencias.length > 0) {
      warnings.push(...data.advertencias);
    }
    
    // Legacy support for errores field
    if (data.errores && data.errores.length > 0) {
      warnings.push(...data.errores);
    }

    const parsedDate = parseExtractedDate(data.fecha);
    const timeSlot = normalizeTimeSlot(data.horario);
    const personas = data.numero_personas || 0;

    // Check if date is valid
    if (!parsedDate) {
      errors.push("No se pudo identificar una fecha válida");
    } else {
      const fechaStr = format(parsedDate, "yyyy-MM-dd");
      const dayOfWeek = getDay(parsedDate);
      const diaReal = DIAS_SEMANA[dayOfWeek];

      // Check if it's weekend
      if (!isSaturday(parsedDate) && !isSunday(parsedDate)) {
        errors.push(`La fecha ${format(parsedDate, "d 'de' MMMM", { locale: es })} cae en ${diaReal}. Solo abrimos sábados y domingos.`);
      }

      // Check if it's in the past
      if (isPast(startOfDay(parsedDate)) && startOfDay(parsedDate) < startOfDay(new Date())) {
        errors.push("La fecha es en el pasado");
      }

      // Check day mismatch
      if (data.dia_mencionado && data.dia_real) {
        const mencionado = data.dia_mencionado.toLowerCase();
        const real = data.dia_real.toLowerCase();
        if (mencionado !== real && !mencionado.includes(real) && !real.includes(mencionado)) {
          warnings.push(`⚠️ El cliente dice "${data.dia_mencionado}" pero el ${format(parsedDate, "d 'de' MMMM", { locale: es })} es ${data.dia_real}`);
        }
      }

      // Check time slot and capacity
      if (timeSlot) {
        // Check if slot is blocked
        if (isSlotBlocked(fechaStr, timeSlot)) {
          errors.push(`El horario de ${timeSlot} para el ${format(parsedDate, "d 'de' MMMM", { locale: es })} está bloqueado`);
        } else if (personas > 0) {
          // Check capacity
          const currentCapacity = getCapacityForSlot(fechaStr, timeSlot);
          const available = MAX_CAPACITY - currentCapacity;
          
          if (personas > available) {
            if (available === 0) {
              errors.push(`No hay lugares disponibles para la sesión de ${timeSlot} el ${format(parsedDate, "d 'de' MMMM", { locale: es })}`);
            } else {
              errors.push(`Solo hay ${available} lugar${available === 1 ? '' : 'es'} disponible${available === 1 ? '' : 's'} para esa sesión, pero solicitan ${personas} personas`);
            }
          }
        }
      }
    }

    // Check time slot
    if (!timeSlot) {
      if (data.horario_solicitado) {
        errors.push(`El horario "${data.horario_solicitado}" no corresponde a ninguna sesión. Nuestros horarios: 1pm (COMIDA), 3:30pm (TARDE), 6pm (CENA)`);
      } else {
        errors.push("No se identificó un horario válido");
      }
    }

    // Check number of people
    if (personas > 4) {
      errors.push(`El cliente solicita ${personas} personas pero el máximo es 4`);
    } else if (personas < 1) {
      warnings.push("No se identificó el número de personas");
    }

    // Check client name
    if (!data.nombre_cliente) {
      warnings.push("No se identificó el nombre del cliente");
    }

    return {
      canProceed: errors.length === 0,
      warnings,
      errors,
      capacityInfo: parsedDate && timeSlot ? {
        available: MAX_CAPACITY - getCapacityForSlot(format(parsedDate, "yyyy-MM-dd"), timeSlot),
        requested: personas
      } : undefined
    };
  }, [getCapacityForSlot, isSlotBlocked]);

  const processImage = async () => {
    if (!image) return;
    
    setIsProcessing(true);
    setShowValidation(false);
    
    try {
      // Compress image before sending to reduce size and prevent timeouts
      console.log("Compressing image...");
      const compressedImage = await compressImage(image);
      console.log("Image compressed, sending to server...");
      
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000); // 45 second timeout
      
      const { data, error } = await supabase.functions.invoke("extract-reservation", {
        body: { imageBase64: compressedImage },
      });
      
      clearTimeout(timeoutId);

      if (error) {
        console.error("Supabase function error:", error);
        // Handle specific error types
        if (error.message?.includes("FunctionsHttpError")) {
          throw new Error("Error del servidor. Por favor intenta de nuevo.");
        }
        if (error.message?.includes("FunctionsRelayError")) {
          throw new Error("No se pudo conectar con el servidor. Verifica tu conexión a internet.");
        }
        if (error.message?.includes("FunctionsFetchError")) {
          throw new Error("Error de conexión. Verifica tu conexión a internet.");
        }
        throw new Error(error.message || "Error al procesar la imagen");
      }

      if (!data) {
        throw new Error("No se recibió respuesta del servidor");
      }

      if (!data.success) {
        throw new Error(data.error || "No se pudo extraer información de la imagen");
      }

      const extracted = data.data as ExtractedData;
      setExtractedData(extracted);
      setShowValidation(true);
      
    } catch (err) {
      console.error("Error processing image:", err);
      
      let errorMessage = "Error al procesar la imagen. Intenta con otra foto.";
      
      if (err instanceof Error) {
        if (err.name === "AbortError") {
          errorMessage = "La imagen tardó demasiado en procesarse. Intenta con una foto más pequeña o con mejor iluminación.";
        } else {
          errorMessage = err.message;
        }
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Compute validation result from extracted data
  const validationResult = useMemo(() => {
    if (!extractedData || reservationsLoading) return null;
    return validateExtractedData(extractedData);
  }, [extractedData, validateExtractedData, reservationsLoading]);

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

  const handleProceedToForm = () => {
    setShowValidation(false);
    setShowForm(true);
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
    setShowValidation(false);
    setShowForm(false);
  };

  const resetToUpload = () => {
    setShowValidation(false);
    setShowForm(false);
    setExtractedData(null);
  };

  return (
    <div className="max-w-lg mx-auto space-y-6 md:pt-14">
      <div>
        <h1 className="text-2xl font-medium">Crear desde foto</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Sube una imagen con los datos de la reservación
        </p>
      </div>

      {/* Step 1: Upload image */}
      {!showValidation && !showForm && (
        <>
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
                    onChange={handleFileInput}
                    className="hidden"
                  />
                </label>
              )}
            </CardContent>
          </Card>

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
                  Analizando imagen...
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4" />
                  Analizar y verificar
                </>
              )}
            </Button>
          )}

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
      )}

      {/* Step 2: Show validation results */}
      {showValidation && extractedData && validationResult && (
        <>
          {/* Extracted data summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Info className="w-4 h-4" />
                Información extraída
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-3 items-start">
                {image && (
                  <img
                    src={image}
                    alt="Imagen procesada"
                    className="w-20 h-20 object-cover rounded-md border"
                  />
                )}
                <div className="text-sm space-y-1 flex-1">
                  {extractedData.fecha && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Fecha:</span>
                      <span className="font-medium">{extractedData.fecha}</span>
                      {extractedData.dia_mencionado && (
                        <Badge variant="outline" className="text-xs">
                          dice "{extractedData.dia_mencionado}"
                        </Badge>
                      )}
                    </div>
                  )}
                  {(extractedData.horario_solicitado || extractedData.horario) && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Horario:</span>
                      <span className="font-medium">
                        {extractedData.horario_solicitado || extractedData.horario}
                      </span>
                      {extractedData.horario && extractedData.horario_solicitado && (
                        <Badge variant="secondary" className="text-xs">
                          → {extractedData.horario}
                        </Badge>
                      )}
                    </div>
                  )}
                  {extractedData.nombre_cliente && (
                    <div>
                      <span className="text-muted-foreground">Cliente:</span>{" "}
                      <span className="font-medium">{extractedData.nombre_cliente}</span>
                    </div>
                  )}
                  {extractedData.numero_personas && (
                    <div>
                      <span className="text-muted-foreground">Personas:</span>{" "}
                      <span className="font-medium">{extractedData.numero_personas}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Errors - blocking */}
          {validationResult.errors.length > 0 && (
            <Alert variant="destructive">
              <XCircle className="w-4 h-4" />
              <AlertTitle>No se puede agendar</AlertTitle>
              <AlertDescription>
                <ul className="list-disc list-inside text-sm mt-2 space-y-1">
                  {validationResult.errors.map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Warnings - non-blocking but important */}
          {validationResult.warnings.length > 0 && (
            <Alert className="border-yellow-500/50 bg-yellow-500/10">
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
              <AlertTitle className="text-yellow-700">Revisar antes de agendar</AlertTitle>
              <AlertDescription>
                <ul className="list-disc list-inside text-sm mt-2 space-y-1 text-yellow-800">
                  {validationResult.warnings.map((warning, i) => (
                    <li key={i}>{warning}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Success - all good */}
          {validationResult.canProceed && validationResult.warnings.length === 0 && (
            <Alert className="border-green-500/50 bg-green-500/10">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <AlertTitle className="text-green-700">¡Todo en orden!</AlertTitle>
              <AlertDescription className="text-green-800">
                La información fue verificada y no hay conflictos.
              </AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={resetToUpload}
              className="flex-1"
            >
              Subir otra imagen
            </Button>
            
            {validationResult.canProceed ? (
              <Button
                onClick={handleProceedToForm}
                className="flex-1 gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Continuar a agendar
              </Button>
            ) : (
              <Button
                variant="secondary"
                onClick={handleProceedToForm}
                className="flex-1 gap-2"
              >
                <AlertCircle className="w-4 h-4" />
                Editar datos manualmente
              </Button>
            )}
          </div>
        </>
      )}

      {/* Step 3: Edit and confirm form */}
      {showForm && extractedData && (
        <>
          <Card className="bg-secondary/30">
            <CardContent className="pt-4">
              <div className="flex gap-3 items-center">
                {image && (
                  <img
                    src={image}
                    alt="Imagen procesada"
                    className="w-12 h-12 object-cover rounded-md border"
                  />
                )}
                <div className="text-sm text-muted-foreground">
                  <p>Revisa y corrige los datos si es necesario</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div>
            <h2 className="text-lg font-medium mb-4">Confirmar reservación</h2>
            <ReservationForm
              initialData={getInitialFormData()}
              onSubmit={handleSubmit}
              onCancel={() => {
                setShowForm(false);
                setShowValidation(true);
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
