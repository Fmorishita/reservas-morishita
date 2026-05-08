import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { crearIngresoSitio } from "@/lib/finanzas/queries";

const schema = z.object({
  fecha: z.string().min(1, "Fecha requerida"),
  monto: z.coerce.number().positive("El monto debe ser positivo"),
  metodo: z.enum(["efectivo", "transferencia", "terminal"]),
  descripcion: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface IngresoFormProps {
  semanaId: string;
}

export function IngresoForm({ semanaId }: IngresoFormProps) {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      fecha: new Date().toISOString().slice(0, 10),
      metodo: "efectivo",
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      await crearIngresoSitio({
        semana_id: semanaId,
        ...data,
        descripcion: data.descripcion || null,
      });
      toast.success("Ingreso registrado");
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

      {/* Método de pago */}
      <div className="space-y-1.5">
        <Label>Método de pago</Label>
        <Select defaultValue="efectivo" onValueChange={(v) => setValue("metodo", v as FormData["metodo"])}>
          <SelectTrigger className="h-12">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="efectivo">Efectivo</SelectItem>
            <SelectItem value="transferencia">Transferencia</SelectItem>
            <SelectItem value="terminal">Terminal (tarjeta)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Fecha */}
      <div className="space-y-1.5">
        <Label htmlFor="fecha">Fecha</Label>
        <Input id="fecha" type="date" className="h-12" {...register("fecha")} />
        {errors.fecha && <p className="text-xs text-destructive">{errors.fecha.message}</p>}
      </div>

      {/* Descripción */}
      <div className="space-y-1.5">
        <Label htmlFor="descripcion">Descripción (opcional)</Label>
        <Textarea
          id="descripcion"
          placeholder="Walk-in, pago del resto de reserva, etc."
          {...register("descripcion")}
        />
      </div>

      <Button type="submit" className="w-full h-14 text-base" disabled={isSubmitting}>
        {isSubmitting ? "Guardando…" : "Registrar ingreso"}
      </Button>
    </form>
  );
}
