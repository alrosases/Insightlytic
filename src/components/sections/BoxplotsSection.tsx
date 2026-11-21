import { useMemo } from 'react';
import type { DatasetAnalysis } from '../../types/eda';
import { buildBoxplotChart } from '../../utils/chartBuilder';
import { HelpTip } from '../HelpTip';
import { PlotlyChart } from '../PlotlyChart';

interface BoxplotsSectionProps {
  analysis: DatasetAnalysis;
}

export function BoxplotsSection({ analysis }: BoxplotsSectionProps) {
  const numericList = Object.values(analysis.numericStats);

  const charts = useMemo(
    () =>
      numericList.map((stat) => ({
        stat,
        config: buildBoxplotChart(stat),
      })),
    [numericList]
  );

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold text-slate-900">
            Boxplots y detección de valores atípicos
          </h2>
          <HelpTip
            title="Método del Rango Intercuartílico (IQR)"
            text="Se consideran atípicos los valores muy alejados del comportamiento normal: menores a Q1 - 1,5·IQR o mayores a Q3 + 1,5·IQR. Aparecen como puntos rojos fuera de los bigotes."
          />
        </div>
        <p className="mt-1 text-sm text-slate-600">
          Identifica valores extremos o posibles errores de captura en cada variable numérica.
        </p>

        {numericList.length === 0 ? (
          <p className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            No hay variables numéricas disponibles para analizar valores atípicos.
          </p>
        ) : (
          <div className="mt-6 space-y-6">
            <div className="custom-scrollbar overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-700">
                      Variable
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700">
                      Límite inferior normal
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700">
                      Límite superior normal
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700">
                      Atípicos detectados
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700">
                      % Atípicos
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {numericList.map((s) => (
                    <tr key={s.column} className="hover:bg-slate-50/70">
                      <td className="whitespace-nowrap px-4 py-3 text-xs font-semibold text-slate-900">
                        {s.column}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-xs text-slate-600 tabular-nums">
                        {s.lowerFence.toFixed(2)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-xs text-slate-600 tabular-nums">
                        {s.upperFence.toFixed(2)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-xs font-semibold tabular-nums">
                        <span
                          className={
                            s.outlierCount > 0 ? 'text-rose-700' : 'text-emerald-700'
                          }
                        >
                          {s.outlierCount.toLocaleString('es-ES')}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-xs text-slate-700 tabular-nums">
                        {s.outlierPct.toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {charts.map(({ stat, config }) => (
                <div
                  key={stat.column}
                  className="rounded-xl border border-slate-200 bg-white p-4"
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <h3 className="truncate text-sm font-semibold text-slate-900">
                      {stat.column}
                    </h3>
                    <span
                      className={`text-xs font-medium tabular-nums ${
                        stat.outlierCount > 0 ? 'text-rose-600' : 'text-emerald-600'
                      }`}
                    >
                      {stat.outlierCount} atípicos
                    </span>
                  </div>
                  <PlotlyChart
                    data={config.data}
                    layout={config.layout}
                    height={260}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
