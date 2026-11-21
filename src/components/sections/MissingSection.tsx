import { useMemo } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { DatasetAnalysis } from '../../types/eda';
import { buildMissingValuesChart } from '../../utils/chartBuilder';
import { HelpTip } from '../HelpTip';
import { PlotlyChart } from '../PlotlyChart';

interface MissingSectionProps {
  analysis: DatasetAnalysis;
}

export function MissingSection({ analysis }: MissingSectionProps) {
  const varsWithMissing = analysis.variables.filter((v) => v.missingCount > 0);
  const criticalCount = varsWithMissing.filter((v) => v.missingPct > 20).length;

  const chartConfig = useMemo(() => buildMissingValuesChart(analysis), [analysis]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold text-slate-900">
                Análisis de datos faltantes
              </h2>
              <HelpTip
                title="¿Qué cuenta como dato faltante?"
                text="Se consideran faltantes las celdas vacías o con textos como 'NA', 'N/A', 'null' o '-'. Las variables con más del 20% de datos faltantes se resaltan en rojo suave porque pueden afectar análisis posteriores."
              />
            </div>
            <p className="mt-1 text-sm text-slate-600">
              Identifica qué columnas tienen valores vacíos o incompletos antes de sacar conclusiones.
            </p>
          </div>
        </div>

        {analysis.totalMissingCount === 0 ? (
          <div className="mt-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-5 text-emerald-900">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            <div>
              <p className="text-sm font-semibold">
                No hay datos faltantes en este conjunto de datos
              </p>
              <p className="mt-1 text-sm text-emerald-800">
                Todas las {analysis.totalCells.toLocaleString('es-ES')} celdas contienen un valor válido.
              </p>
            </div>
          </div>
        ) : (
          <>
            {criticalCount > 0 && (
              <div className="mt-5 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50/70 p-4 text-rose-900">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
                <p className="text-sm">
                  <span className="font-semibold">
                    {criticalCount}{' '}
                    {criticalCount === 1
                      ? 'variable supera el 20%'
                      : 'variables superan el 20%'}
                  </span>{' '}
                  de datos faltantes (marcadas en rojo suave). Conviene revisar si falta información
                  de origen o si deben excluirse de ciertos cálculos.
                </p>
              </div>
            )}

            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
              <div className="lg:col-span-6">
                <h3 className="mb-3 text-sm font-semibold text-slate-800">
                  Detalle por variable
                </h3>
                <div className="custom-scrollbar overflow-x-auto rounded-xl border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-2.5 text-xs font-semibold text-slate-600">
                          Variable
                        </th>
                        <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-600">
                          Faltantes
                        </th>
                        <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-600">
                          % Faltantes
                        </th>
                        <th className="px-4 py-2.5 text-xs font-semibold text-slate-600">
                          Nivel
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {analysis.variables.map((v) => {
                        const isHigh = v.missingPct > 20;
                        return (
                          <tr
                            key={v.name}
                            className={isHigh ? 'bg-rose-50/60' : 'hover:bg-slate-50/60'}
                          >
                            <td className="whitespace-nowrap px-4 py-2.5 text-xs font-medium text-slate-900">
                              {v.name}
                            </td>
                            <td className="whitespace-nowrap px-4 py-2.5 text-right text-xs text-slate-700 tabular-nums">
                              {v.missingCount.toLocaleString('es-ES')}
                            </td>
                            <td
                              className={`whitespace-nowrap px-4 py-2.5 text-right text-xs font-semibold tabular-nums ${
                                isHigh ? 'text-rose-700' : 'text-slate-700'
                              }`}
                            >
                              {v.missingPct.toFixed(2)}%
                            </td>
                            <td className="whitespace-nowrap px-4 py-2.5 text-xs">
                              {v.missingCount === 0 ? (
                                <span className="text-emerald-700">Completa</span>
                              ) : isHigh ? (
                                <span className="font-medium text-rose-700">
                                  Alto (&gt;20%)
                                </span>
                              ) : (
                                <span className="text-slate-600">Moderado</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="lg:col-span-6">
                <h3 className="mb-3 text-sm font-semibold text-slate-800">
                  Porcentaje de faltantes por variable
                </h3>
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <PlotlyChart
                    data={chartConfig.data}
                    layout={chartConfig.layout}
                    height={chartConfig.layout.height ?? 320}
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
