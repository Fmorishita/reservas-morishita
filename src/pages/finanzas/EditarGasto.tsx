import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { GastoForm } from "@/components/finanzas/GastoForm";
import { obtenerDatosPorRango } from "@/lib/finanzas/queries";
import { formatoFecha } from "@/lib/finanzas/formato";
import type { Gasto } from "@/lib/finanzas/types";

export default function EditarGasto() {
  const { id } = useParams<{ id: string }>();

  // Buscar el gasto en un rango de ±30 días desde hoy
  const { data, isLoading, error } = useQuery({
    queryKey: ["gasto-edicion", id],
    queryFn: async () => {
      if (!id) throw new Error("ID de gasto no proporcionado");

      const hoy = new Date().toISOString().slice(0, 10);
      const hace30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);

      const datos = await obtenerDatosPorRango(hace30, hoy);
      const gasto = datos.gastos.find((g) => g.id === id);

      if (!gasto) throw new Error("Gasto no encontrado");
      return gasto;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-lg mx-auto space-y-6 py-12">
        <div className="flex items-center gap-3">
          <Link to="/finanzas" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-semibold">Editar gasto</h1>
        </div>
        <p className="text-sm text-destructive text-center py-8">
          {error instanceof Error ? error.message : "No se pudo cargar el gasto. Intenta de nuevo."}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/finanzas" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold">Editar gasto</h1>
          <p className="text-xs text-muted-foreground">
            {data.descripcion} • {formatoFecha(data.fecha)}
          </p>
        </div>
      </div>

      {/* Formulario */}
      <GastoForm semanaId={data.semana_id} gasto={data} />
    </div>
  );
}
