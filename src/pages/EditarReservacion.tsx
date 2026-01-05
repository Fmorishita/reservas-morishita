import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { ReservationForm } from "@/components/ReservationForm";
import { useReservations } from "@/hooks/useReservations";
import { toast } from "@/hooks/use-toast";

export default function EditarReservacion() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { reservations, isLoading, updateReservation, canAddReservation } = useReservations();
  const [validationError, setValidationError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 md:pt-14">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const reservation = reservations.find((r) => r.id === id);

  if (!reservation) {
    return (
      <div className="max-w-lg mx-auto text-center py-12 md:pt-14">
        <h1 className="text-xl font-medium mb-4">Reservación no encontrada</h1>
        <button onClick={() => navigate("/")} className="text-accent hover:underline">
          Volver a la agenda
        </button>
      </div>
    );
  }

  const handleSubmit = async (data: any) => {
    setValidationError("");
    const fecha = format(data.fecha, "yyyy-MM-dd");

    // Validate capacity (excluding current reservation)
    const validation = canAddReservation(fecha, data.horario, data.numero_personas, reservation.id);
    if (!validation.allowed) {
      setValidationError(validation.reason);
      return;
    }

    setIsSubmitting(true);

    try {
      await updateReservation(reservation.id, {
        ...data,
        fecha,
        whatsapp: data.whatsapp || null,
        motivo_visita: data.motivo_visita || null,
        alergias: data.alergias || null,
        notas_internas: data.notas_internas || null,
      });

      toast({
        title: "Reservación actualizada",
        description: `Los cambios han sido guardados.`,
      });

      navigate("/");
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar la reservación",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6 md:pt-14">
      <h1 className="text-2xl font-medium">Editar reservación</h1>
      <ReservationForm
        initialData={reservation}
        onSubmit={handleSubmit}
        onCancel={() => navigate("/")}
        validationError={validationError}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
