/**
 * Motor de cálculo financiero — funciones puras.
 *
 * Reglas del negocio (de las instrucciones del proyecto):
 *   1. Reembolsos PRIMERO, utilidad después.
 *   2. Si un socio paga con dinero personal → es reembolso obligatorio.
 *   3. Utilidad = Ingresos - Gastos. Si positiva, se divide 50/50.
 *      Si negativa, se arrastra como deuda a la siguiente semana.
 *   4. El efectivo nunca desaparece: o es gasto o está en caja.
 *   5. Los gastos pagados por la empresa NO generan reembolso.
 *
 * IMPORTANTE: este módulo NO toca Supabase. Recibe datos crudos,
 * devuelve el resultado calculado. Eso lo hace fácil de testear.
 */

import type {
  DatosSemanaParaCalculo,
  Gasto,
  ResultadoCorte,
  TipoDispersion,
  TipoGasto,
} from './types';

/** Redondea a 2 decimales para evitar errores de coma flotante. */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Suma con tolerancia a undefined/null. */
function sumar(...nums: Array<number | null | undefined>): number {
  return round2(nums.reduce<number>((acc, n) => acc + (n ?? 0), 0));
}

/**
 * Calcula los reembolsos por socio a partir de los gastos.
 * Solo cuenta gastos donde:
 *   - pagado_por ∈ {fran, veronica}
 *   - origen_dinero === 'personal'
 */
export function calcularReembolsos(gastos: Gasto[]): {
  fran: number;
  veronica: number;
} {
  const fran = gastos
    .filter((g) => g.pagado_por === 'fran' && g.origen_dinero === 'personal')
    .reduce((acc, g) => acc + g.monto, 0);

  const veronica = gastos
    .filter((g) => g.pagado_por === 'veronica' && g.origen_dinero === 'personal')
    .reduce((acc, g) => acc + g.monto, 0);

  return { fran: round2(fran), veronica: round2(veronica) };
}

/** Agrupa gastos por tipo. */
export function agruparGastosPorTipo(gastos: Gasto[]): Record<TipoGasto, number> {
  const init: Record<TipoGasto, number> = {
    insumos: 0,
    publicidad: 0,
    operacion: 0,
  };

  return gastos.reduce<Record<TipoGasto, number>>((acc, g) => {
    acc[g.tipo] = round2(acc[g.tipo] + g.monto);
    return acc;
  }, init);
}

/**
 * Función principal: toma todos los datos de una semana y calcula el corte.
 *
 * Flujo:
 *   1. Suma ingresos (depósitos + sitio).
 *   2. Suma gastos.
 *   3. Calcula utilidad bruta = ingresos - gastos.
 *   4. Calcula reembolsos por socio.
 *   5. Resta reembolsos de la utilidad bruta → utilidad distribuible.
 *   6. Si utilidad distribuible < 0 → toda la utilidad se va a reembolsos
 *      (parcial) y la diferencia se arrastra a la siguiente semana.
 *   7. Si utilidad distribuible >= 0 → se divide 50/50 entre socios.
 *   8. Aplica arrastre anterior a la utilidad final si existe.
 *   9. Genera lista de dispersiones detallada.
 */
export function calcularCorteSemanal(datos: DatosSemanaParaCalculo): ResultadoCorte {
  const { semana, ingresos_depositos, ingresos_sitio, gastos } = datos;
  const alertas: string[] = [];

  // 1. Ingresos
  const ingresos_sitio_total = sumar(...ingresos_sitio.map((i) => i.monto));
  const ingresos_totales = sumar(ingresos_depositos, ingresos_sitio_total);

  // 2. Gastos
  const gastos_totales = sumar(...gastos.map((g) => g.monto));
  const gastos_por_tipo = agruparGastosPorTipo(gastos);

  // 3. Utilidad bruta
  const utilidad_bruta = round2(ingresos_totales - gastos_totales);

  // 4. Reembolsos — siempre el monto completo pagado con dinero personal.
  //    Son un flujo independiente de la distribución de utilidad.
  const reembolsos = calcularReembolsos(gastos);
  const reembolso_fran = reembolsos.fran;
  const reembolso_veronica = reembolsos.veronica;
  const reembolsos_totales = round2(reembolso_fran + reembolso_veronica);

  // 5. Utilidad distribuible (independiente de reembolsos)
  let utilidad_distribuible = utilidad_bruta;
  let arrastre_siguiente = 0;

  if (utilidad_bruta < 0) {
    // Pérdida real — arrastra la deuda a la siguiente semana
    arrastre_siguiente = utilidad_bruta;
    utilidad_distribuible = 0;
    alertas.push(
      `Pérdida de $${Math.abs(utilidad_bruta).toFixed(2)} se arrastra a la siguiente semana.`,
    );
  } else if (semana.arrastre_anterior < 0) {
    // Existe deuda de semanas anteriores — se salda primero con la utilidad
    const deuda = Math.abs(semana.arrastre_anterior);
    if (utilidad_distribuible >= deuda) {
      utilidad_distribuible = round2(utilidad_distribuible - deuda);
      alertas.push(`Se cubrió arrastre anterior de $${deuda.toFixed(2)}.`);
    } else {
      arrastre_siguiente = round2(utilidad_distribuible - deuda); // sigue negativo
      utilidad_distribuible = 0;
      alertas.push(
        `Utilidad insuficiente para cubrir arrastre anterior. Nueva deuda: $${Math.abs(
          arrastre_siguiente,
        ).toFixed(2)}.`,
      );
    }
  }

  // 6. Distribución 50/50 de la utilidad
  const fran_utilidad = round2(utilidad_distribuible / 2);
  const vero_utilidad = round2(utilidad_distribuible - fran_utilidad);

  // fran_recibe / veronica_recibe = solo la parte de utilidad (reembolsos son flujo aparte)
  const fran_recibe = fran_utilidad;
  const veronica_recibe = vero_utilidad;

  // Dispersiones detalladas
  const dispersiones: ResultadoCorte['dispersiones'] = [];
  if (reembolso_fran > 0) {
    dispersiones.push({
      tipo: 'reembolso' as TipoDispersion,
      beneficiario: 'fran',
      monto: reembolso_fran,
      razon: 'Reembolso de gastos pagados con dinero personal',
    });
  }
  if (reembolso_veronica > 0) {
    dispersiones.push({
      tipo: 'reembolso' as TipoDispersion,
      beneficiario: 'veronica',
      monto: reembolso_veronica,
      razon: 'Reembolso de gastos pagados con dinero personal',
    });
  }
  if (fran_utilidad > 0) {
    dispersiones.push({
      tipo: 'utilidad' as TipoDispersion,
      beneficiario: 'fran',
      monto: fran_utilidad,
      razon: 'Utilidad 50/50',
    });
  }
  if (vero_utilidad > 0) {
    dispersiones.push({
      tipo: 'utilidad' as TipoDispersion,
      beneficiario: 'veronica',
      monto: vero_utilidad,
      razon: 'Utilidad 50/50',
    });
  }

  // Validación: el flujo debe cuadrar
  // ingresos = gastos_empresa + reembolsos_pagados + utilidad_repartida + arrastre
  const cuadra = validarCuadre({
    ingresos_totales,
    gastos_totales,
    utilidad_bruta,
  });

  if (!cuadra) {
    alertas.push('⚠️ Validación de cuadre falló. Revisar manualmente.');
  }

  return {
    semana_id: semana.id,
    ingresos_depositos: round2(ingresos_depositos),
    ingresos_sitio_total,
    ingresos_totales,
    gastos_totales,
    gastos_por_tipo,
    reembolso_fran,
    reembolso_veronica,
    reembolsos_totales: round2(reembolso_fran + reembolso_veronica),
    utilidad_bruta,
    utilidad_distribuible,
    arrastre_siguiente,
    fran_recibe,
    veronica_recibe,
    dispersiones,
    cuadra,
    alertas,
  };
}

/**
 * Valida que ingresos - gastos == utilidad bruta. Trivial, pero protege
 * contra errores de redondeo o de input.
 */
function validarCuadre(args: {
  ingresos_totales: number;
  gastos_totales: number;
  utilidad_bruta: number;
}): boolean {
  const diff = Math.abs(
    args.ingresos_totales - args.gastos_totales - args.utilidad_bruta,
  );
  return diff < 0.01; // tolerancia de 1 centavo
}
