import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { TimeSlot, TIME_SLOTS } from "@/types/reservation";
import { Button } from "@/components/ui/button";
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

interface BlockFormProps {
  onSubmit: (data: {
    fecha: string;
    horario: TimeSlot | "DIA_COMPLETO";
    motivo_bloqueo: string;
  }) => void;
  isSubmitting?: boolean;
}

export function BlockForm({ onSubmit, isSubmitting }: BlockFormProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [horario, setHorario] = useState<TimeSlot | "DIA_COMPLETO">("DIA_COMPLETO");
  const [motivo, setMotivo] = useState("");

  // Only allow weekends
  const isWeekend = (date: Date) => {
    const day = date.getDay();
    return day === 0 || day === 6;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate) return;

    onSubmit({
      fecha: format(selectedDate, "yyyy-MM-dd"),
      horario,
      motivo_bloqueo: motivo,
    });

    // Reset form
    setSelectedDate(undefined);
    setHorario("DIA_COMPLETO");
    setMotivo("");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Date */}
      <div className="space-y-2">
        <Label>Fecha a bloquear *</Label>
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
              onSelect={setSelectedDate}
              disabled={(date) => !isWeekend(date)}
              initialFocus
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Time slot */}
      <div className="space-y-2">
        <Label>Horario a bloquear</Label>
        <Select value={horario} onValueChange={(v) => setHorario(v as TimeSlot | "DIA_COMPLETO")}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="DIA_COMPLETO">Día completo</SelectItem>
            {TIME_SLOTS.map(({ value, label }) => (
              <SelectItem key={value} value={value}>
                Solo {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Reason */}
      <div className="space-y-2">
        <Label>Motivo del bloqueo</Label>
        <Textarea
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Evento privado, mantenimiento, vacaciones..."
          rows={2}
        />
      </div>

      {/* Submit */}
      <Button type="submit" disabled={!selectedDate || isSubmitting} className="w-full">
        {isSubmitting ? "Guardando..." : "Bloquear horario"}
      </Button>
    </form>
  );
}
