import { useState } from 'react';
import type { DatasetAnalysis } from '../../types/eda';
import { HelpTip } from '../HelpTip';

interface StatsSectionProps {
  analysis: DatasetAnalysis;
}

export function StatsSection({ analysis }: StatsSectionProps) {
  const numericList = Object.values(analysis.numericStats);
  const categoricalList = Object.values(analysis.categoricalStats);
  const [selectedCat, setSelectedCat] = useState<string>(
    categoricalList[0]?.column ?? ''
  );

  const activeCat =
    analysis.categoricalStats[selectedCat] ?? categoricalList[0] ?? null;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold text-slate-900">
            Estadística descriptiva — Variables numéricas
          </h2>
          <HelpTip
            title="Medidas numéricas"
            text="Resumen matemático de cada columna numérica con valores redondeados a 2 decimales."
          />
        </div>
        <p className="mt-1 text-sm text-slate-600">
          Tendencia central, dispersión y cuartiles de todas las columnas numéricas.
        </p>

        {numericList.length === 0 ? (
          <p className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            No hay variables clasificadas como numéricas en este dataset.
          </p>
        ) : (
          <div className="custom-scrollbar mt-5 overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-700">
                    Variable
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-slate-700">
                    <span className="inline-flex items-center justify-end gap-1">
                      Media
                      <HelpTip
                        title="Media (Promedio)"
                        text="Suma de todos los valores dividida entre la cantidad de registros válidos."
                      />
                    </span>
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-slate-700">
                    <span className="inline-flex items-center justify-end gap-1">
                      Mediana
                      <HelpTip
                        title="Mediana"
                        text="Valor central cuando los datos se ordenan de menor a mayor. No se altera por valores extremos."
                      />
                    </span>
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-slate-700">
                    <span className="inline-flex items-center justify-end gap-1">
                      Moda
                      <HelpTip
                        title="Moda"
                        text="Valor que se repite con mayor frecuencia en la variable."
                      />
                    </span>
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-slate-700">
                    <span className="inline-flex items-center justify-end gap-1">
                      Desv. Est.
                      <HelpTip
                        title="Desviación estándar"
                        text="Mide qué tan dispersos están los datos respecto a la media. Cuanto menor sea, más parecidos son los valores."
                      />
                    </span>
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-slate-700">
                    Mínimo
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-slate-700">
                    <span className="inline-flex items-center justify-end gap-1">
                      Q1
                      <HelpTip
                        title="Primer cuartil (Q1)"
                        text="El 25% de los datos son menores o iguales a este valor."
                      />
                    </span>
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-slate-700">
                    <span className="inline-flex items-center justify-end gap-1">
                      Q3
                      <HelpTip
                        title="Tercer cuartil (Q3)"
                        text="El 75% de los datos son menores o iguales a este valor."
                      />
                    </span>
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-slate-700">
                    Máximo
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-slate-700">
                    <span className="inline-flex items-center justify-end gap-1">
                      Rango
                      <HelpTip
                        title="Rango"
                        text="Diferencia entre el valor máximo y el mínimo (Máximo - Mínimo)."
                      />
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {numericList.map((s) => (
                  <tr key={s.column} className="hover:bg-slate-50/70">
                    <td className="whitespace-nowrap px-4 py-3 text-xs font-semibold text-slate-900">
                      {s.column}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-right text-xs text-slate-700 tabular-nums">
                      {s.mean.toFixed(2)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-right text-xs text-slate-700 tabular-nums">
                      {s.median.toFixed(2)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-right text-xs text-slate-600 tabular-nums">
                      {s.modeText}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-right text-xs text-slate-700 tabular-nums">
                      {s.stdDev.toFixed(2)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-right text-xs text-slate-700 tabular-nums">
                      {s.min.toFixed(2)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-right text-xs text-slate-700 tabular-nums">
                      {s.q1.toFixed(2)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-right text-xs text-slate-700 tabular-nums">
                      {s.q3.toFixed(2)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-right text-xs text-slate-700 tabular-nums">
                      {s.max.toFixed(2)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-right text-xs font-medium text-[#820AD1] tabular-nums">
                      {s.range.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              Variables categóricas y fechas — Frecuencias
            </h3>
            <p className="mt-0.5 text-sm text-slate-600">
              Moda, número de categorías únicas y tabla de frecuencias absolutas y relativas (%).
            </p>
          </div>

          {categoricalList.length > 0 && (
            <div className="flex items-center gap-2">
              <label
                htmlFor="cat-var-select"
                className="text-xs font-medium text-slate-600 whitespace-nowrap"
              >
                Ver frecuencias de:
              </label>
              <select
                id="cat-var-select"
                value={activeCat?.column ?? ''}
                onChange={(e) => setSelectedCat(e.target.value)}
                className="rounded-xl border border-slate-200 bg-[#FAF8FD] px-3 py-2 text-sm font-medium text-slate-800 focus:border-[#820AD1] focus:bg-white focus:outline-none"
              >
                {categoricalList.map((c) => (
                  <option key={c.column} value={c.column}>
                    {c.column} ({c.uniqueCount} categorías)
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {categoricalList.length === 0 ? (
          <p className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            No hay variables categóricas ni de fecha en este dataset.
          </p>
        ) : (
          <div className="mt-5 space-y-6">
            <div className="custom-scrollbar overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-[#FAF8FD]">
                  <tr>
                    <th className="px-4 py-2.5 text-xs font-semibold text-slate-700">
                      Variable
                    </th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-700">
                      Categorías únicas
                    </th>
                    <th className="px-4 py-2.5 text-xs font-semibold text-slate-700">
                      Moda (más frecuente)
                    </th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-700">
                      Frecuencia moda
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {categoricalList.map((c) => (
                    <tr
                      key={c.column}
                      onClick={() => setSelectedCat(c.column)}
                      className={`cursor-pointer transition-colors ${
                        activeCat?.column === c.column
                          ? 'bg-[#F5EEFC]/75'
                          : 'hover:bg-[#FAF8FD]'
                      }`}
                    >
                      <td className="whitespace-nowrap px-4 py-2.5 text-xs font-semibold text-slate-900">
                        {c.column}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right text-xs text-slate-700 tabular-nums">
                        {c.uniqueCount.toLocaleString('es-ES')}
                      </td>
                      <td className="max-w-[240px] truncate whitespace-nowrap px-4 py-2.5 text-xs text-slate-700">
                        {c.mode}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right text-xs text-slate-700 tabular-nums">
                        {c.modeCount.toLocaleString('es-ES')} ({c.modePct.toFixed(2)}%)
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {activeCat && (
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-900">
                    Tabla de frecuencias: {activeCat.column}
                  </h4>
                  <span className="text-xs text-slate-500 tabular-nums">
                    {activeCat.uniqueCount} categorías · {activeCat.count.toLocaleString('es-ES')}{' '}
                    valores válidos
                  </span>
                </div>
                <div className="custom-scrollbar max-h-80 overflow-y-auto rounded-xl border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                    <thead className="sticky top-0 bg-[#FAF8FD]">
                      <tr>
                        <th className="px-4 py-2.5 text-xs font-semibold text-slate-600">
                          Categoría / Valor
                        </th>
                        <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-600">
                          Frecuencia absoluta
                        </th>
                        <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-600">
                          Frecuencia relativa (%)
                        </th>
                        <th className="w-40 px-4 py-2.5 text-xs font-semibold text-slate-600">
                          Proporción
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {activeCat.frequencies.slice(0, 100).map((f) => (
                        <tr key={f.value} className="hover:bg-[#FAF8FD]">
                          <td className="max-w-[260px] truncate px-4 py-2 text-xs font-medium text-slate-800">
                            {f.value}
                          </td>
                          <td className="whitespace-nowrap px-4 py-2 text-right text-xs text-slate-700 tabular-nums">
                            {f.count.toLocaleString('es-ES')}
                          </td>
                          <td className="whitespace-nowrap px-4 py-2 text-right text-xs text-slate-700 tabular-nums">
                            {f.pct.toFixed(2)}%
                          </td>
                          <td className="px-4 py-2">
                            <div className="h-2 w-full overflow-hidden rounded-full bg-purple-100/70">
                              <div
                                className="h-full rounded-full bg-[#9F42E3]"
                                style={{ width: `${Math.min(100, f.pct)}%` }}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
