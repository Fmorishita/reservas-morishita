import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import {
  Reservation,
  TimeSlot,
  TIME_SLOTS,
  MENU_TYPES,
  RESERVATION_STATUSES,
  MenuType,
  ReservationStatus,
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
  horario: z.enum(["COMIDA", "TARDE", "CENA"] as const, {
    required_error: "Selecciona un horario",
  }),
  numero_personas: z.number().min(1).max(4),
  nombre_cliente: z.string().min(1, "El nombre es requerido").max(100),
  whatsapp: z.string().max(20).optional().or(z.literal("")),
  tipo_menu: z.enum(["Omakase 12 tiempos", "Omakase Libre"] as const),
  motivo_visita: z.string().max(200).optional().or(z.literal("")),
  alergias: z.string().max(500).optional().or(z.literal("")),
  estado: z.enum(["Pendiente", "Confirmada", "Cancelada", "Completada"] as const),
  notas_internas: z.string().max(500).optional().or(z.literal("")),
});

type FormData = z.infer<typeof reservationSchema>;

interface ReservationFormProps {
  initialData?: Partial<Reservation>;
  onSubmit: (data: FormData) => void;
  onCancel?: () => void;
  validationError?: string;
  isSubmitting?: boolean;
}

export function ReservationForm({
  initialData,
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
          horario: initialData.horario as TimeSlot,
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

  // Only allow weekends
  const isWeekend = (date: Date) => {
    const day = date.getDay();
    return day === 0 || day === 6;
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {validationError && (
        <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
          {validationError}
        </div>
      )}

      {/* Date */}
      <div className="space-y-2">
        <Label>Fecha *</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !selectedDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {selectedDate
                ? format(selectedDate, "EEEE, d 'de' MMMM yyyy", { locale: es })
                : "Seleccionar fecha"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setValue("fecha", date)}
              disabled={(date) => !isWeekend(date) || date < new Date()}
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
        <Label>Horario *</Label>
        <Select
          value={watch("horario")}
          onValueChange={(v) => setValue("horario", v as TimeSlot)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar horario" />
          </SelectTrigger>
          <SelectContent>
            {TIME_SLOTS.map(({ value, label }) => (
              <SelectItem key={value} value={value}>
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
        <Label>Número de personas *</Label>
        <Select
          value={watch("numero_personas")?.toString()}
          onValueChange={(v) => setValue("numero_personas", parseInt(v))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar" />
          </SelectTrigger>
          <SelectContent>
            {[1, 2, 3, 4].map((n) => (
              <SelectItem key={n} value={n.toString()}>
                {n} persona{n > 1 ? "s" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.numero_personas && (
          <p className="text-sm text-destructive">{errors.numero_personas.message}</p>
        )}
      </div>

      {/* Client name */}
      <div className="space-y-2">
        <Label>Nombre completo *</Label>
        <Input {...register("nombre_cliente")} placeholder="Nombre del cliente" />
        {errors.nombre_cliente && (
          <p className="text-sm text-destructive">{errors.nombre_cliente.message}</p>
        )}
      </div>

      {/* WhatsApp */}
      <div className="space-y-2">
        <Label>WhatsApp</Label>
        <Input {...register("whatsapp")} placeholder="+52 55 1234 5678" />
        {errors.whatsapp && (
          <p className="text-sm text-destructive">{errors.whatsapp.message}</p>
        )}
      </div>

      {/* Menu type */}
      <div className="space-y-2">
        <Label>Tipo de menú</Label>
        <Select
          value={watch("tipo_menu")}
          onValueChange={(v) => setValue("tipo_menu", v as MenuType)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MENU_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Visit reason */}
      <div className="space-y-2">
        <Label>Motivo de la visita</Label>
        <Input
          {...register("motivo_visita")}
          placeholder="Cumpleaños, aniversario, negocios..."
        />
      </div>

      {/* Allergies */}
      <div className="space-y-2">
        <Label>Alergias y restricciones</Label>
        <Textarea
          {...register("alergias")}
          placeholder="Alergias, intolerancias, dieta especial..."
          rows={2}
        />
      </div>

      {/* Status */}
      <div className="space-y-2">
        <Label>Estado</Label>
        <Select
          value={watch("estado")}
          onValueChange={(v) => setValue("estado", v as ReservationStatus)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RESERVATION_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Internal notes */}
      <div className="space-y-2">
        <Label>Notas internas</Label>
        <Textarea
          {...register("notas_internas")}
          placeholder="Notas para el equipo..."
          rows={2}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting} className="flex-1">
          {isSubmitting ? "Guardando..." : initialData?.id ? "Guardar cambios" : "Crear reservación"}
        </Button>
      </div>
    </form>
  );
}
