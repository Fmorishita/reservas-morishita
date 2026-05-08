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

interface GastoFormProps {
  semanaId: string;
}

export function GastoForm({ semanaId }: GastoFormProps) {
  const navigate = useNavigate();
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

  const pagadoPor = watch("pagado_por");
  const [ticketUrl, setTicketUrl] = useState<string>("");

  const onSubmit = async (data: FormData) => {
    // Constraint: empresa no puede pagar con dinero personal
    if (data.pagado_por === "empresa" && data.origen_dinero === "personal") {
      toast.error("Si pagó la empresa, el origen no puede ser 'personal'");
      return;
    }
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

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
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
        <Select defaultValue="insumos" onValueChange={(v) => setValue("tipo", v as FormData["tipo"])}>
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

      {/* Pagado por */}
      <div className="space-y-1.5">
        <Label>Pagado por</Label>
        <Select defaultValue="empresa" onValueChange={(v) => setValue("pagado_por", v as FormData["pagado_por"])}>
          <SelectTrigger className="h-12">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fran">Francisco (Fran)</SelectItem>
            <SelectItem value="veronica">Verónica</SelectItem>
            <SelectItem value="empresa">Empresa / Caja</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Origen del dinero */}
      <div className="space-y-1.5">
        <Label>Origen del dinero</Label>
        <Select
          defaultValue="caja_negocio"
          onValueChange={(v) => setValue("origen_dinero", v as FormData["origen_dinero"])}
        >
          <SelectTrigger className="h-12">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {pagadoPor !== "empresa" && (
              <SelectItem value="personal">Personal (genera reembolso)</SelectItem>
            )}
            <SelectItem value="caja_negocio">Caja del negocio</SelectItem>
            <SelectItem value="fondo_acumulado">Fondo acumulado</SelectItem>
          </SelectContent>
        </Select>
        {pagadoPor !== "empresa" && (
          <p className="text-xs text-amber-600">
            Si el origen es "personal", se generará un reembolso para ese socio.
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
      <SubirTicket semanaId={semanaId} onSubido={setTicketUrl} />

      <Button type="submit" className="w-full h-14 text-base" disabled={isSubmitting}>
        {isSubmitting ? "Guardando…" : "Registrar gasto"}
      </Button>
    </form>
  );
}
