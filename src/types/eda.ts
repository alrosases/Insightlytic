export type VariableType = 'numeric' | 'categorical' | 'date';

export type NavSectionId =
  | 'carga'
  | 'resumen'
  | 'variables'
  | 'faltantes'
  | 'estadisticas'
  | 'histogramas'
  | 'graficos'
  | 'boxplots'
  | 'analisis'
  | 'informe';

export type RawRow = Record<string, unknown>;

export interface ParsedDataset {
  fileName: string;
  fileSizeBytes: number;
  format: 'CSV' | 'TXT' | 'Excel' | 'JSON' | 'Ejemplo';
  encoding?: string;
  delimiter?: string;
  sheetNames?: string[];
  activeSheet?: string;
  columns: string[];
  rows: RawRow[];
}

export interface VariableMeta {
  name: string;
  detectedType: VariableType;
  type: VariableType;
  uniqueCount: number;
  exampleValue: string;
  missingCount: number;
  missingPct: number;
  validCount: number;
}

export interface NumericStats {
  column: string;
  count: number;
  missing: number;
  mean: number;
  median: number;
  mode: number | null;
  modeText: string;
  stdDev: number;
  min: number;
  q1: number;
  q3: number;
  max: number;
  range: number;
  iqr: number;
  lowerFence: number;
  upperFence: number;
  outlierCount: number;
  outlierPct: number;
  values: number[];
  outliers: number[];
}

export interface CategoryFrequency {
  value: string;
  count: number;
  pct: number;
}

export interface CategoricalStats {
  column: string;
  count: number;
  missing: number;
  uniqueCount: number;
  mode: string;
  modeCount: number;
  modePct: number;
  frequencies: CategoryFrequency[];
}

export interface CorrelationMatrix {
  columns: string[];
  matrix: (number | null)[][];
  strongPairs: {
    varA: string;
    varB: string;
    r: number;
  }[];
}

export interface DatasetAnalysis {
  rowCount: number;
  colCount: number;
  totalCells: number;
  totalMissingCount: number;
  totalMissingPct: number;
  duplicateRowCount: number;
  variables: VariableMeta[];
  numericStats: Record<string, NumericStats>;
  categoricalStats: Record<string, CategoricalStats>;
  correlations: CorrelationMatrix;
}

export type InteractiveChartType = 'bar' | 'line' | 'scatter';
export type BarAggregation = 'count' | 'sum' | 'avg';

export interface CustomChartConfig {
  id: string;
  title: string;
  chartType: InteractiveChartType;
  xVar: string;
  yVar: string;
  colorVar: string;
  aggregation: BarAggregation;
}

export interface AiAnalysisReport {
  resumenGeneral: {
    titulo: string;
    parrafos: string[];
    puntosClave: string[];
  };
  calidadDatos: {
    titulo: string;
    evaluacion: string;
    puntos: string[];
  };
  tendenciasPatrones: {
    titulo: string;
    puntos: string[];
  };
  relacionesVariables: {
    titulo: string;
    puntos: string[];
  };
  conclusionesClave: {
    titulo: string;
    puntos: string[];
  };
  recomendaciones: {
    titulo: string;
    puntos: string[];
  };
}

export interface PdfSectionSelection {
  resumen: boolean;
  vistaPrevia: boolean;
  variables: boolean;
  faltantes: boolean;
  estadisticas: boolean;
  histogramas: boolean;
  boxplots: boolean;
  graficosUsuario: boolean;
  analisisIA: boolean;
}
