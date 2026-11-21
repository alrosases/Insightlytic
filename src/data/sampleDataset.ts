import type { ParsedDataset, RawRow } from '../types/eda';

function seededRandom(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function createSampleDataset(): ParsedDataset {
  const rand = seededRandom(202611);
  const regiones = ['España Centro', 'Cataluña', 'Andalucía', 'Levante', 'España Norte'];
  const categorias = ['Electrónica', 'Hogar y Diseño', 'Moda', 'Deportes'];
  const canales = ['Tienda Web', 'Tienda Física', 'Aplicación Móvil'];
  const notasPool = [
    'Campaña Primavera',
    'Black Friday',
    'Cliente Frecuente',
    'Promoción Lanzamiento',
    'Envío Express',
  ];

  const basePrices: Record<string, number> = {
    Electrónica: 310,
    'Hogar y Diseño': 145,
    Moda: 72,
    Deportes: 118,
  };

  const rows: RawRow[] = [];
  const startDate = new Date(2026, 0, 3);

  for (let i = 0; i < 117; i++) {
    const d = new Date(startDate.getTime() + i * 2 * 24 * 60 * 60 * 1000);
    const fecha = d.toISOString().slice(0, 10);

    const region = regiones[Math.floor(rand() * regiones.length)];
    const categoria = categorias[Math.floor(rand() * categorias.length)];
    const canal = canales[Math.floor(rand() * canales.length)];

    // Unidades con variación realista + 3 valores atípicos altos
    let unidades = Math.max(1, Math.round(6 + rand() * 14 + (canal === 'Tienda Web' ? 4 : 0)));
    if (i === 18 || i === 57 || i === 94) {
      unidades = Math.round(52 + rand() * 24);
    }

    const basePrice = basePrices[categoria];
    const precio = Number((basePrice * (0.78 + rand() * 0.48)).toFixed(2));

    // Descuento con ~11% faltantes (NA / vacío / -)
    let descuento: number | string = Math.round((rand() < 0.35 ? 0 : 5 + rand() * 20) * 10) / 10;
    if (rand() < 0.11) {
      descuento = rand() < 0.5 ? 'NA' : '';
    }

    const descuentoFactor = typeof descuento === 'number' ? 1 - descuento / 100 : 1;
    let ingresos = Number((unidades * precio * descuentoFactor).toFixed(2));
    if (i === 57) {
      ingresos = Number((ingresos * 1.45).toFixed(2));
    }

    // Satisfacción con ~24% faltantes (supera el 20% para demostrar el resaltado rojo)
    let satisfaccion: number | string = Number(
      Math.min(5, Math.max(1, 3.4 + (rand() - 0.35) * 2.2)).toFixed(1)
    );
    if (rand() < 0.24) {
      satisfaccion = rand() < 0.4 ? 'N/A' : '-';
    }

    // Notas con ~30% faltantes
    let notas: string = notasPool[Math.floor(rand() * notasPool.length)];
    if (rand() < 0.3) {
      notas = '';
    }

    rows.push({
      Fecha: fecha,
      Región: region,
      Categoría: categoria,
      Canal_Venta: canal,
      Unidades_Vendidas: unidades,
      Precio_Unitario_EUR: precio,
      Ingresos_Totales_EUR: ingresos,
      Descuento_Pct: descuento,
      Satisfacción_Cliente: satisfaccion,
      Notas_Campaña: notas,
    });
  }

  // Añadir 3 filas exactamente duplicadas para ilustrar detección de duplicados
  rows.push({ ...rows[4] });
  rows.push({ ...rows[22] });
  rows.push({ ...rows[61] });

  const columns = [
    'Fecha',
    'Región',
    'Categoría',
    'Canal_Venta',
    'Unidades_Vendidas',
    'Precio_Unitario_EUR',
    'Ingresos_Totales_EUR',
    'Descuento_Pct',
    'Satisfacción_Cliente',
    'Notas_Campaña',
  ];

  return {
    fileName: 'ventas_tienda_ejemplo.csv',
    fileSizeBytes: 11840,
    format: 'Ejemplo',
    encoding: 'UTF-8',
    delimiter: ',',
    columns,
    rows,
  };
}
