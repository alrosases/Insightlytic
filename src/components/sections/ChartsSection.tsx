import { useMemo, useRef } from 'react';
import Plotly from 'plotly.js-dist-min';
import { BookmarkPlus, Download, Trash2 } from 'lucide-react';
import type {
  BarAggregation,
  CustomChartConfig,
  DatasetAnalysis,
  InteractiveChartType,
  ParsedDataset,
} from '../../types/eda';
import { buildInteractiveChart } from '../../utils/chartBuilder';
import { HelpTip } from '../HelpTip';
import { PlotlyChart } from '../PlotlyChart';

interface ChartsSectionProps {
  dataset: ParsedDataset;
  analysis: DatasetAnalysis;
  config: CustomChartConfig;
  onConfigChange: (next: CustomChartConfig) => void;
  savedCharts: CustomChartConfig[];
  onSaveChart: (cfg: CustomChartConfig) => void;
  onRemoveSavedChart: (id: string) => void;
}

export function ChartsSection({
  dataset,
  analysis,
  config,
  onConfigChange,
  savedCharts,
  onSaveChart,
  onRemoveSavedChart,
}: ChartsSectionProps) {
  const plotElRef = useRef<HTMLDivElement | null>(null);

  const allColumns = dataset.columns;
  const numericColumns = analysis.variables
    .filter((v) => v.type === 'numeric')
    .map((v) => v.name);
  const categoricalColumns = analysis.variables
    .filter((v) => v.type === 'categorical' || v.type === 'date')
    .map((v) => v.name);

  const chartData = useMemo(
    () => buildInteractiveChart(dataset, config),
    [dataset, config]
  );

  const needsY =
    config.chartType !== 'bar' || config.aggregation !== 'count';

  const handleDownloadPng = async () => {
    if (!plotElRef.current) return;
    const safeName = config.title.replace(/[^a-zA-Z0-9_-]/g, '_');
    await Plotly.downloadImage(plotElRef.current, {
      format: 'png',
      width: 1100,
      height: 620,
      scale: 2,
      filename: safeName || 'grafico_explorador',
    });
  };

  const handleAddToReport = () => {
    const autoTitle =
      config.chartType === 'bar'
        ? config.aggregation === 'count'
          ? `Conteo por ${config.xVar}`
          : `${config.aggregation === 'sum' ? 'Suma' : 'Promedio'} de ${config.yVar} por ${config.xVar}`
        : config.chartType === 'line'
          ? `Tendencia de ${config.yVar} según ${config.xVar}`
          : `Dispersión: ${config.yVar} vs ${config.xVar}`;

    onSaveChart({
      ...config,
      id: `${Date.now()}`,
      title: config.title.trim() || autoTitle,
    });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold text-slate-900">
                Gráficos interactivos
              </h2>
              <HelpTip
                title="Exploración visual libre"
                text="Combina variables en los ejes X e Y, aplica colores por categoría, haz zoom arrastrando sobre el gráfico y descárgalo como imagen PNG o guárdalo para tu informe PDF."
              />
            </div>
            <p className="mt-1 text-sm text-slate-600">
              Crea tus propios gráficos de barras, líneas o dispersión con zoom y descarga en PNG.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleAddToReport}
              className="inline-flex items-center gap-1.5 rounded-xl border border-purple-200 bg-[#F5EEFC] px-3.5 py-2 text-xs font-medium text-[#6D08B1] transition-colors hover:bg-purple-100 whitespace-nowrap shrink-0"
            >
              <BookmarkPlus className="h-4 w-4" />
              Guardar en informe PDF
            </button>
            <button
              type="button"
              onClick={handleDownloadPng}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#820AD1] px-3.5 py-2 text-xs font-medium text-white transition-colors hover:bg-[#6D08B1] whitespace-nowrap shrink-0"
            >
              <Download className="h-4 w-4" />
              Descargar PNG
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 rounded-xl border border-purple-100 bg-[#FAF8FD] p-4 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label
              htmlFor="chart-type"
              className="block text-xs font-medium text-slate-700"
            >
              Tipo de gráfico
            </label>
            <select
              id="chart-type"
              value={config.chartType}
              onChange={(e) => {
                const nextType = e.target.value as InteractiveChartType;
                onConfigChange({
                  ...config,
                  chartType: nextType,
                  yVar:
                    config.yVar ||
                    numericColumns[0] ||
                    allColumns[Math.min(1, allColumns.length - 1)],
                });
              }}
              className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-[#820AD1] focus:outline-none"
            >
              <option value="bar">Barras</option>
              <option value="line">Líneas</option>
              <option value="scatter">Dispersión (puntos)</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="chart-x"
              className="block text-xs font-medium text-slate-700"
            >
              Variable eje X
            </label>
            <select
              id="chart-x"
              value={config.xVar}
              onChange={(e) => onConfigChange({ ...config, xVar: e.target.value })}
              className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-[#820AD1] focus:outline-none"
            >
              {allColumns.map((col) => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </select>
          </div>

          {config.chartType === 'bar' && (
            <div>
              <label
                htmlFor="chart-agg"
                className="block text-xs font-medium text-slate-700"
              >
                Agregación (barras)
              </label>
              <select
                id="chart-agg"
                value={config.aggregation}
                onChange={(e) =>
                  onConfigChange({
                    ...config,
                    aggregation: e.target.value as BarAggregation,
                  })
                }
                className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-[#820AD1] focus:outline-none"
              >
                <option value="count">Conteo de registros</option>
                <option value="sum" disabled={numericColumns.length === 0}>
                  Suma
                </option>
                <option value="avg" disabled={numericColumns.length === 0}>
                  Promedio
                </option>
              </select>
            </div>
          )}

          <div>
            <label
              htmlFor="chart-y"
              className="block text-xs font-medium text-slate-700"
            >
              Variable eje Y {!needsY && '(no requerida)'}
            </label>
            <select
              id="chart-y"
              value={config.yVar}
              disabled={!needsY}
              onChange={(e) => onConfigChange({ ...config, yVar: e.target.value })}
              className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 disabled:bg-slate-100 disabled:text-slate-400 focus:border-[#820AD1] focus:outline-none"
            >
              {(config.chartType === 'bar' ? numericColumns : allColumns).map((col) => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="chart-color"
              className="block text-xs font-medium text-slate-700"
            >
              Colorear por grupo (opcional)
            </label>
            <select
              id="chart-color"
              value={config.colorVar}
              onChange={(e) => onConfigChange({ ...config, colorVar: e.target.value })}
              className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-[#820AD1] focus:outline-none"
            >
              <option value="__none__">Sin agrupación</option>
              {categoricalColumns.map((col) => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4">
          <label htmlFor="chart-title-input" className="sr-only">
            Título personalizado del gráfico
          </label>
          <input
            id="chart-title-input"
            type="text"
            value={config.title}
            onChange={(e) => onConfigChange({ ...config, title: e.target.value })}
            placeholder="Título opcional del gráfico para el informe PDF..."
            className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#820AD1] focus:outline-none"
          />
        </div>

        <div className="mt-5 rounded-xl border border-slate-200 bg-white p-3">
          <PlotlyChart
            data={chartData.data}
            layout={chartData.layout}
            height={420}
            onPlotReady={(el) => {
              plotElRef.current = el;
            }}
          />
        </div>
      </div>

      {savedCharts.length > 0 && (
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs">
          <h3 className="text-base font-semibold text-slate-900">
            Gráficos guardados para el informe PDF ({savedCharts.length})
          </h3>
          <p className="mt-0.5 text-xs text-slate-600">
            Estos gráficos se incluirán automáticamente cuando descargues tu informe PDF.
          </p>
          <div className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200">
            {savedCharts.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-4 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {item.title}
                  </p>
                  <p className="text-xs text-slate-500">
                    Tipo: {item.chartType === 'bar' ? 'Barras' : item.chartType === 'line' ? 'Líneas' : 'Dispersión'}{' '}
                    · X: {item.xVar}
                    {item.aggregation !== 'count' || item.chartType !== 'bar'
                      ? ` · Y: ${item.yVar}`
                      : ' · Conteo'}
                    {item.colorVar !== '__none__' ? ` · Color: ${item.colorVar}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveSavedChart(item.id)}
                  aria-label={`Eliminar gráfico ${item.title}`}
                  className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-rose-600 transition-colors hover:bg-rose-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Quitar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
