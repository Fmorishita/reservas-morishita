import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import { ReservationForm } from "@/components/ReservationForm";
import { useReservations } from "@/hooks/useReservations";
import { toast } from "@/hooks/use-toast";

export default function EditarReservacion() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { reservations, updateReservation, canAddReservation } = useReservations();
  const [validationError, setValidationError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleSubmit = (data: any) => {
    setValidationError("");
    const fecha = format(data.fecha, "yyyy-MM-dd");

    // Validate capacity (excluding current reservation)
    const validation = canAddReservation(fecha, data.horario, data.numero_personas, reservation.id);
    if (!validation.allowed) {
      setValidationError(validation.reason);
      return;
    }

    setIsSubmitting(true);

    // Update reservation
    updateReservation(reservation.id, {
      ...data,
      fecha,
    });

    toast({
      title: "Reservación actualizada",
      description: `Los cambios han sido guardados.`,
    });

    navigate("/");
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
