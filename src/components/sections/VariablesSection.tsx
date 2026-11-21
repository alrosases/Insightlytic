import { useState } from 'react';
import { Calendar, Hash, RotateCcw, Search, Type as TypeIcon } from 'lucide-react';
import type { DatasetAnalysis, VariableType } from '../../types/eda';
import { HelpTip } from '../HelpTip';

interface VariablesSectionProps {
  analysis: DatasetAnalysis;
  typeOverrides: Record<string, VariableType>;
  onOverrideType: (column: string, newType: VariableType) => void;
  onResetOverrides: () => void;
}

const TYPE_META: Record<
  VariableType,
  { label: string; bg: string; text: string; icon: typeof Hash }
> = {
  numeric: {
    label: 'Numérica',
    bg: 'bg-[#F5EEFC] border-purple-200',
    text: 'text-[#6D08B1]',
    icon: Hash,
  },
  categorical: {
    label: 'Categórica',
    bg: 'bg-teal-50 border-teal-200',
    text: 'text-teal-700',
    icon: TypeIcon,
  },
  date: {
    label: 'Fecha',
    bg: 'bg-amber-50 border-amber-200',
    text: 'text-amber-700',
    icon: Calendar,
  },
};

export function VariablesSection({
  analysis,
  typeOverrides,
  onOverrideType,
  onResetOverrides,
}: VariablesSectionProps) {
  const [query, setQuery] = useState('');

  const filtered = analysis.variables.filter((v) =>
    v.name.toLowerCase().includes(query.trim().toLowerCase())
  );

  const overrideCount = Object.keys(typeOverrides).length;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold text-slate-900">Tipos de variables</h2>
              <HelpTip
                title="Clasificación de variables"
                text="Numérica: cantidades o medidas que se pueden sumar o promediar. Categórica: textos, etiquetas o grupos. Fecha: días o marcas temporales. Si el sistema clasificó mal una columna, cámbiala con el menú desplegable."
              />
            </div>
            <p className="mt-1 text-sm text-slate-600">
              Revisa o corrige cómo se interpreta cada columna. Los gráficos y estadísticas se actualizarán al instante.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar variable..."
                className="w-56 rounded-xl border border-slate-200 bg-[#FAF8FD] py-2 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#820AD1] focus:bg-white focus:outline-none"
              />
            </div>
            {overrideCount > 0 && (
              <button
                type="button"
                onClick={onResetOverrides}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Restablecer ({overrideCount})
              </button>
            )}
          </div>
        </div>

        <div className="custom-scrollbar mt-5 overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-[#FAF8FD]">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold text-slate-600">Variable</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-600">Tipo actual</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">
                  Valores únicos
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-600">
                  Ejemplo de valor
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-600">
                  Corregir tipo
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filtered.map((variable) => {
                const meta = TYPE_META[variable.type];
                const Icon = meta.icon;
                const isOverridden = variable.type !== variable.detectedType;

                return (
                  <tr key={variable.name} className="hover:bg-[#FAF8FD]">
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">
                      {variable.name}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium ${meta.bg} ${meta.text}`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {meta.label}
                      </span>
                      {isOverridden && (
                        <span className="ml-2 text-xs text-slate-400">(editado)</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-slate-700 tabular-nums">
                      {variable.uniqueCount.toLocaleString('es-ES')}
                    </td>
                    <td
                      className="max-w-[220px] truncate whitespace-nowrap px-4 py-3 text-xs text-slate-600 tabular-nums"
                      title={variable.exampleValue}
                    >
                      {variable.exampleValue}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <select
                        aria-label={`Cambiar tipo de ${variable.name}`}
                        value={variable.type}
                        onChange={(e) =>
                          onOverrideType(variable.name, e.target.value as VariableType)
                        }
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:border-[#820AD1] focus:outline-none"
                      >
                        <option value="numeric">Numérica</option>
                        <option value="categorical">Categórica</option>
                        <option value="date">Fecha</option>
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
