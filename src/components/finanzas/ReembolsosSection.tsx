import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Plus, Trash2, Banknote, ArrowDownToLine, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { formatoMoneda } from "@/lib/finanzas/formato";
import {
  AbonoReembolso,
  crearAbono,
  eliminarAbono,
  listarAbonosDeSemana,
} from "@/lib/finanzas/queries";
import { toast } from "@/hooks/use-toast";

interface SocioReembolsoProps {
  semanaId: string;
  beneficiario: "fran" | "veronica";
  nombre: string;
  totalReembolso: number;
  abonos: AbonoReembolso[];
  onAbonoCreado: (abono: AbonoReembolso) => void;
  onAbonoEliminado: (id: string) => void;
}

const metodoIcons = {
  efectivo: <Banknote className="w-3.5 h-3.5" />,
  transferencia: <ArrowDownToLine className="w-3.5 h-3.5" />,
};

function SocioReembolso({
  semanaId,
  beneficiario,
  nombre,
  totalReembolso,
  abonos,
  onAbonoCreado,
  onAbonoEliminado,
}: SocioReembolsoProps) {
  const [mostrarForm, setMostrarForm] = useState(false);
  const [mostrarAbonos, setMostrarAbonos] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [eliminando, setEliminando] = useState<string | null>(null);

  // Form state
  const [monto, setMonto] = useState("");
  const [metodo, setMetodo] = useState<"efectivo" | "transferencia">("efectivo");
  const [descripcion, setDescripcion] = useState("");
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));

  const totalAbonado = abonos
    .filter((a) => a.beneficiario === beneficiario)
    .reduce((s, a) => s + Number(a.monto), 0);
  const pendiente = Math.max(0, totalReembolso - totalAbonado);
  const pct = totalReembolso > 0 ? Math.min(100, (totalAbonado / totalReembolso) * 100) : 0;
  const abonosSocio = abonos.filter((a) => a.beneficiario === beneficiario);

  const handleGuardar = async () => {
    const montoNum = parseFloat(monto);
    if (!isFinite(montoNum) || montoNum <= 0) {
      toast({ title: "Monto inválido", description: "Ingresa un monto mayor a 0", variant: "destructive" });
      return;
    }
    setGuardando(true);
    try {
      const nuevo = await crearAbono({
        semana_id: semanaId,
        beneficiario,
        monto: montoNum,
        metodo,
        descripcion: descripcion.trim() || null,
        fecha,
      });
      onAbonoCreado(nuevo);
      setMonto("");
      setDescripcion("");
      setMostrarForm(false);
      toast({ title: "Abono registrado", description: `${formatoMoneda(montoNum)} a ${nombre}` });
    } catch {
      toast({ title: "Error", description: "No se pudo guardar el abono", variant: "destructive" });
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = async (id: string) => {
    setEliminando(id);
    try {
      await eliminarAbono(id);
      onAbonoEliminado(id);
      toast({ title: "Abono eliminado" });
    } catch {
      toast({ title: "Error", description: "No se pudo eliminar", variant: "destructive" });
    } finally {
      setEliminando(null);
    }
  };

  const completado = pendiente <= 0;

  return (
    <div className={cn(
      "rounded-xl border p-4 space-y-3",
      completado ? "border-emerald-500/30 bg-emerald-500/5" : "border-border bg-card"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold">{nombre}</p>
          <p className="text-xs text-muted-foreground">
            Total a reembolsar: {formatoMoneda(totalReembolso)}
          </p>
        </div>
        <div className="text-right">
          {completado ? (
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
              ✓ Completado
            </span>
          ) : (
            <div>
              <p className="text-sm font-bold text-destructive">{formatoMoneda(pendiente)}</p>
              <p className="text-xs text-muted-foreground">pendiente</p>
            </div>
          )}
        </div>
      </div>

      {/* Barra de progreso */}
      {totalReembolso > 0 && (
        <div className="space-y-1">
          <div className="h-2 rounded-full bg-secondary overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                completado ? "bg-emerald-500" : "bg-amber-500"
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>Pagado: {formatoMoneda(totalAbonado)}</span>
            <span>{pct.toFixed(0)}%</span>
          </div>
        </div>
      )}

      {/* Abonos registrados */}
      {abonosSocio.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setMostrarAbonos((s) => !s)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {mostrarAbonos ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {abonosSocio.length} abono{abonosSocio.length > 1 ? "s" : ""} registrado{abonosSocio.length > 1 ? "s" : ""}
          </button>

          {mostrarAbonos && (
            <ul className="mt-2 space-y-1.5">
              {abonosSocio.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between gap-2 rounded-md bg-secondary/40 px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-muted-foreground">
                        {format(new Date(a.fecha + "T12:00:00"), "d MMM", { locale: es })}
                      </span>
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        {metodoIcons[a.metodo]}
                        {a.metodo === "efectivo" ? "Efectivo" : "Transferencia"}
                      </span>
                      {a.descripcion && (
                        <span className="text-muted-foreground truncate">· {a.descripcion}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-medium">{formatoMoneda(Number(a.monto))}</span>
                    <button
                      type="button"
                      onClick={() => handleEliminar(a.id)}
                      disabled={eliminando === a.id}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Formulario para agregar abono */}
      {mostrarForm ? (
        <div className="space-y-3 p-3 rounded-lg bg-secondary/30 border border-border">
          <p className="text-sm font-medium">Agregar abono</p>

          {/* Monto */}
          <div className="space-y-1">
            <Label className="text-xs">Monto</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <Input
                type="number"
                inputMode="decimal"
                min="0"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                placeholder={pendiente.toFixed(2)}
                className="pl-7 text-right"
                autoFocus
              />
            </div>
          </div>

          {/* Método */}
          <div className="space-y-1">
            <Label className="text-xs">Método</Label>
            <div className="grid grid-cols-2 gap-2">
              {(["efectivo", "transferencia"] as const).map((m) => (
                <Button
                  key={m}
                  type="button"
                  size="sm"
                  variant={metodo === m ? "default" : "outline"}
                  className="flex items-center gap-1.5"
                  onClick={() => setMetodo(m)}
                >
                  {metodoIcons[m]}
                  {m === "efectivo" ? "Efectivo" : "Transferencia"}
                </Button>
              ))}
            </div>
          </div>

          {/* Descripción */}
          <div className="space-y-1">
            <Label className="text-xs">Descripción (opcional)</Label>
            <Input
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder={metodo === "transferencia" ? "Ej: Cobro Cohete" : "Ej: Efectivo de caja"}
            />
          </div>

          {/* Fecha */}
          <div className="space-y-1">
            <Label className="text-xs">Fecha</Label>
            <Input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
          </div>

          {/* Acciones */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => { setMostrarForm(false); setMonto(""); setDescripcion(""); }}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              className="flex-1"
              onClick={handleGuardar}
              disabled={guardando || !monto}
            >
              {guardando ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </div>
      ) : (
        !completado && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full gap-1.5"
            onClick={() => setMostrarForm(true)}
          >
            <Plus className="w-3.5 h-3.5" />
            Agregar abono
          </Button>
        )
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

interface ReembolsosSectionProps {
  semanaId: string | null;
  reembolsoFran: number;
  reembolsoVeronica: number;
}

export function ReembolsosSection({
  semanaId,
  reembolsoFran,
  reembolsoVeronica,
}: ReembolsosSectionProps) {
  const [abonos, setAbonos] = useState<AbonoReembolso[]>([]);
  const [cargando, setCargando] = useState(false);

  const cargar = useCallback(async () => {
    if (!semanaId) return;
    setCargando(true);
    try {
      const data = await listarAbonosDeSemana(semanaId);
      setAbonos(data);
    } finally {
      setCargando(false);
    }
  }, [semanaId]);

  useEffect(() => { cargar(); }, [cargar]);

  const handleCreado = (abono: AbonoReembolso) => setAbonos((prev) => [...prev, abono]);
  const handleEliminado = (id: string) => setAbonos((prev) => prev.filter((a) => a.id !== id));

  if (reembolsoFran === 0 && reembolsoVeronica === 0) return null;
  if (!semanaId) {
    // Sin semana creada aún — solo mostrar totales
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Reembolsos pendientes</h3>
        <p className="text-xs text-muted-foreground">
          No hay semana activa para registrar abonos.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">Reembolsos pendientes</h3>
      {cargando ? (
        <p className="text-xs text-muted-foreground py-2">Cargando...</p>
      ) : (
        <div className="space-y-3">
          {reembolsoFran > 0 && (
            <SocioReembolso
              semanaId={semanaId}
              beneficiario="fran"
              nombre="Fran"
              totalReembolso={reembolsoFran}
              abonos={abonos}
              onAbonoCreado={handleCreado}
              onAbonoEliminado={handleEliminado}
            />
          )}
          {reembolsoVeronica > 0 && (
            <SocioReembolso
              semanaId={semanaId}
              beneficiario="veronica"
              nombre="Verónica"
              totalReembolso={reembolsoVeronica}
              abonos={abonos}
              onAbonoCreado={handleCreado}
              onAbonoEliminado={handleEliminado}
            />
          )}
        </div>
      )}
    </div>
  );
}
