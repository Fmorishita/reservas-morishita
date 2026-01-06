import { useState, useRef, useCallback } from "react";
import { Upload, FileText, AlertCircle, CheckCircle, Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { TimeSlot, MENU_TYPES } from "@/types/reservation";
import { format, parse, isValid } from "date-fns";
import { es } from "date-fns/locale";

interface ImportCSVModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (reservations: ParsedReservation[]) => Promise<unknown>;
}

interface ParsedReservation {
  fecha: string;
  horario: TimeSlot;
  nombre_cliente: string;
  whatsapp: string | null;
  numero_personas: number;
  tipo_menu: string;
  estado: string;
  alergias: string | null;
  motivo_visita: string | null;
  metodo_pago: string | null;
  monto_pagado: number | null;
  fecha_pago: string | null;
  ticket_imagen_url: string | null;
  notas_internas: string | null;
  notas_pago: string | null;
}

interface ValidationError {
  row: number;
  message: string;
}

// Flexible time slot mappings
const TIME_SLOT_MAPPINGS: Record<string, TimeSlot> = {
  "1:00 pm": "COMIDA",
  "1:00 PM": "COMIDA",
  "1:00PM": "COMIDA",
  "13:00": "COMIDA",
  "COMIDA": "COMIDA",
  "comida": "COMIDA",
  "Comida": "COMIDA",
  "3:30 pm": "TARDE",
  "3:30 PM": "TARDE",
  "3:30PM": "TARDE",
  "15:30": "TARDE",
  "TARDE": "TARDE",
  "tarde": "TARDE",
  "Tarde": "TARDE",
  "6:00 pm": "CENA",
  "6:00 PM": "CENA",
  "6:00PM": "CENA",
  "18:00": "CENA",
  "CENA": "CENA",
  "cena": "CENA",
  "Cena": "CENA",
};

type ModalState = "idle" | "parsing" | "preview" | "importing";

export function ImportCSVModal({ open, onOpenChange, onImport }: ImportCSVModalProps) {
  const [state, setState] = useState<ModalState>("idle");
  const [validReservations, setValidReservations] = useState<ParsedReservation[]>([]);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setState("idle");
    setValidReservations([]);
    setErrors([]);
    setIsDragOver(false);
  };

  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  const parseCSV = (content: string): string[][] => {
    const lines = content.split(/\r?\n/).filter((line) => line.trim());
    return lines.map((line) => {
      const result: string[] = [];
      let current = "";
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if ((char === "," || char === ";") && !inQuotes) {
          result.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    });
  };

  const parseDate = (dateStr: string): string | null => {
    // Clean the string
    const cleanDate = dateStr.trim();
    
    // Try numeric formats first (without locale)
    const numericFormats = [
      "yyyy-MM-dd",
      "dd/MM/yyyy",
      "d/M/yyyy",
      "MM/dd/yyyy",
      "dd-MM-yyyy",
    ];

    for (const fmt of numericFormats) {
      const parsed = parse(cleanDate, fmt, new Date());
      if (isValid(parsed)) {
        return format(parsed, "yyyy-MM-dd");
      }
    }

    // Try Spanish date formats with locale
    const spanishFormats = [
      "EEEE d 'de' MMMM 'de' yyyy",  // "Sábado 3 de enero de 2026"
      "EEEE, d 'de' MMMM 'de' yyyy", // "Sábado, 3 de enero de 2026"
      "d 'de' MMMM 'de' yyyy",        // "3 de enero de 2026"
      "d 'de' MMMM, yyyy",            // "3 de enero, 2026"
      "d 'de' MMMM yyyy",             // "3 de enero 2026"
    ];

    for (const fmt of spanishFormats) {
      try {
        const parsed = parse(cleanDate, fmt, new Date(), { locale: es });
        if (isValid(parsed)) {
          return format(parsed, "yyyy-MM-dd");
        }
      } catch {
        // Continue with next format
      }
    }

    return null;
  };

  const parseTimeSlot = (timeStr: string): TimeSlot | null => {
    const normalized = timeStr.trim();
    return TIME_SLOT_MAPPINGS[normalized] || null;
  };

  const processFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast({
        title: "Error",
        description: "Por favor selecciona un archivo CSV",
        variant: "destructive",
      });
      return;
    }

    setState("parsing");

    try {
      const content = await file.text();
      const rows = parseCSV(content);

      if (rows.length < 2) {
        toast({
          title: "Error",
          description: "El archivo está vacío o no contiene datos",
          variant: "destructive",
        });
        setState("idle");
        return;
      }

      const headers = rows[0].map((h) => h.toLowerCase().trim());
      const dataRows = rows.slice(1);

      // Find column indices
      const findColumn = (names: string[]) => {
        return headers.findIndex((h) => names.some((n) => h.includes(n)));
      };

      const colFecha = findColumn(["fecha"]);
      const colHorario = findColumn(["horario", "hora", "time"]);
      const colNombre = findColumn(["nombre", "cliente", "name"]);
      const colWhatsapp = findColumn(["whatsapp", "telefono", "phone", "tel"]);
      const colPersonas = findColumn(["personas", "people", "pax", "guests"]);
      const colMenu = findColumn(["menu", "menú"]);
      const colEstado = findColumn(["estado", "status"]);
      const colAlergias = findColumn(["alergias", "allergies"]);
      const colMotivo = findColumn(["motivo", "reason"]);
      const colMetodoPago = findColumn(["método de pago", "metodo de pago", "payment"]);
      const colMontoPagado = findColumn(["monto", "amount", "pagado"]);
      const colFechaPago = findColumn(["fecha de pago", "fecha pago", "payment date"]);
      const colTicket = findColumn(["ticket", "url ticket"]);
      const colNotasInternas = findColumn(["notas internas", "internal notes"]);
      const colNotasPago = findColumn(["notas de pago", "payment notes", "notas pago"]);

      // Validate required columns
      if (colFecha === -1 || colHorario === -1 || colNombre === -1 || colPersonas === -1) {
        toast({
          title: "Error",
          description: "El archivo debe tener las columnas: Fecha, Horario, Nombre, Personas",
          variant: "destructive",
        });
        setState("idle");
        return;
      }

      const valid: ParsedReservation[] = [];
      const errs: ValidationError[] = [];

      dataRows.forEach((row, index) => {
        const rowNum = index + 2; // +2 for header and 0-index

        // Parse date
        const fechaStr = row[colFecha]?.trim();
        const fecha = fechaStr ? parseDate(fechaStr) : null;
        if (!fecha) {
          errs.push({ row: rowNum, message: `Fecha inválida: "${fechaStr}"` });
          return;
        }

        // Parse time slot
        const horarioStr = row[colHorario]?.trim();
        const horario = horarioStr ? parseTimeSlot(horarioStr) : null;
        if (!horario) {
          errs.push({ row: rowNum, message: `Horario no reconocido: "${horarioStr}"` });
          return;
        }

        // Parse name
        const nombre = row[colNombre]?.trim();
        if (!nombre) {
          errs.push({ row: rowNum, message: "Falta el nombre del cliente" });
          return;
        }

        // Parse personas
        const personasStr = row[colPersonas]?.trim();
        const personas = parseInt(personasStr, 10);
        if (isNaN(personas) || personas < 1 || personas > 4) {
          errs.push({ row: rowNum, message: `Número de personas inválido: "${personasStr}"` });
          return;
        }

        // Parse optional fields
        const whatsapp = colWhatsapp !== -1 ? row[colWhatsapp]?.trim() || null : null;
        const menu = colMenu !== -1 ? row[colMenu]?.trim() || MENU_TYPES[0] : MENU_TYPES[0];
        const estado = colEstado !== -1 ? row[colEstado]?.trim() || "Confirmada" : "Confirmada";
        const alergias = colAlergias !== -1 ? row[colAlergias]?.trim() || null : null;
        const motivo = colMotivo !== -1 ? row[colMotivo]?.trim() || null : null;
        const metodoPago = colMetodoPago !== -1 ? (row[colMetodoPago]?.trim() === "Sin pagar" ? null : row[colMetodoPago]?.trim() || null) : null;
        const montoPagadoStr = colMontoPagado !== -1 ? row[colMontoPagado]?.trim() : null;
        const montoPagado = montoPagadoStr ? parseFloat(montoPagadoStr.replace(/[,$]/g, "")) : null;
        const fechaPago = colFechaPago !== -1 ? row[colFechaPago]?.trim() || null : null;
        const ticket = colTicket !== -1 ? row[colTicket]?.trim() || null : null;
        const notasInternas = colNotasInternas !== -1 ? row[colNotasInternas]?.trim() || null : null;
        const notasPago = colNotasPago !== -1 ? row[colNotasPago]?.trim() || null : null;

        valid.push({
          fecha,
          horario,
          nombre_cliente: nombre,
          whatsapp,
          numero_personas: personas,
          tipo_menu: menu,
          estado,
          alergias,
          motivo_visita: motivo,
          metodo_pago: metodoPago,
          monto_pagado: montoPagado,
          fecha_pago: fechaPago,
          ticket_imagen_url: ticket,
          notas_internas: notasInternas,
          notas_pago: notasPago,
        });
      });

      setValidReservations(valid);
      setErrors(errs);
      setState("preview");
    } catch (error) {
      console.error("Error parsing CSV:", error);
      toast({
        title: "Error",
        description: "Error al procesar el archivo",
        variant: "destructive",
      });
      setState("idle");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      processFile(file);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleImport = async () => {
    setState("importing");
    try {
      await onImport(validReservations);
      toast({
        title: "Importación exitosa",
        description: `Se importaron ${validReservations.length} reservaciones`,
      });
      handleClose();
    } catch (error) {
      console.error("Error importing:", error);
      toast({
        title: "Error",
        description: "Error al importar las reservaciones",
        variant: "destructive",
      });
      setState("preview");
    }
  };

  const downloadTemplate = () => {
    const headers = ["Fecha", "Horario", "Nombre", "WhatsApp", "Personas", "Menú", "Estado", "Alergias", "Motivo"];
    const example = ["2026-01-15", "1:00 pm", "Juan Pérez", "+521234567890", "2", "Omakase 12 tiempos", "Confirmada", "", "Cumpleaños"];
    const csvContent = [headers.join(","), example.join(",")].join("\n");
    
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "plantilla_reservaciones.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const TIME_SLOT_LABELS: Record<TimeSlot, string> = {
    COMIDA: "1:00 pm",
    TARDE: "3:30 pm",
    CENA: "6:00 pm",
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Importar Reservaciones</DialogTitle>
          <DialogDescription>
            Carga un archivo CSV con tus reservaciones históricas
          </DialogDescription>
        </DialogHeader>

        {state === "idle" && (
          <div className="space-y-4">
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                ${isDragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}
              `}
            >
              <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm font-medium">Arrastra un archivo CSV aquí</p>
              <p className="text-xs text-muted-foreground mt-1">o haz clic para seleccionar</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            <div className="text-center space-y-2">
              <p className="text-xs text-muted-foreground">
                Columnas requeridas: Fecha, Horario, Nombre, Personas
              </p>
              <Button variant="ghost" size="sm" onClick={downloadTemplate} className="gap-2">
                <Download className="w-4 h-4" />
                Descargar plantilla
              </Button>
            </div>
          </div>
        )}

        {state === "parsing" && (
          <div className="py-8 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Procesando archivo...</p>
          </div>
        )}

        {state === "preview" && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              {validReservations.length > 0 && (
                <div className="flex items-center gap-2 text-success">
                  <CheckCircle className="w-5 h-5" />
                  <span className="text-sm font-medium">{validReservations.length} listas para importar</span>
                </div>
              )}
              {errors.length > 0 && (
                <div className="flex items-center gap-2 text-warning">
                  <AlertCircle className="w-5 h-5" />
                  <span className="text-sm font-medium">{errors.length} con errores</span>
                </div>
              )}
            </div>

            {errors.length > 0 && (
              <ScrollArea className="h-32 rounded-md border p-3">
                <div className="space-y-2">
                  {errors.slice(0, 10).map((err, i) => (
                    <div key={i} className="text-xs text-muted-foreground flex gap-2">
                      <Badge variant="outline" className="text-warning border-warning shrink-0">
                        Fila {err.row}
                      </Badge>
                      <span>{err.message}</span>
                    </div>
                  ))}
                  {errors.length > 10 && (
                    <p className="text-xs text-muted-foreground">
                      ...y {errors.length - 10} errores más
                    </p>
                  )}
                </div>
              </ScrollArea>
            )}

            {validReservations.length > 0 && (
              <>
                <p className="text-sm text-muted-foreground">Vista previa:</p>
                <ScrollArea className="h-40 rounded-md border">
                  <div className="p-3 space-y-2">
                    {validReservations.slice(0, 5).map((res, i) => (
                      <div key={i} className="flex items-center justify-between text-sm p-2 rounded bg-muted/50">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                          <span className="truncate">{res.nombre_cliente}</span>
                        </div>
                        <div className="text-xs text-muted-foreground shrink-0">
                          {format(new Date(res.fecha), "d MMM", { locale: es })} · {TIME_SLOT_LABELS[res.horario]} · {res.numero_personas}p
                        </div>
                      </div>
                    ))}
                    {validReservations.length > 5 && (
                      <p className="text-xs text-muted-foreground text-center py-2">
                        ...y {validReservations.length - 5} más
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={resetState} className="flex-1">
                Cancelar
              </Button>
              <Button 
                onClick={handleImport} 
                disabled={validReservations.length === 0}
                className="flex-1"
              >
                Importar {validReservations.length}
              </Button>
            </div>
          </div>
        )}

        {state === "importing" && (
          <div className="py-8 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Importando reservaciones...</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
