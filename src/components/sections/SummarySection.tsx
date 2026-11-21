import type { DatasetAnalysis, ParsedDataset } from '../../types/eda';
import { formatValueDisplay } from '../../utils/edaEngine';
import { HelpTip } from '../HelpTip';

interface SummarySectionProps {
  dataset: ParsedDataset;
  analysis: DatasetAnalysis;
}

export function SummarySection({ dataset, analysis }: SummarySectionProps) {
  const previewRows = dataset.rows.slice(0, 3);

  const cards = [
    {
      label: 'Registros (filas)',
      value: analysis.rowCount.toLocaleString('es-ES'),
      helperTitle: 'Registros o filas',
      helperText:
        'Cada fila representa una observación individual (por ejemplo, una venta, un cliente o una encuesta).',
      tone: 'bg-[#F5EEFC]/75 border-purple-200/80',
      valueColor: 'text-[#3B0764]',
    },
    {
      label: 'Variables (columnas)',
      value: analysis.colCount.toLocaleString('es-ES'),
      helperTitle: 'Variables o columnas',
      helperText:
        'Cada columna corresponde a una característica o dato medido en cada registro (como precio, fecha o región).',
      tone: 'bg-teal-50/70 border-teal-100',
      valueColor: 'text-teal-950',
    },
    {
      label: 'Datos faltantes',
      value: `${analysis.totalMissingPct.toFixed(2)}%`,
      subtext: `${analysis.totalMissingCount.toLocaleString('es-ES')} celdas vacías`,
      helperTitle: 'Porcentaje total de datos faltantes',
      helperText:
        'Porcentaje de celdas sin valor (vacías, "NA", "N/A", "null" o "-") respecto al total de celdas de la tabla.',
      tone:
        analysis.totalMissingPct > 20
          ? 'bg-rose-50/80 border-rose-200'
          : 'bg-purple-50/50 border-purple-100',
      valueColor: analysis.totalMissingPct > 20 ? 'text-rose-900' : 'text-[#4C0582]',
    },
    {
      label: 'Filas duplicadas',
      value: analysis.duplicateRowCount.toLocaleString('es-ES'),
      subtext:
        analysis.duplicateRowCount === 0
          ? 'Sin filas repetidas'
          : `${((analysis.duplicateRowCount / Math.max(1, analysis.rowCount)) * 100).toFixed(2)}% del total`,
      helperTitle: 'Filas duplicadas',
      helperText:
        'Cantidad de filas que son exactamente iguales a otra fila anterior en todas sus columnas.',
      tone:
        analysis.duplicateRowCount > 0
          ? 'bg-amber-50/70 border-amber-200'
          : 'bg-emerald-50/70 border-emerald-100',
      valueColor:
        analysis.duplicateRowCount > 0 ? 'text-amber-950' : 'text-emerald-950',
    },
  ];

  return (
    <div className="space-y-6">
      <section aria-labelledby="resumen-heading">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 id="resumen-heading" className="text-xl font-semibold text-slate-900">
              Resumen general del dataset
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Radiografía rápida del tamaño, completitud y registros repetidos de{' '}
              <span className="font-medium text-slate-800">{dataset.fileName}</span>.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((c) => (
            <div
              key={c.label}
              className={`rounded-2xl border p-5 shadow-xs ${c.tone}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-600">{c.label}</span>
                <HelpTip title={c.helperTitle} text={c.helperText} />
              </div>
              <p className={`mt-3 text-3xl font-semibold tabular-nums ${c.valueColor}`}>
                {c.value}
              </p>
              {c.subtext && (
                <p className="mt-1 text-xs text-slate-600 tabular-nums">{c.subtext}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      <section
        aria-labelledby="preview-heading"
        className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 id="preview-heading" className="text-lg font-semibold text-slate-900">
              Vista previa de los datos
            </h3>
            <p className="mt-0.5 text-sm text-slate-600">
              Primeras 3 filas de la tabla para comprobar que las columnas y textos se leen bien.
            </p>
          </div>
          <span className="text-xs text-slate-500 tabular-nums">
            Mostrando {previewRows.length} de {analysis.rowCount.toLocaleString('es-ES')} filas
          </span>
        </div>

        <div className="custom-scrollbar mt-4 overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="whitespace-nowrap px-3.5 py-2.5 text-xs font-semibold text-slate-500">
                  #
                </th>
                {dataset.columns.map((col) => (
                  <th
                    key={col}
                    className="whitespace-nowrap px-4 py-2.5 text-xs font-semibold text-slate-700"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {previewRows.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/70">
                  <td className="whitespace-nowrap px-3.5 py-2.5 text-xs text-slate-400 tabular-nums">
                    {idx + 1}
                  </td>
                  {dataset.columns.map((col) => {
                    const formatted = formatValueDisplay(row[col]);
                    return (
                      <td
                        key={col}
                        className={`max-w-[240px] truncate whitespace-nowrap px-4 py-2.5 text-xs tabular-nums ${
                          formatted === '—' ? 'text-slate-400 italic' : 'text-slate-700'
                        }`}
                        title={formatted}
                      >
                        {formatted}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
