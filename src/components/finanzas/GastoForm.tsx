import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SubirTicket } from "./SubirTicket";
import { crearGasto } from "@/lib/finanzas/queries";
import type { DatosTicket } from "@/lib/finanzas/ocr";

const schema = z.object({
  fecha: z.string().min(1, "Fecha requerida"),
  monto: z.coerce.number().positive("El monto debe ser positivo"),
  tipo: z.enum(["insumos", "publicidad", "operacion"]),
  pagado_por: z.enum(["fran", "veronica", "empresa"]),
  origen_dinero: z.enum(["personal", "caja_negocio", "fondo_acumulado"]),
  descripcion: z.string().min(1, "Descripción requerida"),
  proveedor: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

type OrigenCombo = "empresa_caja" | "empresa_fondo" | "personal_fran" | "personal_veronica";

function mapOrigen(combo: OrigenCombo): { pagado_por: FormData["pagado_por"]; origen_dinero: FormData["origen_dinero"] } {
  switch (combo) {
    case "empresa_caja":      return { pagado_por: "empresa",   origen_dinero: "caja_negocio" };
    case "empresa_fondo":     return { pagado_por: "empresa",   origen_dinero: "fondo_acumulado" };
    case "personal_fran":     return { pagado_por: "fran",      origen_dinero: "personal" };
    case "personal_veronica": return { pagado_por: "veronica",  origen_dinero: "personal" };
  }
}

interface GastoFormProps {
  semanaId: string;
}

export function GastoForm({ semanaId }: GastoFormProps) {
  const navigate = useNavigate();
  const [origenCombo, setOrigenCombo] = useState<OrigenCombo>("empresa_caja");
  const [ticketUrl, setTicketUrl] = useState<string>("");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      fecha: new Date().toISOString().slice(0, 10),
      tipo: "insumos",
      pagado_por: "empresa",
      origen_dinero: "caja_negocio",
    },
  });

  const handleOcr = (datos: DatosTicket) => {
    if (datos.monto && datos.monto > 0) {
      setValue("monto", datos.monto, { shouldValidate: true });
    }
    if (datos.proveedor) {
      setValue("proveedor", datos.proveedor, { shouldValidate: true });
    }
    if (datos.descripcion) {
      setValue("descripcion", datos.descripcion, { shouldValidate: true });
    }
    if (datos.fecha) {
      setValue("fecha", datos.fecha, { shouldValidate: true });
    }
    if (datos.tipo) {
      setValue("tipo", datos.tipo, { shouldValidate: true });
    }
  };

  const onInvalid = (errs: typeof errors) => {
    const faltantes: string[] = [];
    if (errs.monto) faltantes.push("Monto");
    if (errs.descripcion) faltantes.push("Descripción");
    if (errs.fecha) faltantes.push("Fecha");
    if (errs.tipo) faltantes.push("Tipo de gasto");
    toast.error(
      faltantes.length
        ? `Falta llenar: ${faltantes.join(", ")}`
        : "Revisa los campos del formulario",
    );
  };

  const handleOrigenChange = (value: string) => {
    const combo = value as OrigenCombo;
    setOrigenCombo(combo);
    const { pagado_por, origen_dinero } = mapOrigen(combo);
    setValue("pagado_por", pagado_por);
    setValue("origen_dinero", origen_dinero);
  };

  const onSubmit = async (data: FormData) => {
    try {
      await crearGasto({
        semana_id: semanaId,
        ...data,
        foto_ticket_url: ticketUrl || null,
      });
      toast.success("Gasto registrado");
      navigate("/finanzas");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al guardar";
      toast.error(msg);
    }
  };

  const esPersonal = origenCombo === "personal_fran" || origenCombo === "personal_veronica";

  return (
    <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-5">
      {/* Monto */}
      <div className="space-y-1.5">
        <Label htmlFor="monto">Monto ($)</Label>
        <Input
          id="monto"
          type="number"
          inputMode="decimal"
          step="0.01"
          placeholder="0.00"
          className="text-2xl h-14 font-semibold"
          {...register("monto")}
        />
        {errors.monto && <p className="text-xs text-destructive">{errors.monto.message}</p>}
      </div>

      {/* Descripción */}
      <div className="space-y-1.5">
        <Label htmlFor="descripcion">Descripción</Label>
        <Input id="descripcion" placeholder="¿En qué se gastó?" {...register("descripcion")} />
        {errors.descripcion && <p className="text-xs text-destructive">{errors.descripcion.message}</p>}
      </div>

      {/* Tipo de gasto */}
      <div className="space-y-1.5">
        <Label>Tipo de gasto</Label>
        <Select
          value={watch("tipo")}
          onValueChange={(v) => setValue("tipo", v as FormData["tipo"], { shouldValidate: true })}
        >
          <SelectTrigger className="h-12">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="insumos">Insumos / Ingredientes</SelectItem>
            <SelectItem value="publicidad">Publicidad / Marketing</SelectItem>
            <SelectItem value="operacion">Operación (otros)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Origen del dinero — selector único */}
      <div className="space-y-1.5">
        <Label>¿Con qué dinero se pagó?</Label>
        <Select defaultValue="empresa_caja" onValueChange={handleOrigenChange}>
          <SelectTrigger className="h-12">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="empresa_caja">Caja del negocio</SelectItem>
            <SelectItem value="empresa_fondo">Fondo acumulado</SelectItem>
            <SelectItem value="personal_fran">Personal Fran (reembolso automático)</SelectItem>
            <SelectItem value="personal_veronica">Personal Verónica (reembolso automático)</SelectItem>
          </SelectContent>
        </Select>
        {esPersonal && (
          <p className="text-xs text-amber-600">
            Este gasto generará un reembolso para{" "}
            {origenCombo === "personal_fran" ? "Francisco" : "Verónica"} al hacer el corte semanal.
          </p>
        )}
      </div>

      {/* Fecha */}
      <div className="space-y-1.5">
        <Label htmlFor="fecha">Fecha</Label>
        <Input id="fecha" type="date" className="h-12" {...register("fecha")} />
        {errors.fecha && <p className="text-xs text-destructive">{errors.fecha.message}</p>}
      </div>

      {/* Proveedor (opcional) */}
      <div className="space-y-1.5">
        <Label htmlFor="proveedor">Proveedor (opcional)</Label>
        <Input id="proveedor" placeholder="Mercado, Amazon, etc." {...register("proveedor")} />
      </div>

      {/* Foto del ticket */}
      <SubirTicket semanaId={semanaId} onSubido={setTicketUrl} onOcr={handleOcr} />

      <Button type="submit" className="w-full h-14 text-base" disabled={isSubmitting}>
        {isSubmitting ? "Guardando…" : "Registrar gasto"}
      </Button>
    </form>
  );
}
