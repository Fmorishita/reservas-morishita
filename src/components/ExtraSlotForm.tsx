import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface ExtraSlotFormProps {
  onSubmit: (data: {
    fecha: string;
    horario: string;
    motivo: string | null;
  }) => void;
  isSubmitting?: boolean;
}

export function ExtraSlotForm({ onSubmit, isSubmitting }: ExtraSlotFormProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [horario, setHorario] = useState("");
  const [motivo, setMotivo] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !horario) return;

    onSubmit({
      fecha: format(selectedDate, "yyyy-MM-dd"),
      horario,
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
              initialFocus
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-2">
        <Label>Hora *</Label>
        <Input
          type="time"
          value={horario}
          onChange={(e) => setHorario(e.target.value)}
          required
        />
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
