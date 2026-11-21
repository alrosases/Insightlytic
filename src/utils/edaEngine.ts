import type {
  CategoricalStats,
  CategoryFrequency,
  CorrelationMatrix,
  DatasetAnalysis,
  NumericStats,
  ParsedDataset,
  RawRow,
  VariableMeta,
  VariableType,
} from '../types/eda';

const MISSING_TOKENS = new Set(['', 'na', 'n/a', 'null', 'nan', 'none', '-']);

export function isMissingValue(val: unknown): boolean {
  if (val === null || val === undefined) return true;
  if (typeof val === 'number') return Number.isNaN(val) || !Number.isFinite(val);
  if (typeof val === 'string') {
    return MISSING_TOKENS.has(val.trim().toLowerCase());
  }
  return false;
}

export function parseNumericValue(val: unknown): number | null {
  if (isMissingValue(val)) return null;
  if (typeof val === 'number') return Number.isFinite(val) ? val : null;
  if (typeof val === 'boolean') return null;

  let str = String(val).trim();
  if (!str) return null;

  // Quitar símbolos comunes de moneda o % si vienen acompañando a un número
  str = str.replace(/[€$%]/g, '').trim();

  // Formato numérico estándar: 1234.56 o -1234
  if (/^-?\d+(\.\d+)?$/.test(str)) {
    const n = Number(str);
    return Number.isFinite(n) ? n : null;
  }

  // Formato decimal español con coma: 1234,56
  if (/^-?\d+(,\d{1,6})$/.test(str)) {
    const n = Number(str.replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  }

  // Formato miles con punto y decimal coma: 1.234,56
  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(str)) {
    const n = Number(str.replace(/\./g, '').replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  }

  return null;
}

export function isLikelyDateValue(val: unknown): boolean {
  if (isMissingValue(val)) return false;
  if (val instanceof Date) return !isNaN(val.getTime());
  if (typeof val === 'number') return false;

  const str = String(val).trim();
  if (str.length < 6 || str.length > 35) return false;
  // Evitar números puros
  if (/^-?\d+([.,]\d+)?$/.test(str)) return false;

  // Patrones comunes: YYYY-MM-DD, DD/MM/YYYY, YYYY/MM/DD, ISO
  const datePattern =
    /^(\d{4}[-/]\d{1,2}[-/]\d{1,2}([T\s]\d{1,2}:\d{2}(:\d{2})?.*)?|\d{1,2}[-/]\d{1,2}[-/]\d{2,4}(\s\d{1,2}:\d{2})?)$/;
  if (!datePattern.test(str)) return false;

  // Validar DD/MM/YYYY convirtiéndolo a YYYY-MM-DD si hace falta
  if (/^\d{1,2}[-/]\d{1,2}[-/]\d{4}/.test(str)) {
    const parts = str.split(/[-/\s]/);
    const d = Number(parts[0]);
    const m = Number(parts[1]);
    const y = Number(parts[2]);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 1900 && y <= 2200) {
      return true;
    }
    if (d >= 1 && d <= 12 && m >= 1 && m <= 31 && y >= 1900 && y <= 2200) {
      return true;
    }
    return false;
  }

  const parsed = Date.parse(str);
  return !Number.isNaN(parsed);
}

export function formatValueDisplay(val: unknown): string {
  if (isMissingValue(val)) return '—';
  if (val instanceof Date) return val.toISOString().slice(0, 10);
  return String(val).trim();
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function quantileSorted(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  }
  return sorted[base];
}

export function detectVariableTypes(dataset: ParsedDataset): Record<string, VariableType> {
  const result: Record<string, VariableType> = {};
  const sampleLimit = Math.min(dataset.rows.length, 2000);
  const step = Math.max(1, Math.floor(dataset.rows.length / sampleLimit));

  for (const col of dataset.columns) {
    let validCount = 0;
    let numericHits = 0;
    let dateHits = 0;

    for (let i = 0; i < dataset.rows.length; i += step) {
      const val = dataset.rows[i][col];
      if (isMissingValue(val)) continue;
      validCount++;
      if (parseNumericValue(val) !== null) {
        numericHits++;
      } else if (isLikelyDateValue(val)) {
        dateHits++;
      }
    }

    if (validCount === 0) {
      result[col] = 'categorical';
    } else if (numericHits / validCount >= 0.85) {
      result[col] = 'numeric';
    } else if (dateHits / validCount >= 0.8) {
      result[col] = 'date';
    } else {
      result[col] = 'categorical';
    }
  }

  return result;
}

function computeNumericStats(column: string, rows: RawRow[]): NumericStats {
  const values: number[] = [];
  let missing = 0;

  for (const row of rows) {
    const raw = row[column];
    if (isMissingValue(raw)) {
      missing++;
      continue;
    }
    const parsed = parseNumericValue(raw);
    if (parsed === null) {
      missing++;
    } else {
      values.push(parsed);
    }
  }

  const count = values.length;
  if (count === 0) {
    return {
      column,
      count: 0,
      missing,
      mean: 0,
      median: 0,
      mode: null,
      modeText: 'N/D',
      stdDev: 0,
      min: 0,
      q1: 0,
      q3: 0,
      max: 0,
      range: 0,
      iqr: 0,
      lowerFence: 0,
      upperFence: 0,
      outlierCount: 0,
      outlierPct: 0,
      values: [],
      outliers: [],
    };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  const mean = sum / count;
  const median = quantileSorted(sorted, 0.5);
  const q1 = quantileSorted(sorted, 0.25);
  const q3 = quantileSorted(sorted, 0.75);
  const min = sorted[0];
  const max = sorted[count - 1];
  const range = max - min;
  const iqr = q3 - q1;

  // Desviación estándar muestral (n - 1)
  const variance =
    count > 1
      ? sorted.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / (count - 1)
      : 0;
  const stdDev = Math.sqrt(variance);

  // Moda (redondeada a 2 decimales para agrupar valores continuos si aplica)
  const freqMap = new Map<number, number>();
  for (const v of sorted) {
    const key = round2(v);
    freqMap.set(key, (freqMap.get(key) ?? 0) + 1);
  }
  let bestVal: number | null = null;
  let bestFreq = 0;
  for (const [val, freq] of freqMap.entries()) {
    if (freq > bestFreq) {
      bestFreq = freq;
      bestVal = val;
    }
  }
  const mode = bestFreq > 1 ? bestVal : null;
  const modeText = mode !== null ? `${mode.toFixed(2)} (${bestFreq}×)` : 'Sin repetición';

  // Atípicos con método IQR (Tukey)
  const lowerFence = q1 - 1.5 * iqr;
  const upperFence = q3 + 1.5 * iqr;
  const outliers = values.filter((v) => v < lowerFence || v > upperFence);
  const outlierCount = outliers.length;
  const outlierPct = count > 0 ? round2((outlierCount / count) * 100) : 0;

  return {
    column,
    count,
    missing,
    mean: round2(mean),
    median: round2(median),
    mode,
    modeText,
    stdDev: round2(stdDev),
    min: round2(min),
    q1: round2(q1),
    q3: round2(q3),
    max: round2(max),
    range: round2(range),
    iqr: round2(iqr),
    lowerFence: round2(lowerFence),
    upperFence: round2(upperFence),
    outlierCount,
    outlierPct,
    values,
    outliers,
  };
}

function computeCategoricalStats(column: string, rows: RawRow[]): CategoricalStats {
  const counts = new Map<string, number>();
  let validCount = 0;
  let missing = 0;

  for (const row of rows) {
    const raw = row[column];
    if (isMissingValue(raw)) {
      missing++;
      continue;
    }
    const text = formatValueDisplay(raw);
    validCount++;
    counts.set(text, (counts.get(text) ?? 0) + 1);
  }

  const frequencies: CategoryFrequency[] = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([value, count]) => ({
      value,
      count,
      pct: validCount > 0 ? round2((count / validCount) * 100) : 0,
    }));

  const top = frequencies[0];

  return {
    column,
    count: validCount,
    missing,
    uniqueCount: frequencies.length,
    mode: top ? top.value : 'N/D',
    modeCount: top ? top.count : 0,
    modePct: top ? top.pct : 0,
    frequencies,
  };
}

function computePearsonCorrelation(
  colA: string,
  colB: string,
  rows: RawRow[]
): number | null {
  const xs: number[] = [];
  const ys: number[] = [];

  for (const row of rows) {
    const a = parseNumericValue(row[colA]);
    const b = parseNumericValue(row[colB]);
    if (a !== null && b !== null) {
      xs.push(a);
      ys.push(b);
    }
  }

  const n = xs.length;
  if (n < 3) return null;

  let sumX = 0;
  let sumY = 0;
  for (let i = 0; i < n; i++) {
    sumX += xs[i];
    sumY += ys[i];
  }
  const meanX = sumX / n;
  const meanY = sumY / n;

  let num = 0;
  let denX = 0;
  let denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }

  const den = Math.sqrt(denX * denY);
  if (den === 0) return null;
  return round2(num / den);
}

export function analyzeDataset(
  dataset: ParsedDataset,
  detectedTypes: Record<string, VariableType>,
  typeOverrides: Record<string, VariableType>
): DatasetAnalysis {
  const rowCount = dataset.rows.length;
  const colCount = dataset.columns.length;
  const totalCells = rowCount * colCount;

  // Contar filas duplicadas exactas
  const seenRows = new Set<string>();
  let duplicateRowCount = 0;
  for (const row of dataset.rows) {
    const signature = dataset.columns
      .map((c) => {
        const val = row[c];
        return isMissingValue(val) ? '__MISSING__' : formatValueDisplay(val);
      })
      .join('\u0001');
    if (seenRows.has(signature)) {
      duplicateRowCount++;
    } else {
      seenRows.add(signature);
    }
  }

  let totalMissingCount = 0;
  const variables: VariableMeta[] = [];
  const numericStats: Record<string, NumericStats> = {};
  const categoricalStats: Record<string, CategoricalStats> = {};
  const numericColumns: string[] = [];

  for (const col of dataset.columns) {
    const detectedType = detectedTypes[col] ?? 'categorical';
    const activeType = typeOverrides[col] ?? detectedType;

    let missingCount = 0;
    const uniqueSet = new Set<string>();
    let exampleValue = '—';

    for (const row of dataset.rows) {
      const val = row[col];
      if (isMissingValue(val)) {
        missingCount++;
      } else {
        const formatted = formatValueDisplay(val);
        if (exampleValue === '—') exampleValue = formatted;
        uniqueSet.add(formatted);
      }
    }

    totalMissingCount += missingCount;
    const validCount = rowCount - missingCount;
    const missingPct = rowCount > 0 ? round2((missingCount / rowCount) * 100) : 0;

    variables.push({
      name: col,
      detectedType,
      type: activeType,
      uniqueCount: uniqueSet.size,
      exampleValue,
      missingCount,
      missingPct,
      validCount,
    });

    if (activeType === 'numeric') {
      numericColumns.push(col);
      numericStats[col] = computeNumericStats(col, dataset.rows);
    } else {
      categoricalStats[col] = computeCategoricalStats(col, dataset.rows);
    }
  }

  const totalMissingPct = totalCells > 0 ? round2((totalMissingCount / totalCells) * 100) : 0;

  // Matriz de correlaciones entre variables numéricas (limitada a las primeras 20 para rendimiento)
  const corrCols = numericColumns.slice(0, 20);
  const matrix: (number | null)[][] = corrCols.map(() => corrCols.map(() => null));
  const strongPairs: { varA: string; varB: string; r: number }[] = [];

  for (let i = 0; i < corrCols.length; i++) {
    matrix[i][i] = 1;
    for (let j = i + 1; j < corrCols.length; j++) {
      const r = computePearsonCorrelation(corrCols[i], corrCols[j], dataset.rows);
      matrix[i][j] = r;
      matrix[j][i] = r;
      if (r !== null && Math.abs(r) >= 0.3) {
        strongPairs.push({ varA: corrCols[i], varB: corrCols[j], r });
      }
    }
  }
  strongPairs.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));

  return {
    rowCount,
    colCount,
    totalCells,
    totalMissingCount,
    totalMissingPct,
    duplicateRowCount,
    variables,
    numericStats,
    categoricalStats,
    correlations: {
      columns: corrCols,
      matrix,
      strongPairs,
    },
  };
}

export function buildSummaryForGemini(
  dataset: ParsedDataset,
  analysis: DatasetAnalysis
) {
  return {
    fileName: dataset.fileName,
    format: dataset.format,
    resumenGeneral: {
      registros: analysis.rowCount,
      variables: analysis.colCount,
      porcentajeFaltantesTotal: analysis.totalMissingPct,
      filasDuplicadas: analysis.duplicateRowCount,
    },
    variables: analysis.variables.map((v) => ({
      nombre: v.name,
      tipo: v.type === 'numeric' ? 'Numérica' : v.type === 'date' ? 'Fecha' : 'Categórica',
      valoresUnicos: v.uniqueCount,
      faltantesCantidad: v.missingCount,
      faltantesPorcentaje: v.missingPct,
    })),
    estadisticaNumerica: Object.values(analysis.numericStats).map((s) => ({
      variable: s.column,
      validos: s.count,
      media: s.mean,
      mediana: s.median,
      moda: s.modeText,
      desviacionEstandar: s.stdDev,
      minimo: s.min,
      q1: s.q1,
      q3: s.q3,
      maximo: s.max,
      rango: s.range,
      atipicosCantidad: s.outlierCount,
      atipicosPorcentaje: s.outlierPct,
    })),
    frecuenciasCategoricas: Object.values(analysis.categoricalStats).map((c) => ({
      variable: c.column,
      categoriasUnicas: c.uniqueCount,
      moda: c.mode,
      modaPorcentaje: c.modePct,
      topCategorias: c.frequencies.slice(0, 8),
    })),
    correlacionesRelevantes: analysis.correlations.strongPairs.slice(0, 15).map((p) => ({
      variableA: p.varA,
      variableB: p.varB,
      correlacionPearson: p.r,
    })),
  };
}
