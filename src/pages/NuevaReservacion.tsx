import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ReservationForm } from "@/components/ReservationForm";
import { useReservations } from "@/hooks/useReservations";
import { toast } from "@/hooks/use-toast";

export default function NuevaReservacion() {
  const navigate = useNavigate();
  const { addReservation, canAddReservation } = useReservations();
  const [validationError, setValidationError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (data: any) => {
    setValidationError("");
    const fecha = format(data.fecha, "yyyy-MM-dd");

    // Validate capacity
    const validation = canAddReservation(fecha, data.horario, data.numero_personas);
    if (!validation.allowed) {
      setValidationError(validation.reason);
      return;
    }

    setIsSubmitting(true);

    // Add reservation
    addReservation({
      ...data,
      fecha,
    });

    toast({
      title: "Reservación creada",
      description: `Reservación para ${data.nombre_cliente} guardada exitosamente.`,
    });

    navigate("/");
  };

  return (
    <div className="max-w-lg mx-auto space-y-6 md:pt-14">
      <h1 className="text-2xl font-medium">Nueva reservación</h1>
      <ReservationForm
        onSubmit={handleSubmit}
        onCancel={() => navigate("/")}
        validationError={validationError}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
