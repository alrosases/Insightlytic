import { useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Database,
  FileSpreadsheet,
  Loader2,
  Upload,
} from 'lucide-react';
import type { ParsedDataset } from '../../types/eda';

interface UploadSectionProps {
  dataset: ParsedDataset | null;
  isLoading: boolean;
  error: string | null;
  onFileSelected: (file: File) => void;
  onLoadSample: () => void;
  onSheetChange: (sheetName: string) => void;
  onGoToSummary: () => void;
}

export function UploadSection({
  dataset,
  isLoading,
  error,
  onFileSelected,
  onLoadSample,
  onSheetChange,
  onGoToSummary,
}: UploadSectionProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      onFileSelected(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelected(file);
    }
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      {/* Hoja de ruta visual para guiar al usuario desde el primer segundo */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-purple-200/80 bg-[#F5EEFC]/60 p-5">
          <p className="text-xs font-semibold text-[#820AD1] tabular-nums">01 · Preparación</p>
          <p className="mt-1.5 text-sm font-semibold text-slate-900">
            Sube tu archivo o usa el ejemplo
          </p>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">
            Acepta CSV, TXT, Excel o JSON y detecta automáticamente separadores y tildes.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 tabular-nums">
            02 · Diagnóstico y Gráficos
          </p>
          <p className="mt-1.5 text-sm font-semibold text-slate-900">
            Revisa calidad y patrones
          </p>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">
            Te guiamos por faltantes, estadísticas, histogramas, gráficos libres y valores atípicos.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 tabular-nums">
            03 · Conclusiones y Reporte
          </p>
          <p className="mt-1.5 text-sm font-semibold text-slate-900">
            Obtén análisis IA y descarga PDF
          </p>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">
            Genera conclusiones en lenguaje sencillo y exporta un informe listo para compartir.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs sm:p-8">
        <div className="max-w-2xl">
          <h2 className="text-xl font-semibold text-slate-900">
            Carga tu conjunto de datos
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
            Selecciona una tabla desde tu equipo para iniciar el recorrido guiado. Todo el cálculo
            ocurre localmente en tu navegador.
          </p>
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`mt-6 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
            isDragging
              ? 'border-[#820AD1] bg-[#F5EEFC]'
              : 'border-purple-200/80 bg-[#FAF8FD] hover:border-[#9F42E3] hover:bg-[#F5EEFC]/50'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.txt,.xlsx,.xls,.json"
            onChange={handleFileChange}
            className="hidden"
          />

          {isLoading ? (
            <div className="flex flex-col items-center gap-3 py-2">
              <Loader2 className="h-9 w-9 animate-spin text-[#820AD1]" />
              <p className="text-sm font-medium text-slate-700">
                Leyendo archivo y calculando estadísticas...
              </p>
            </div>
          ) : (
            <>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F5EEFC] text-[#820AD1]">
                <Upload className="h-6 w-6" />
              </div>
              <p className="mt-4 text-base font-medium text-slate-900">
                Arrastra y suelta tu archivo aquí
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Formatos admitidos: CSV, TXT (coma, punto y coma, tabulación o |), Excel (.xlsx, .xls) y JSON
              </p>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#820AD1] px-5 py-2.5 text-sm font-medium text-white shadow-xs transition-colors hover:bg-[#6D08B1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#820AD1] whitespace-nowrap shrink-0"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Seleccionar archivo
                </button>
                <button
                  type="button"
                  onClick={onLoadSample}
                  className="inline-flex items-center gap-2 rounded-xl border border-purple-200 bg-white px-5 py-2.5 text-sm font-medium text-[#6D08B1] shadow-xs transition-colors hover:bg-[#F5EEFC] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#820AD1] whitespace-nowrap shrink-0"
                >
                  <Database className="h-4 w-4 text-[#820AD1]" />
                  Probar con datos de ejemplo
                </button>
              </div>
            </>
          )}
        </div>

        {error && (
          <div
            role="alert"
            className="mt-5 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50/80 p-4 text-rose-900"
          >
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
            <div>
              <p className="text-sm font-semibold">No se pudo cargar el archivo</p>
              <p className="mt-0.5 text-sm text-rose-800">{error}</p>
            </div>
          </div>
        )}

        {dataset && !isLoading && (
          <div className="mt-6 rounded-xl border border-emerald-200/90 bg-emerald-50/60 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    ¡Listo! Archivo cargado: {dataset.fileName}
                  </p>
                  <p className="mt-1 text-xs text-slate-600 tabular-nums">
                    {dataset.format}
                    {dataset.encoding ? ` · Codificación ${dataset.encoding}` : ''}
                    {dataset.delimiter ? ` · Separador ${dataset.delimiter}` : ''}
                    {' · '}
                    {dataset.rows.length.toLocaleString('es-ES')} filas ·{' '}
                    {dataset.columns.length} columnas
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onGoToSummary}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#820AD1] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#6D08B1] whitespace-nowrap shrink-0"
              >
                Comenzar recorrido
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            {dataset.sheetNames && dataset.sheetNames.length > 1 && (
              <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-emerald-200/70 pt-4">
                <label
                  htmlFor="excel-sheet-select"
                  className="text-xs font-medium text-slate-700"
                >
                  Este archivo Excel tiene {dataset.sheetNames.length} hojas. Hoja activa:
                </label>
                <select
                  id="excel-sheet-select"
                  value={dataset.activeSheet}
                  onChange={(e) => onSheetChange(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 focus:border-[#820AD1] focus:outline-none"
                >
                  {dataset.sheetNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
