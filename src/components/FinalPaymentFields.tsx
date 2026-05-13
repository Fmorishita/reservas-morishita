import { CreditCard, Banknote, Building2, Info } from "lucide-react";
import {
  PaymentMethod,
  PAYMENT_METHODS,
  CobradoPor,
  TipoTarjeta,
} from "@/types/reservation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface FinalPaymentFieldsValue {
  metodo: PaymentMethod | null;
  cobradoPor: CobradoPor | null;
  tipoTarjeta: TipoTarjeta | null;
  propinaMode: "porcentaje" | "monto";
  propinaInput: string; // raw input text
}

export interface FinalPaymentFieldsProps {
  base: number; // base esperada (numero_personas × 925)
  value: FinalPaymentFieldsValue;
  onChange: (next: FinalPaymentFieldsValue) => void;
}

export const COHETE_FEE_RATE = 0.1406;

export const paymentIcons: Record<PaymentMethod, React.ReactNode> = {
  Efectivo: <Banknote className="w-4 h-4" />,
  Transferencia: <Building2 className="w-4 h-4" />,
  Terminal: <CreditCard className="w-4 h-4" />,
};

export function computePropinaMonto(value: FinalPaymentFieldsValue, base: number): number {
  const raw = parseFloat(value.propinaInput);
  if (!isFinite(raw) || raw < 0) return 0;
  if (value.propinaMode === "porcentaje") {
    return Math.round(base * (raw / 100) * 100) / 100;
  }
  return Math.round(raw * 100) / 100;
}

export function computeTotal(value: FinalPaymentFieldsValue, base: number): number {
  return Math.round((base + computePropinaMonto(value, base)) * 100) / 100;
}

export function isValid(value: FinalPaymentFieldsValue): boolean {
  if (!value.metodo) return false;
  if (value.metodo === "Efectivo" && !value.cobradoPor) return false;
  if (value.metodo === "Terminal" && !value.tipoTarjeta) return false;
  return true;
}

const QUICK_TIPS = [0, 10, 15, 20];

export function FinalPaymentFields({ base, value, onChange }: FinalPaymentFieldsProps) {
  const propinaMonto = computePropinaMonto(value, base);
  const total = computeTotal(value, base);
  const coheteFee =
    value.metodo === "Terminal"
      ? Math.round(total * COHETE_FEE_RATE * 100) / 100
      : 0;
  const neto = total - coheteFee;

  const set = (patch: Partial<FinalPaymentFieldsValue>) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-5">
      {/* Método */}
      <div className="space-y-2">
        <Label className="text-sm">Método de pago</Label>
        <div className="grid grid-cols-3 gap-2">
          {PAYMENT_METHODS.map((m) => (
            <Button
              key={m}
              type="button"
              variant={value.metodo === m ? "default" : "outline"}
              className={cn(
                "flex flex-col items-center gap-1 h-auto py-3",
                value.metodo === m && "bg-primary text-primary-foreground"
              )}
              onClick={() =>
                set({
                  metodo: m,
                  // reset sub-fields cuando cambia método
                  cobradoPor: m === "Efectivo" ? value.cobradoPor : null,
                  tipoTarjeta: m === "Terminal" ? value.tipoTarjeta : null,
                })
              }
            >
              {paymentIcons[m]}
              <span className="text-xs">{m}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Sub-campo condicional */}
      {value.metodo === "Efectivo" && (
        <div className="space-y-2">
          <Label className="text-sm">¿Quién cobró?</Label>
          <div className="grid grid-cols-2 gap-2">
            {(["veronica", "fran"] as CobradoPor[]).map((p) => (
              <Button
                key={p}
                type="button"
                variant={value.cobradoPor === p ? "default" : "outline"}
                onClick={() => set({ cobradoPor: p })}
                className={cn(
                  value.cobradoPor === p && "bg-primary text-primary-foreground"
                )}
              >
                {p === "veronica" ? "Verónica" : "Fran"}
              </Button>
            ))}
          </div>
        </div>
      )}

      {value.metodo === "Transferencia" && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/60 border border-border text-sm">
          <Info className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
          <span className="text-muted-foreground">
            Transferencia a la cuenta <strong className="text-foreground">Nu de Fran</strong>.
          </span>
        </div>
      )}

      {value.metodo === "Terminal" && (
        <div className="space-y-2">
          <Label className="text-sm">Tipo de tarjeta</Label>
          <div className="grid grid-cols-2 gap-2">
            {(["credito", "debito"] as TipoTarjeta[]).map((t) => (
              <Button
                key={t}
                type="button"
                variant={value.tipoTarjeta === t ? "default" : "outline"}
                onClick={() => set({ tipoTarjeta: t })}
                className={cn(
                  value.tipoTarjeta === t && "bg-primary text-primary-foreground"
                )}
              >
                {t === "credito" ? "Crédito" : "Débito"}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Propina */}
      {value.metodo && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm">Propina</Label>
            <div className="flex rounded-md overflow-hidden border border-border">
              <button
                type="button"
                onClick={() => set({ propinaMode: "porcentaje" })}
                className={cn(
                  "px-3 py-1 text-xs font-medium transition-colors",
                  value.propinaMode === "porcentaje"
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-muted-foreground hover:bg-muted"
                )}
              >
                %
              </button>
              <button
                type="button"
                onClick={() => set({ propinaMode: "monto" })}
                className={cn(
                  "px-3 py-1 text-xs font-medium transition-colors border-l border-border",
                  value.propinaMode === "monto"
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-muted-foreground hover:bg-muted"
                )}
              >
                $
              </button>
            </div>
          </div>
          <Input
            type="number"
            inputMode="decimal"
            min="0"
            value={value.propinaInput}
            onChange={(e) => set({ propinaInput: e.target.value })}
            placeholder={value.propinaMode === "porcentaje" ? "0" : "0.00"}
            className="text-right"
          />
          {value.propinaMode === "porcentaje" && (
            <div className="flex flex-wrap gap-1.5">
              {QUICK_TIPS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => set({ propinaInput: q.toString() })}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-xs border transition-colors",
                    value.propinaInput === q.toString()
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:bg-muted"
                  )}
                >
                  {q}%
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Resumen */}
      {value.metodo && (
        <div className="space-y-1.5 p-3 rounded-lg bg-secondary/40 border border-border">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Base</span>
            <span>${base.toLocaleString("es-MX")}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Propina</span>
            <span>${propinaMonto.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className="flex items-center justify-between text-base font-medium pt-1 border-t border-border/60">
            <span>Total cobrado</span>
            <span>${total.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          {value.metodo === "Terminal" && (
            <>
              <div className="flex items-center justify-between text-xs text-destructive pt-1">
                <span>Cohete (14.06%)</span>
                <span>−${coheteFee.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex items-center justify-between text-sm font-medium text-success">
                <span>Neto</span>
                <span>${neto.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
