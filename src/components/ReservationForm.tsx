import { useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, User, Phone, FileText, AlertTriangle, MessageSquare, Utensils, Users, Clock } from "lucide-react";
import {
  Reservation,
  MENU_TYPES,
  RESERVATION_STATUSES,
  MenuType,
  ReservationStatus,
  ExtraSlot,
  getAvailableTimeSlots,
} from "@/types/reservation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const reservationSchema = z.object({
  fecha: z.date({ required_error: "Selecciona una fecha" }),
  horario: z.string().min(1, "Selecciona un horario"),
  numero_personas: z.number().min(1).max(4),
  nombre_cliente: z.string().min(1, "El nombre es requerido").max(100),
  whatsapp: z.string().max(20).optional().or(z.literal("")),
  tipo_menu: z.enum(["Omakase 12 tiempos"] as const),
  motivo_visita: z.string().max(200).optional().or(z.literal("")),
  alergias: z.string().max(500).optional().or(z.literal("")),
  estado: z.enum(["Pendiente", "Confirmada", "Cancelada", "Completada"] as const),
  notas_internas: z.string().max(500).optional().or(z.literal("")),
});

type FormData = z.infer<typeof reservationSchema>;

interface ReservationFormProps {
  initialData?: Partial<Reservation>;
  extraSlots?: ExtraSlot[];
  onSubmit: (data: FormData) => void;
  onCancel?: () => void;
  validationError?: string;
  isSubmitting?: boolean;
}

export function ReservationForm({
  initialData,
  extraSlots,
  onSubmit,
  onCancel,
  validationError,
  isSubmitting,
}: ReservationFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(reservationSchema),
    defaultValues: initialData
      ? {
          ...initialData,
          horario: initialData.horario,
          estado: initialData.estado as ReservationStatus,
          tipo_menu: initialData.tipo_menu as MenuType,
          whatsapp: initialData.whatsapp || "",
          motivo_visita: initialData.motivo_visita || "",
          alergias: initialData.alergias || "",
          notas_internas: initialData.notas_internas || "",
          fecha: initialData.fecha ? new Date(initialData.fecha + "T12:00:00") : undefined,
        }
      : {
          estado: "Pendiente",
          tipo_menu: "Omakase 12 tiempos",
          numero_personas: 2,
          motivo_visita: "",
          alergias: "",
          notas_internas: "",
          whatsapp: "",
        },
  });

  const selectedDate = watch("fecha");
  const selectedHorario = watch("horario");

  // Only allow weekends
  // Get available time slots based on selected date
  const availableSlots = useMemo(() => {
    if (!selectedDate) return getAvailableTimeSlots(new Date(), extraSlots);
    return getAvailableTimeSlots(selectedDate, extraSlots);
  }, [selectedDate, extraSlots]);

  // Clear horario if NOCHE is selected and date changes to Sunday
  useEffect(() => {
    if (selectedDate && selectedHorario === "NOCHE" && selectedDate.getDay() === 0) {
      setValue("horario", "");
    }
  }, [selectedDate, selectedHorario, setValue]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {validationError && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm flex items-start gap-3 animate-scale-in">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Date & Time Section */}
      <div className="space-y-4 p-4 rounded-xl bg-secondary/30 border border-border/50">
        <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <CalendarIcon className="w-4 h-4" />
          Fecha y horario
        </h3>
        
        {/* Date */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Fecha *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal h-12 bg-card border-border/50 hover:bg-secondary/50 hover:border-border transition-all duration-300",
                  !selectedDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-3 h-4 w-4 text-muted-foreground" />
                {selectedDate
                  ? format(selectedDate, "EEEE, d 'de' MMMM yyyy", { locale: es })
                  : "Seleccionar fecha"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 shadow-medium border-border/50" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setValue("fecha", date)}
                disabled={(date) => { const today = new Date(); today.setHours(0,0,0,0); return date < today; }}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
          {errors.fecha && (
            <p className="text-sm text-destructive">{errors.fecha.message}</p>
          )}
        </div>

        {/* Time slot */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Horario *</Label>
          <Select
            value={watch("horario")}
            onValueChange={(v) => setValue("horario", v)}
          >
            <SelectTrigger className="h-12 bg-card border-border/50 hover:bg-secondary/50 hover:border-border transition-all duration-300">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <SelectValue placeholder="Seleccionar horario" />
              </div>
            </SelectTrigger>
            <SelectContent className="shadow-medium border-border/50">
              {availableSlots.map(({ value, label }) => (
                <SelectItem key={value} value={value} className="py-3">
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.horario && (
            <p className="text-sm text-destructive">{errors.horario.message}</p>
          )}
        </div>

        {/* Number of guests */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Número de personas *</Label>
          <Select
            value={watch("numero_personas")?.toString()}
            onValueChange={(v) => setValue("numero_personas", parseInt(v))}
          >
            <SelectTrigger className="h-12 bg-card border-border/50 hover:bg-secondary/50 hover:border-border transition-all duration-300">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <SelectValue placeholder="Seleccionar" />
              </div>
            </SelectTrigger>
            <SelectContent className="shadow-medium border-border/50">
              {[1, 2, 3, 4].map((n) => (
                <SelectItem key={n} value={n.toString()} className="py-3">
                  {n} persona{n > 1 ? "s" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.numero_personas && (
            <p className="text-sm text-destructive">{errors.numero_personas.message}</p>
          )}
        </div>
      </div>

      {/* Client Info Section */}
      <div className="space-y-4 p-4 rounded-xl bg-secondary/30 border border-border/50">
        <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <User className="w-4 h-4" />
          Información del cliente
        </h3>

        {/* Client name */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Nombre completo *</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              {...register("nombre_cliente")} 
              placeholder="Nombre del cliente" 
              className="pl-10 h-12 bg-card border-border/50 focus:border-gold focus:ring-gold/20 transition-all duration-300"
            />
          </div>
          {errors.nombre_cliente && (
            <p className="text-sm text-destructive">{errors.nombre_cliente.message}</p>
          )}
        </div>

        {/* WhatsApp */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">WhatsApp</Label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              {...register("whatsapp")} 
              placeholder="+52 55 1234 5678" 
              className="pl-10 h-12 bg-card border-border/50 focus:border-gold focus:ring-gold/20 transition-all duration-300"
            />
          </div>
          {errors.whatsapp && (
            <p className="text-sm text-destructive">{errors.whatsapp.message}</p>
          )}
        </div>
      </div>

      {/* Menu & Details Section */}
      <div className="space-y-4 p-4 rounded-xl bg-secondary/30 border border-border/50">
        <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Utensils className="w-4 h-4" />
          Detalles de la reservación
        </h3>

        {/* Menu type */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Tipo de menú</Label>
          <Select
            value={watch("tipo_menu")}
            onValueChange={(v) => setValue("tipo_menu", v as MenuType)}
          >
            <SelectTrigger className="h-12 bg-card border-border/50 hover:bg-secondary/50 hover:border-border transition-all duration-300">
              <div className="flex items-center gap-2">
                <Utensils className="w-4 h-4 text-muted-foreground" />
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent className="shadow-medium border-border/50">
              {MENU_TYPES.map((type) => (
                <SelectItem key={type} value={type} className="py-3">
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Visit reason */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Motivo de la visita</Label>
          <div className="relative">
            <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              {...register("motivo_visita")}
              placeholder="Cumpleaños, aniversario, negocios..."
              className="pl-10 h-12 bg-card border-border/50 focus:border-gold focus:ring-gold/20 transition-all duration-300"
            />
          </div>
        </div>

        {/* Allergies */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Alergias y restricciones</Label>
          <Textarea
            {...register("alergias")}
            placeholder="Alergias, intolerancias, dieta especial..."
            rows={2}
            className="bg-card border-border/50 focus:border-gold focus:ring-gold/20 transition-all duration-300 resize-none"
          />
        </div>

        {/* Status */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Estado</Label>
          <Select
            value={watch("estado")}
            onValueChange={(v) => setValue("estado", v as ReservationStatus)}
          >
            <SelectTrigger className="h-12 bg-card border-border/50 hover:bg-secondary/50 hover:border-border transition-all duration-300">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="shadow-medium border-border/50">
              {RESERVATION_STATUSES.map((status) => (
                <SelectItem key={status} value={status} className="py-3">
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Internal notes */}
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Notas internas
          </Label>
          <Textarea
            {...register("notas_internas")}
            placeholder="Notas para el equipo..."
            rows={2}
            className="bg-card border-border/50 focus:border-gold focus:ring-gold/20 transition-all duration-300 resize-none"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        {onCancel && (
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel} 
            className="flex-1 h-12 border-border/50 hover:bg-secondary/50 transition-all duration-300"
          >
            Cancelar
          </Button>
        )}
        <Button 
          type="submit" 
          disabled={isSubmitting} 
          className="flex-1 h-12 gradient-gold text-primary-foreground hover:opacity-90 shadow-gold transition-all duration-300"
        >
          {isSubmitting ? "Guardando..." : initialData?.id ? "Guardar cambios" : "Crear reservación"}
        </Button>
      </div>
    </form>
  );
}
