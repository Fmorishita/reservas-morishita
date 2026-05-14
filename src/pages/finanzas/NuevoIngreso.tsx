import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { IngresoForm } from "@/components/finanzas/IngresoForm";
import { obtenerOCrearSemanaActual, obtenerOCrearSemanaParaFecha } from "@/lib/finanzas/queries";
import { rangoSemana } from "@/lib/finanzas/formato";

export default function NuevoIngreso() {
  const [searchParams] = useSearchParams();
  const inicioParam = searchParams.get("inicio");

  const { data: semana, isLoading, error } = useQuery({
    queryKey: ["finanzas-semana", inicioParam ?? "actual"],
    queryFn: inicioParam
      ? () => obtenerOCrearSemanaParaFecha(new Date(inicioParam + "T12:00:00"))
      : obtenerOCrearSemanaActual,
    staleTime: 60_000,
  });

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/finanzas" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold">Nuevo ingreso</h1>
          {semana && (
            <p className="text-xs text-muted-foreground">
              {rangoSemana(semana.fecha_inicio, semana.fecha_fin)}
            </p>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive text-center py-8">
          Error al cargar la semana. Intenta de nuevo.
        </p>
      )}

      {semana && <IngresoForm semanaId={semana.id} />}
    </div>
  );
}
