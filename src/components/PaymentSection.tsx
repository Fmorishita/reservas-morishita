import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CreditCard, Banknote, Building2, Check, X } from "lucide-react";
import { PaymentMethod, PAYMENT_METHODS, Reservation } from "@/types/reservation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PaymentSectionProps {
  reservation: Reservation;
  onUpdatePayment: (updates: {
    metodo_pago: PaymentMethod | null;
    monto_pagado: number | null;
    fecha_pago: string | null;
    notas_pago: string | null;
  }) => void;
  isUpdating?: boolean;
}

const paymentIcons: Record<PaymentMethod, React.ReactNode> = {
  Efectivo: <Banknote className="w-4 h-4" />,
  Tarjeta: <CreditCard className="w-4 h-4" />,
  Transferencia: <Building2 className="w-4 h-4" />,
};

export function PaymentSection({ reservation, onUpdatePayment, isUpdating }: PaymentSectionProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(
    reservation.metodo_pago as PaymentMethod | null
  );
  const [amount, setAmount] = useState<string>(
    reservation.monto_pagado?.toString() || ""
  );
  const [notes, setNotes] = useState(reservation.notas_pago || "");
  const [isEditing, setIsEditing] = useState(!reservation.metodo_pago);

  const isPaid = !!reservation.metodo_pago;

  const handleSave = () => {
    if (!selectedMethod) return;
    
    onUpdatePayment({
      metodo_pago: selectedMethod,
      monto_pagado: amount ? parseFloat(amount) : null,
      fecha_pago: new Date().toISOString(),
      notas_pago: notes || null,
    });
    setIsEditing(false);
  };

  const handleClear = () => {
    onUpdatePayment({
      metodo_pago: null,
      monto_pagado: null,
      fecha_pago: null,
      notas_pago: null,
    });
    setSelectedMethod(null);
    setAmount("");
    setNotes("");
    setIsEditing(true);
  };

  if (isPaid && !isEditing) {
    return (
      <div className="space-y-3 p-4 rounded-lg bg-success/10 border border-success/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5 text-success" />
            <span className="font-medium text-success">Pagado</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
            Editar
          </Button>
        </div>
        <div className="space-y-1 text-sm">
          <div className="flex items-center gap-2">
            {paymentIcons[reservation.metodo_pago as PaymentMethod]}
            <span>{reservation.metodo_pago}</span>
          </div>
          {reservation.monto_pagado && (
            <p className="text-muted-foreground">
              Monto: ${reservation.monto_pagado.toLocaleString("es-MX")}
            </p>
          )}
          {reservation.fecha_pago && (
            <p className="text-muted-foreground">
              Fecha: {format(new Date(reservation.fecha_pago), "d MMM yyyy, HH:mm", { locale: es })}
            </p>
          )}
          {reservation.notas_pago && (
            <p className="text-muted-foreground">Notas: {reservation.notas_pago}</p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={handleClear} className="w-full">
          Quitar pago
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 rounded-lg bg-muted/50 border border-border">
      <div className="flex items-center justify-between">
        <Label className="text-base font-medium">Registrar pago</Label>
        {!isPaid && (
          <Badge variant="outline" className="text-warning border-warning">
            Sin pagar
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
        <Label>Monto (opcional)</Label>
        <Input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          className="text-right"
        />
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label>Notas del pago (opcional)</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Referencia, comprobante, etc."
          rows={2}
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
          disabled={!selectedMethod || isUpdating}
          className="flex-1"
        >
          {isUpdating ? "Guardando..." : "Marcar como pagado"}
        </Button>
      </div>
    </div>
  );
}
