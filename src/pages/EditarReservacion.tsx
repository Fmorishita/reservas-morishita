import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Loader2, Trash2 } from "lucide-react";
import { ReservationForm } from "@/components/ReservationForm";
import { PaymentSection } from "@/components/PaymentSection";
import { FinalPaymentSection, FinalPaymentUpdates } from "@/components/FinalPaymentSection";
import { CompletarReservaModal, CompletarReservaPayload } from "@/components/CompletarReservaModal";
import { useReservations } from "@/hooks/useReservations";
import { toast } from "@/hooks/use-toast";
import { PaymentMethod } from "@/types/reservation";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function EditarReservacion() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { reservations, isLoading, updateReservation, deleteReservation, canAddReservation, extraSlots } = useReservations();
  const [validationError, setValidationError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUpdatingPayment, setIsUpdatingPayment] = useState(false);
  const [isUpdatingFinalPayment, setIsUpdatingFinalPayment] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showCompletarModal, setShowCompletarModal] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<any | null>(null);

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

    // Si el usuario está marcando la reserva como Completada por primera vez y
    // todavía no ha registrado el pago final → abrir modal en lugar de guardar.
    const wasCompletada = reservation.estado === "Completada";
    const nowCompletada = data.estado === "Completada";
    const hasFinalPayment = !!reservation.metodo_pago_final;
    if (nowCompletada && !wasCompletada && !hasFinalPayment) {
      setPendingFormData({
        ...data,
        fecha,
        whatsapp: data.whatsapp || null,
        motivo_visita: data.motivo_visita || null,
        alergias: data.alergias || null,
        notas_internas: data.notas_internas || null,
      });
      setShowCompletarModal(true);
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

  const handleUpdatePayment = async (updates: {
    metodo_pago: PaymentMethod | null;
    monto_pagado: number | null;
    fecha_pago: string | null;
    notas_pago: string | null;
    ticket_imagen_url: string | null;
  }) => {
    setIsUpdatingPayment(true);
    try {
      await updateReservation(reservation.id, updates);
      toast({
        title: updates.metodo_pago ? "Anticipo registrado" : "Anticipo eliminado",
        description: updates.metodo_pago
          ? `Se registró el anticipo con ${updates.metodo_pago}`
          : "Se eliminó el registro del anticipo",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el anticipo",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingPayment(false);
    }
  };

  const handleUpdateFinalPayment = async (updates: FinalPaymentUpdates) => {
    setIsUpdatingFinalPayment(true);
    try {
      await updateReservation(reservation.id, updates);
      toast({
        title: updates.metodo_pago_final ? "Pago final registrado" : "Pago final eliminado",
        description: updates.metodo_pago_final
          ? `Se registró el pago final con ${updates.metodo_pago_final}`
          : "Se eliminó el registro del pago final",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el pago final",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingFinalPayment(false);
    }
  };

  const handleConfirmCompletar = async (payload: CompletarReservaPayload) => {
    if (!pendingFormData) return;
    setIsSubmitting(true);
    try {
      await updateReservation(reservation.id, {
        ...pendingFormData,
        ...payload,
      });
      toast({
        title: "Reservación completada",
        description: `Se registró el pago final con ${payload.metodo_pago_final}`,
      });
      setShowCompletarModal(false);
      setPendingFormData(null);
      navigate("/");
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo completar la reservación",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteReservation(reservation.id);
      toast({
        title: "Reservación eliminada",
        description: `Se eliminó la reservación de ${reservation.nombre_cliente}`,
      });
      navigate("/lista");
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar la reservación",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6 md:pt-14 pb-24">
      <h1 className="text-2xl font-medium">Editar reservación</h1>

      <PaymentSection
        reservation={reservation}
        onUpdatePayment={handleUpdatePayment}
        isUpdating={isUpdatingPayment}
      />

      <FinalPaymentSection
        reservation={reservation}
        onUpdateFinalPayment={handleUpdateFinalPayment}
        isUpdating={isUpdatingFinalPayment}
      />

      <Separator />
      
      <ReservationForm
        initialData={reservation}
        extraSlots={extraSlots}
        onSubmit={handleSubmit}
        onCancel={() => navigate("/")}
        validationError={validationError}
        isSubmitting={isSubmitting}
      />

      <Separator />

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 gap-2"
            disabled={isDeleting}
          >
            {isDeleting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            Eliminar reservación
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar reservación?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará permanentemente la reservación de{" "}
              <strong>{reservation.nombre_cliente}</strong> del{" "}
              {format(new Date(reservation.fecha + "T12:00:00"), "d 'de' MMMM", { locale: es })}.
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sí, eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CompletarReservaModal
        open={showCompletarModal}
        onOpenChange={(o) => {
          setShowCompletarModal(o);
          if (!o) setPendingFormData(null);
        }}
        reservation={reservation}
        onConfirm={handleConfirmCompletar}
      />
    </div>
  );
}
