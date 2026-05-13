import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CreditCard, Banknote, Building2, Check, Loader2 } from "lucide-react";
import {
  PaymentMethod,
  Reservation,
  CobradoPor,
  TipoTarjeta,
} from "@/types/reservation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  FinalPaymentFields,
  FinalPaymentFieldsValue,
  computePropinaMonto,
  computeTotal,
  isValid,
} from "@/components/FinalPaymentFields";

export interface FinalPaymentUpdates {
  metodo_pago_final: PaymentMethod | null;
  monto_final_pagado: number | null;
  fecha_pago_final: string | null;
  cobrado_por_final: CobradoPor | null;
  tipo_tarjeta_final: TipoTarjeta | null;
  propina_final: number | null;
}

interface FinalPaymentSectionProps {
  reservation: Reservation;
  onUpdateFinalPayment: (updates: FinalPaymentUpdates) => void;
  isUpdating?: boolean;
}

const paymentIcons: Record<PaymentMethod, React.ReactNode> = {
  Efectivo: <Banknote className="w-4 h-4" />,
  Terminal: <CreditCard className="w-4 h-4" />,
  Transferencia: <Building2 className="w-4 h-4" />,
};

function inferPropinaState(reservation: Reservation, base: number): FinalPaymentFieldsValue {
  const propina = reservation.propina_final ?? 0;
  const pct = base > 0 ? Math.round((propina / base) * 100) : 0;
  // Si el % calculado es entero limpio, mostrar en modo %; si no, en monto
  const isCleanPct = base > 0 && Math.abs(base * (pct / 100) - propina) < 0.01;
  return {
    metodo: (reservation.metodo_pago_final as PaymentMethod | null) ?? null,
    cobradoPor: reservation.cobrado_por_final ?? null,
    tipoTarjeta: reservation.tipo_tarjeta_final ?? null,
    propinaMode: isCleanPct ? "porcentaje" : "monto",
    propinaInput:
      propina === 0
        ? ""
        : isCleanPct
        ? pct.toString()
        : propina.toString(),
  };
}

export function FinalPaymentSection({
  reservation,
  onUpdateFinalPayment,
  isUpdating,
}: FinalPaymentSectionProps) {
  const expectedFinal = (reservation.numero_personas || 1) * 925;
  const [isEditing, setIsEditing] = useState(!reservation.metodo_pago_final);
  const [value, setValue] = useState<FinalPaymentFieldsValue>(() =>
    inferPropinaState(reservation, expectedFinal)
  );

  const isPaid = !!reservation.metodo_pago_final;
  const canSave = isValid(value);

  const handleSave = () => {
    if (!value.metodo) return;
    const propina = computePropinaMonto(value, expectedFinal);
    const total = computeTotal(value, expectedFinal);
    onUpdateFinalPayment({
      metodo_pago_final: value.metodo,
      monto_final_pagado: total,
      fecha_pago_final:
        reservation.fecha_pago_final || new Date().toISOString(),
      cobrado_por_final: value.metodo === "Efectivo" ? value.cobradoPor : null,
      tipo_tarjeta_final: value.metodo === "Terminal" ? value.tipoTarjeta : null,
      propina_final: propina,
    });
    setIsEditing(false);
  };

  const handleClear = () => {
    onUpdateFinalPayment({
      metodo_pago_final: null,
      monto_final_pagado: null,
      fecha_pago_final: null,
      cobrado_por_final: null,
      tipo_tarjeta_final: null,
      propina_final: null,
    });
    setValue({
      metodo: null,
      cobradoPor: null,
      tipoTarjeta: null,
      propinaMode: "porcentaje",
      propinaInput: "",
    });
    setIsEditing(true);
  };

  if (isPaid && !isEditing) {
    return (
      <div className="space-y-3 p-4 rounded-lg bg-success/10 border border-success/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5 text-success" />
            <span className="font-medium text-success">Pago final completado (50%)</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setValue(inferPropinaState(reservation, expectedFinal));
              setIsEditing(true);
            }}
          >
            Editar
          </Button>
        </div>
        <div className="space-y-1 text-sm">
          <div className="flex items-center gap-2">
            {paymentIcons[reservation.metodo_pago_final as PaymentMethod]}
            <span>{reservation.metodo_pago_final}</span>
            {reservation.metodo_pago_final === "Terminal" && reservation.tipo_tarjeta_final && (
              <span className="text-xs text-muted-foreground">
                · {reservation.tipo_tarjeta_final === "credito" ? "Crédito" : "Débito"}
              </span>
            )}
          </div>
          {reservation.metodo_pago_final === "Efectivo" && reservation.cobrado_por_final && (
            <p className="text-muted-foreground">
              Cobrado por: {reservation.cobrado_por_final === "veronica" ? "Verónica" : "Fran"}
            </p>
          )}
          {reservation.monto_final_pagado != null && (
            <p className="text-muted-foreground">
              Monto: ${reservation.monto_final_pagado.toLocaleString("es-MX")}
            </p>
          )}
          {reservation.propina_final != null && reservation.propina_final > 0 && (
            <p className="text-muted-foreground">
              Propina: $
              {reservation.propina_final.toLocaleString("es-MX", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          )}
          {reservation.fecha_pago_final && (
            <p className="text-muted-foreground">
              Fecha:{" "}
              {format(new Date(reservation.fecha_pago_final), "d MMM yyyy, HH:mm", {
                locale: es,
              })}
            </p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={handleClear} className="w-full">
          Quitar pago final
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 rounded-lg bg-muted/50 border border-border">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-base font-medium">Pago final (50%)</Label>
          <p className="text-xs text-muted-foreground">
            Esperado: ${expectedFinal.toLocaleString("es-MX")}
          </p>
        </div>
        {!isPaid && (
          <Badge variant="outline" className="text-warning border-warning">
            Pendiente
          </Badge>
        )}
      </div>

      <FinalPaymentFields base={expectedFinal} value={value} onChange={setValue} />

      <div className="flex gap-2">
        {isPaid && (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setValue(inferPropinaState(reservation, expectedFinal));
              setIsEditing(false);
            }}
            className="flex-1"
          >
            Cancelar
          </Button>
        )}
        <Button
          type="button"
          onClick={handleSave}
          disabled={!canSave || isUpdating}
          className="flex-1"
        >
          {isUpdating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Guardando...
            </>
          ) : (
            "Guardar pago final"
          )}
        </Button>
      </div>
    </div>
  );
}
