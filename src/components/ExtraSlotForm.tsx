import { useState, useMemo, useEffect } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { TimeSlot, TIME_SLOTS, getAvailableTimeSlots } from "@/types/reservation";
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

interface ExtraSlotFormProps {
  onSubmit: (data: {
    fecha: string;
    horario: TimeSlot;
    motivo: string | null;
  }) => void;
  isSubmitting?: boolean;
}

export function ExtraSlotForm({ onSubmit, isSubmitting }: ExtraSlotFormProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [horario, setHorario] = useState<TimeSlot | "">("");
  const [motivo, setMotivo] = useState("");

  const isWeekend = (date: Date) => {
    const day = date.getDay();
    return day === 0 || day === 6;
  };

  // Get slots that are NOT normally available for the selected date
  const unavailableSlots = useMemo(() => {
    if (!selectedDate) return [];
    const available = getAvailableTimeSlots(selectedDate);
    return TIME_SLOTS.filter(slot => !available.some(a => a.value === slot.value));
  }, [selectedDate]);

  // Reset horario when date changes
  useEffect(() => {
    setHorario("");
  }, [selectedDate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !horario) return;

    onSubmit({
      fecha: format(selectedDate, "yyyy-MM-dd"),
      horario: horario as TimeSlot,
      motivo: motivo || null,
    });

    setSelectedDate(undefined);
    setHorario("");
    setMotivo("");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
              onSelect={setSelectedDate}
              disabled={(date) => !isWeekend(date)}
              initialFocus
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-2">
        <Label>Horario extra *</Label>
        {selectedDate && unavailableSlots.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Todos los horarios ya están disponibles este día.
          </p>
        ) : (
          <Select value={horario} onValueChange={(v) => setHorario(v as TimeSlot)}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar horario" />
            </SelectTrigger>
            <SelectContent>
              {unavailableSlots.map(({ value, label }) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="space-y-2">
        <Label>Motivo (opcional)</Label>
        <Textarea
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Evento especial, demanda alta..."
          rows={2}
        />
      </div>

      <Button
        type="submit"
        disabled={!selectedDate || !horario || isSubmitting}
        className="w-full"
      >
        {isSubmitting ? "Guardando..." : "Agregar horario extra"}
      </Button>
    </form>
  );
}
