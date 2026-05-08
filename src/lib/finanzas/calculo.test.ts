import { describe, it, expect } from 'vitest';
import { calcularCorteSemanal, calcularReembolsos, agruparGastosPorTipo } from './calculo';
import type { DatosSemanaParaCalculo, Gasto, Semana } from './types';

const semanaBase: Semana = {
  id: 'sem-1',
  fecha_inicio: '2026-05-04',
  fecha_fin: '2026-05-10',
  estado: 'abierta',
  arrastre_anterior: 0,
  notas: null,
  cerrada_en: null,
};

function gasto(partial: Partial<Gasto>): Gasto {
  return {
    id: crypto.randomUUID(),
    semana_id: 'sem-1',
    fecha: '2026-05-09',
    monto: 0,
    tipo: 'insumos',
    pagado_por: 'empresa',
    origen_dinero: 'caja_negocio',
    descripcion: 'Test',
    proveedor: null,
    foto_ticket_url: null,
    capturado_por: null,
    ...partial,
  };
}

describe('calcularReembolsos', () => {
  it('solo cuenta gastos personales de socios', () => {
    const gastos = [
      gasto({ pagado_por: 'fran',     origen_dinero: 'personal',     monto: 1000 }),
      gasto({ pagado_por: 'veronica', origen_dinero: 'personal',     monto: 500 }),
      gasto({ pagado_por: 'empresa',  origen_dinero: 'caja_negocio', monto: 800 }),
      gasto({ pagado_por: 'fran',     origen_dinero: 'caja_negocio', monto: 200 }),
    ];
    expect(calcularReembolsos(gastos)).toEqual({ fran: 1000, veronica: 500 });
  });

  it('devuelve 0/0 si no hay gastos personales', () => {
    const gastos = [gasto({ pagado_por: 'empresa', origen_dinero: 'caja_negocio', monto: 1000 })];
    expect(calcularReembolsos(gastos)).toEqual({ fran: 0, veronica: 0 });
  });
});

describe('agruparGastosPorTipo', () => {
  it('agrupa correctamente', () => {
    const gastos = [
      gasto({ tipo: 'insumos',    monto: 1000 }),
      gasto({ tipo: 'insumos',    monto: 500 }),
      gasto({ tipo: 'publicidad', monto: 300 }),
      gasto({ tipo: 'operacion',  monto: 200 }),
    ];
    expect(agruparGastosPorTipo(gastos)).toEqual({
      insumos: 1500,
      publicidad: 300,
      operacion: 200,
    });
  });
});

describe('calcularCorteSemanal — escenario 1: semana con utilidad y reembolsos', () => {
  const datos: DatosSemanaParaCalculo = {
    semana: semanaBase,
    ingresos_depositos: 8000,
    ingresos_sitio: [
      { id: '1', semana_id: 'sem-1', fecha: '2026-05-09', monto: 5000, metodo: 'efectivo',      reserva_id: null, descripcion: null, capturado_por: null },
      { id: '2', semana_id: 'sem-1', fecha: '2026-05-10', monto: 3000, metodo: 'transferencia', reserva_id: null, descripcion: null, capturado_por: null },
    ],
    gastos: [
      gasto({ pagado_por: 'veronica', origen_dinero: 'personal',     monto: 4000, tipo: 'insumos'    }),
      gasto({ pagado_por: 'fran',     origen_dinero: 'personal',     monto: 1000, tipo: 'publicidad' }),
      gasto({ pagado_por: 'empresa',  origen_dinero: 'caja_negocio', monto: 2000, tipo: 'operacion'  }),
    ],
  };

  const r = calcularCorteSemanal(datos);

  it('suma ingresos correctamente', () => {
    expect(r.ingresos_totales).toBe(16000); // 8000 + 5000 + 3000
    expect(r.ingresos_sitio_total).toBe(8000);
  });

  it('suma gastos correctamente', () => {
    expect(r.gastos_totales).toBe(7000);
  });

  it('calcula utilidad bruta', () => {
    expect(r.utilidad_bruta).toBe(9000);
  });

  it('calcula reembolsos por socio', () => {
    expect(r.reembolso_fran).toBe(1000);
    expect(r.reembolso_veronica).toBe(4000);
  });

  it('calcula utilidad distribuible (después de reembolsos)', () => {
    expect(r.utilidad_distribuible).toBe(4000); // 9000 - 5000
  });

  it('divide utilidad 50/50', () => {
    expect(r.fran_recibe).toBe(1000 + 2000);     // reembolso + 50% utilidad
    expect(r.veronica_recibe).toBe(4000 + 2000); // reembolso + 50% utilidad
  });

  it('genera dispersiones detalladas', () => {
    expect(r.dispersiones).toHaveLength(4); // 2 reembolsos + 2 utilidades
  });

  it('cuadra', () => {
    expect(r.cuadra).toBe(true);
    expect(r.alertas).toHaveLength(0);
  });
});

describe('calcularCorteSemanal — escenario 2: utilidad insuficiente para reembolsos', () => {
  const datos: DatosSemanaParaCalculo = {
    semana: semanaBase,
    ingresos_depositos: 5000,
    ingresos_sitio: [],
    gastos: [
      gasto({ pagado_por: 'veronica', origen_dinero: 'personal',     monto: 4000 }),
      gasto({ pagado_por: 'fran',     origen_dinero: 'personal',     monto: 2000 }),
      gasto({ pagado_por: 'empresa',  origen_dinero: 'caja_negocio', monto: 1500 }),
    ],
  };

  const r = calcularCorteSemanal(datos);

  it('utilidad bruta = 5000 - 7500 = -2500', () => {
    expect(r.utilidad_bruta).toBe(-2500);
  });

  it('no genera utilidad distribuible', () => {
    expect(r.utilidad_distribuible).toBe(0);
  });

  it('arrastra la pérdida a la siguiente semana', () => {
    expect(r.arrastre_siguiente).toBeLessThan(0);
  });

  it('emite alerta', () => {
    expect(r.alertas.length).toBeGreaterThan(0);
  });
});

describe('calcularCorteSemanal — escenario 3: arrastre anterior se aplica', () => {
  const datos: DatosSemanaParaCalculo = {
    semana: { ...semanaBase, arrastre_anterior: -1500 },
    ingresos_depositos: 10000,
    ingresos_sitio: [],
    gastos: [
      gasto({ pagado_por: 'empresa', origen_dinero: 'caja_negocio', monto: 4000 }),
    ],
  };

  const r = calcularCorteSemanal(datos);

  it('cubre arrastre anterior antes de distribuir', () => {
    // 10000 - 4000 = 6000 utilidad bruta
    // Sin reembolsos. -1500 de arrastre. Quedan 4500 distribuibles.
    expect(r.utilidad_distribuible).toBe(4500);
    expect(r.fran_recibe).toBe(2250);
    expect(r.veronica_recibe).toBe(2250);
  });
});

describe('calcularCorteSemanal — escenario 4: solo gastos de empresa, sin reembolsos', () => {
  const datos: DatosSemanaParaCalculo = {
    semana: semanaBase,
    ingresos_depositos: 6000,
    ingresos_sitio: [
      { id: '1', semana_id: 'sem-1', fecha: '2026-05-09', monto: 4000, metodo: 'efectivo', reserva_id: null, descripcion: null, capturado_por: null },
    ],
    gastos: [
      gasto({ pagado_por: 'empresa', origen_dinero: 'caja_negocio', monto: 3000 }),
    ],
  };

  const r = calcularCorteSemanal(datos);

  it('reembolsos en 0', () => {
    expect(r.reembolso_fran).toBe(0);
    expect(r.reembolso_veronica).toBe(0);
  });

  it('utilidad se divide 50/50 directo', () => {
    expect(r.utilidad_bruta).toBe(7000);
    expect(r.fran_recibe).toBe(3500);
    expect(r.veronica_recibe).toBe(3500);
  });
});
