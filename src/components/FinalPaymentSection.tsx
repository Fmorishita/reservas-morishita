import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CreditCard, Banknote, Building2, Check, Loader2 } from "lucide-react";
import { PaymentMethod, PAYMENT_METHODS, Reservation } from "@/types/reservation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface FinalPaymentSectionProps {
  reservation: Reservation;
  onUpdateFinalPayment: (updates: {
    metodo_pago_final: PaymentMethod | null;
    monto_final_pagado: number | null;
    fecha_pago_final: string | null;
  }) => void;
  isUpdating?: boolean;
}

const paymentIcons: Record<PaymentMethod, React.ReactNode> = {
  Efectivo: <Banknote className="w-4 h-4" />,
  Terminal: <CreditCard className="w-4 h-4" />,
  Transferencia: <Building2 className="w-4 h-4" />,
};

export function FinalPaymentSection({
  reservation,
  onUpdateFinalPayment,
  isUpdating,
}: FinalPaymentSectionProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(
    reservation.metodo_pago_final as PaymentMethod | null
  );
  const [amount, setAmount] = useState<string>(
    reservation.monto_final_pagado?.toString() || ""
  );
  const [isEditing, setIsEditing] = useState(!reservation.metodo_pago_final);

  const isPaid = !!reservation.metodo_pago_final;
  const expectedFinal = (reservation.numero_personas || 1) * 925;

  const hasValidAmount = amount && parseFloat(amount) > 0;
  const canSave = selectedMethod && hasValidAmount;

  const handleSave = () => {
    if (!selectedMethod) return;
    onUpdateFinalPayment({
      metodo_pago_final: selectedMethod,
      monto_final_pagado: amount ? parseFloat(amount) : null,
      fecha_pago_final: new Date().toISOString(),
    });
    setIsEditing(false);
  };

  const handleClear = () => {
    onUpdateFinalPayment({
      metodo_pago_final: null,
      monto_final_pagado: null,
      fecha_pago_final: null,
    });
    setSelectedMethod(null);
    setAmount("");
    setIsEditing(true);
  };

  const handleUseExpected = () => {
    setAmount(expectedFinal.toString());
  };

  if (isPaid && !isEditing) {
    return (
      <div className="space-y-3 p-4 rounded-lg bg-success/10 border border-success/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5 text-success" />
            <span className="font-medium text-success">Pago final completado (50%)</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
            Editar
          </Button>
        </div>
        <div className="space-y-1 text-sm">
          <div className="flex items-center gap-2">
            {paymentIcons[reservation.metodo_pago_final as PaymentMethod]}
            <span>{reservation.metodo_pago_final}</span>
          </div>
          {reservation.monto_final_pagado && (
            <p className="text-muted-foreground">
              Monto: ${reservation.monto_final_pagado.toLocaleString("es-MX")}
            </p>
          )}
          {reservation.fecha_pago_final && (
            <p className="text-muted-foreground">
              Fecha: {format(new Date(reservation.fecha_pago_final), "d MMM yyyy, HH:mm", { locale: es })}
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

      {/* Payment method selector */}
      <div className="grid grid-cols-3 gap-2">
        {PAYMENT_METHODS.map((method) => (
          <Button
            key={method}
            type="button"
            variant={selectedMethod === method ? "default" : "outline"}
            className={cn(
              "flex flex-col items-center gap-1 h-auto py-3",
              selectedMethod === method && "bg-primary text-primary-foreground"
            )}
            onClick={() => setSelectedMethod(method)}
          >
            {paymentIcons[method]}
            <span className="text-xs">{method}</span>
          </Button>
        ))}
      </div>

      {/* Amount input */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Monto (requerido)</Label>
          {amount !== expectedFinal.toString() && (
            <Button
              type="button"
              variant="link"
              size="sm"
              onClick={handleUseExpected}
              className="h-auto py-0 px-2 text-xs"
            >
              Usar ${expectedFinal.toLocaleString("es-MX")}
            </Button>
          )}
        </div>
        <Input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder={expectedFinal.toString()}
          className={cn(
            "text-right",
            !hasValidAmount && selectedMethod && "border-warning"
          )}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {isPaid && (
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsEditing(false)}
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
