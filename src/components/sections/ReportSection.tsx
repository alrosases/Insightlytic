import { useState } from 'react';
import { CheckSquare, FileDown, Loader2, Square } from 'lucide-react';
import type {
  AiAnalysisReport,
  CustomChartConfig,
  DatasetAnalysis,
  ParsedDataset,
  PdfSectionSelection,
} from '../../types/eda';
import { generatePdfReport } from '../../utils/pdfExporter';

interface ReportSectionProps {
  dataset: ParsedDataset;
  analysis: DatasetAnalysis;
  histogramBins: number;
  savedCharts: CustomChartConfig[];
  activeInteractiveChart: CustomChartConfig | null;
  aiAnalysis: AiAnalysisReport | null;
}

const SECTION_LABELS: {
  key: keyof PdfSectionSelection;
  title: string;
  desc: string;
}[] = [
  {
    key: 'resumen',
    title: 'Resumen general',
    desc: 'Tarjetas con registros, variables, % faltantes y filas duplicadas.',
  },
  {
    key: 'vistaPrevia',
    title: 'Vista previa de los datos',
    desc: 'Tabla con las primeras 3 filas del archivo.',
  },
  {
    key: 'variables',
    title: 'Tipos de variables',
    desc: 'Clasificación (Numérica, Categórica, Fecha), únicos y ejemplo.',
  },
  {
    key: 'faltantes',
    title: 'Datos faltantes',
    desc: 'Tabla por variable y gráfico de barras horizontales.',
  },
  {
    key: 'estadisticas',
    title: 'Estadística descriptiva',
    desc: 'Media, mediana, desviación, cuartiles y frecuencias categóricas.',
  },
  {
    key: 'histogramas',
    title: 'Histogramas',
    desc: 'Gráficos de distribución de cada variable numérica.',
  },
  {
    key: 'boxplots',
    title: 'Boxplots y valores atípicos',
    desc: 'Tabla de atípicos (IQR) y diagramas de caja.',
  },
  {
    key: 'graficosUsuario',
    title: 'Gráficos creados y correlaciones',
    desc: 'Tus gráficos interactivos guardados (o actual) y el mapa de calor.',
  },
  {
    key: 'analisisIA',
    title: 'Conclusiones del análisis IA',
    desc: 'Tendencias, calidad y recomendaciones generadas por Gemini.',
  },
];

export function ReportSection({
  dataset,
  analysis,
  histogramBins,
  savedCharts,
  activeInteractiveChart,
  aiAnalysis,
}: ReportSectionProps) {
  const [selection, setSelection] = useState<PdfSectionSelection>({
    resumen: true,
    vistaPrevia: true,
    variables: true,
    faltantes: true,
    estadisticas: true,
    histogramas: true,
    boxplots: true,
    graficosUsuario: true,
    analisisIA: true,
  });

  const [isExporting, setIsExporting] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [exportError, setExportError] = useState<string | null>(null);

  const selectedCount = Object.values(selection).filter(Boolean).length;

  const toggleAll = (value: boolean) => {
    setSelection({
      resumen: value,
      vistaPrevia: value,
      variables: value,
      faltantes: value,
      estadisticas: value,
      histogramas: value,
      boxplots: value,
      graficosUsuario: value,
      analisisIA: value,
    });
  };

  const handleDownload = async () => {
    if (selectedCount === 0) return;
    setIsExporting(true);
    setExportError(null);
    setProgressMsg('Preparando documento...');

    try {
      await generatePdfReport({
        dataset,
        analysis,
        sections: selection,
        histogramBins,
        savedCharts,
        activeInteractiveChart,
        aiAnalysis,
        onProgress: setProgressMsg,
      });
    } catch (err) {
      setExportError(
        err instanceof Error
          ? err.message
          : 'Ocurrió un error al generar el archivo PDF.'
      );
    } finally {
      setIsExporting(false);
      setProgressMsg('');
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              Exportar informe profesional en PDF
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Selecciona las secciones que deseas incluir. El archivo incluirá portada,
              encabezados por sección y numeración automática de páginas.
            </p>
          </div>

          <button
            type="button"
            disabled={isExporting || selectedCount === 0}
            onClick={handleDownload}
            className="inline-flex items-center gap-2 rounded-xl bg-[#820AD1] px-5 py-2.5 text-sm font-medium text-white shadow-xs transition-colors hover:bg-[#6D08B1] disabled:cursor-not-allowed disabled:opacity-60 whitespace-nowrap shrink-0"
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generando PDF...
              </>
            ) : (
              <>
                <FileDown className="h-4 w-4" />
                Descargar informe PDF
              </>
            )}
          </button>
        </div>

        {isExporting && progressMsg && (
          <div className="mt-4 rounded-xl border border-purple-200 bg-[#F5EEFC] px-4 py-3 text-xs font-medium text-[#6D08B1]">
            {progressMsg}
          </div>
        )}

        {exportError && (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-800"
          >
            {exportError}
          </div>
        )}

        <div className="mt-6 flex items-center justify-between border-b border-slate-100 pb-3">
          <span className="text-xs font-medium text-slate-600 tabular-nums">
            {selectedCount} de {SECTION_LABELS.length} secciones seleccionadas
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => toggleAll(true)}
              className="text-xs font-medium text-[#820AD1] hover:text-[#6D08B1]"
            >
              Marcar todas
            </button>
            <span className="text-slate-300">|</span>
            <button
              type="button"
              onClick={() => toggleAll(false)}
              className="text-xs font-medium text-slate-500 hover:text-slate-800"
            >
              Desmarcar todas
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SECTION_LABELS.map((item) => {
            const checked = selection[item.key];
            return (
              <button
                key={item.key}
                type="button"
                onClick={() =>
                  setSelection((prev) => ({ ...prev, [item.key]: !prev[item.key] }))
                }
                className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-colors ${
                  checked
                    ? 'border-purple-200 bg-[#F5EEFC]/60'
                    : 'border-slate-200 bg-white hover:bg-[#FAF8FD]'
                }`}
              >
                {checked ? (
                  <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-[#820AD1]" />
                ) : (
                  <Square className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                )}
                <div>
                  <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                    {item.desc}
                  </p>
                  {item.key === 'analisisIA' && !aiAnalysis && (
                    <p className="mt-1 text-[11px] font-medium text-amber-700">
                      Consejo: Genera primero el análisis en la pestaña &ldquo;Análisis IA&rdquo;.
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
