import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Reservation, PaymentMethod, CobradoPor, TipoTarjeta } from "@/types/reservation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  FinalPaymentFields,
  FinalPaymentFieldsValue,
  computePropinaMonto,
  computeTotal,
  isValid,
} from "@/components/FinalPaymentFields";

export interface CompletarReservaPayload {
  metodo_pago_final: PaymentMethod;
  monto_final_pagado: number;
  fecha_pago_final: string;
  cobrado_por_final: CobradoPor | null;
  tipo_tarjeta_final: TipoTarjeta | null;
  propina_final: number;
}

interface CompletarReservaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reservation: Reservation;
  onConfirm: (payload: CompletarReservaPayload) => Promise<void>;
}

export function CompletarReservaModal({
  open,
  onOpenChange,
  reservation,
  onConfirm,
}: CompletarReservaModalProps) {
  const base = (reservation.numero_personas || 1) * 925;

  const [value, setValue] = useState<FinalPaymentFieldsValue>({
    metodo: null,
    cobradoPor: null,
    tipoTarjeta: null,
    propinaMode: "porcentaje",
    propinaInput: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  const canSave = isValid(value);

  const handleSave = async () => {
    if (!canSave || !value.metodo) return;
    const propina = computePropinaMonto(value, base);
    const total = computeTotal(value, base);
    setIsSaving(true);
    try {
      await onConfirm({
        metodo_pago_final: value.metodo,
        monto_final_pagado: total,
        fecha_pago_final: new Date().toISOString(),
        cobrado_por_final: value.metodo === "Efectivo" ? value.cobradoPor : null,
        tipo_tarjeta_final: value.metodo === "Terminal" ? value.tipoTarjeta : null,
        propina_final: propina,
      });
      // Reset
      setValue({
        metodo: null,
        cobradoPor: null,
        tipoTarjeta: null,
        propinaMode: "porcentaje",
        propinaInput: "",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !isSaving && onOpenChange(o)}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar pago final</DialogTitle>
          <DialogDescription>
            {reservation.nombre_cliente} · {reservation.numero_personas}{" "}
            persona{reservation.numero_personas > 1 ? "s" : ""} · Base esperada $
            {base.toLocaleString("es-MX")}
          </DialogDescription>
        </DialogHeader>

        <FinalPaymentFields base={base} value={value} onChange={setValue} />

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={!canSave || isSaving}
            className="flex-1"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              "Guardar y completar"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
