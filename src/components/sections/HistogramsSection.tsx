import { useMemo } from 'react';
import type { DatasetAnalysis } from '../../types/eda';
import { buildHistogramChart } from '../../utils/chartBuilder';
import { HelpTip } from '../HelpTip';
import { PlotlyChart } from '../PlotlyChart';

interface HistogramsSectionProps {
  analysis: DatasetAnalysis;
  bins: number;
  onBinsChange: (bins: number) => void;
}

export function HistogramsSection({
  analysis,
  bins,
  onBinsChange,
}: HistogramsSectionProps) {
  const numericList = Object.values(analysis.numericStats);

  const charts = useMemo(
    () =>
      numericList.map((stat) => ({
        stat,
        config: buildHistogramChart(stat, bins),
      })),
    [numericList, bins]
  );

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold text-slate-900">
                Histogramas de distribución
              </h2>
              <HelpTip
                title="¿Cómo leer un histograma?"
                text="Agrupa los valores numéricos en intervalos (barras). Las barras más altas muestran en qué rango se concentra la mayoría de los datos."
              />
            </div>
            <p className="mt-1 text-sm text-slate-600">
              Visualiza cómo se distribuyen las {numericList.length} variables numéricas.
            </p>
          </div>

          {numericList.length > 0 && (
            <div className="flex items-center gap-4 rounded-xl border border-purple-200/80 bg-[#FAF8FD] px-4 py-2.5">
              <label
                htmlFor="bins-slider"
                className="text-xs font-medium text-slate-700 whitespace-nowrap"
              >
                Intervalos (bins):{' '}
                <span className="font-semibold text-[#820AD1] tabular-nums">{bins}</span>
              </label>
              <input
                id="bins-slider"
                type="range"
                min={5}
                max={30}
                step={1}
                value={bins}
                onChange={(e) => onBinsChange(Number(e.target.value))}
                className="h-2 w-36 cursor-pointer accent-[#820AD1]"
              />
            </div>
          )}
        </div>

        {numericList.length === 0 ? (
          <p className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            No hay variables numéricas disponibles para generar histogramas.
          </p>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
            {charts.map(({ stat, config }) => (
              <div
                key={stat.column}
                className="rounded-xl border border-slate-200 bg-white p-4"
              >
                <div className="mb-2 flex items-baseline justify-between gap-2">
                  <h3 className="truncate text-sm font-semibold text-slate-900">
                    {stat.column}
                  </h3>
                  <span className="text-xs text-slate-500 tabular-nums whitespace-nowrap">
                    Media: {stat.mean.toFixed(2)} · Mediana: {stat.median.toFixed(2)}
                  </span>
                </div>
                <PlotlyChart
                  data={config.data}
                  layout={config.layout}
                  height={270}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
