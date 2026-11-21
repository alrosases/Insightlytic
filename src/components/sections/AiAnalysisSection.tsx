import { useMemo } from 'react';
import { AlertCircle, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import type { AiAnalysisReport, DatasetAnalysis } from '../../types/eda';
import { buildCorrelationHeatmap } from '../../utils/chartBuilder';
import { HelpTip } from '../HelpTip';
import { PlotlyChart } from '../PlotlyChart';

interface AiAnalysisSectionProps {
  analysis: DatasetAnalysis;
  aiReport: AiAnalysisReport | null;
  isGenerating: boolean;
  error: string | null;
  onGenerate: () => void;
}

export function AiAnalysisSection({
  analysis,
  aiReport,
  isGenerating,
  error,
  onGenerate,
}: AiAnalysisSectionProps) {
  const heatmap = useMemo(
    () => buildCorrelationHeatmap(analysis.correlations),
    [analysis.correlations]
  );

  const hasEnoughForCorr = analysis.correlations.columns.length >= 2;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold text-slate-900">
                Análisis de tendencias y conclusiones con IA
              </h2>
              <HelpTip
                title="¿Qué información se envía a Gemini?"
                text="Solo se envía un resumen estadístico (cantidad de filas, tipos, medias, atípicos, frecuencias principales y correlaciones). Nunca se envían tus filas individuales."
              />
            </div>
            <p className="mt-1 text-sm text-slate-600">
              Genera una interpretación experta en lenguaje claro sobre calidad, patrones y recomendaciones.
            </p>
          </div>

          <button
            type="button"
            disabled={isGenerating}
            onClick={onGenerate}
            className="inline-flex items-center gap-2 rounded-xl bg-[#820AD1] px-5 py-2.5 text-sm font-medium text-white shadow-xs transition-colors hover:bg-[#6D08B1] disabled:cursor-not-allowed disabled:opacity-60 whitespace-nowrap shrink-0"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analizando resumen...
              </>
            ) : aiReport ? (
              <>
                <RefreshCw className="h-4 w-4" />
                Regenerar análisis
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generar análisis experto
              </>
            )}
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-5 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50/80 p-4 text-rose-900"
          >
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
            <div>
              <p className="text-sm font-semibold">No se pudo completar el análisis</p>
              <p className="mt-0.5 text-sm text-rose-800">{error}</p>
            </div>
          </div>
        )}

        {!aiReport && !isGenerating && !error && (
          <div className="mt-6 rounded-xl border border-dashed border-purple-200 bg-[#FAF8FD] p-8 text-center">
            <p className="text-sm font-medium text-slate-800">
              Pulsa &ldquo;Generar análisis experto&rdquo; para obtener conclusiones redactadas por Gemini
            </p>
            <p className="mx-auto mt-1.5 max-w-xl text-xs leading-relaxed text-slate-500">
              El informe incluirá resumen general, calidad de los datos, tendencias, relaciones
              entre variables, conclusiones clave y recomendaciones prácticas.
            </p>
          </div>
        )}

        {isGenerating && !aiReport && (
          <div className="mt-6 space-y-3">
            <div className="h-24 animate-pulse rounded-xl bg-purple-100/60" />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="h-36 animate-pulse rounded-xl bg-purple-100/60" />
              <div className="h-36 animate-pulse rounded-xl bg-purple-100/60" />
            </div>
          </div>
        )}

        {aiReport && (
          <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
            <article className="rounded-xl border border-purple-200/70 bg-[#F5EEFC]/60 p-5 lg:col-span-2">
              <h3 className="text-base font-semibold text-[#3B0764]">
                a) {aiReport.resumenGeneral.titulo}
              </h3>
              <div className="mt-2.5 space-y-2 text-sm leading-relaxed text-slate-700">
                {aiReport.resumenGeneral.parrafos.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
              {aiReport.resumenGeneral.puntosClave.length > 0 && (
                <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-slate-700">
                  {aiReport.resumenGeneral.puntosClave.map((pt, i) => (
                    <li key={i}>{pt}</li>
                  ))}
                </ul>
              )}
            </article>

            <article className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="text-base font-semibold text-slate-900">
                b) {aiReport.calidadDatos.titulo}
              </h3>
              <p className="mt-2 text-sm font-medium text-slate-700">
                {aiReport.calidadDatos.evaluacion}
              </p>
              <ul className="mt-2.5 list-disc space-y-1.5 pl-5 text-sm text-slate-600">
                {aiReport.calidadDatos.puntos.map((pt, i) => (
                  <li key={i}>{pt}</li>
                ))}
              </ul>
            </article>

            <article className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="text-base font-semibold text-slate-900">
                c) {aiReport.tendenciasPatrones.titulo}
              </h3>
              <ul className="mt-2.5 list-disc space-y-1.5 pl-5 text-sm text-slate-600">
                {aiReport.tendenciasPatrones.puntos.map((pt, i) => (
                  <li key={i}>{pt}</li>
                ))}
              </ul>
            </article>

            <article className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="text-base font-semibold text-slate-900">
                d) {aiReport.relacionesVariables.titulo}
              </h3>
              <ul className="mt-2.5 list-disc space-y-1.5 pl-5 text-sm text-slate-600">
                {aiReport.relacionesVariables.puntos.map((pt, i) => (
                  <li key={i}>{pt}</li>
                ))}
              </ul>
            </article>

            <article className="rounded-xl border border-teal-100 bg-teal-50/40 p-5">
              <h3 className="text-base font-semibold text-teal-950">
                e) {aiReport.conclusionesClave.titulo}
              </h3>
              <ul className="mt-2.5 list-disc space-y-1.5 pl-5 text-sm text-slate-700">
                {aiReport.conclusionesClave.puntos.map((pt, i) => (
                  <li key={i}>{pt}</li>
                ))}
              </ul>
            </article>

            <article className="rounded-xl border border-amber-100 bg-amber-50/40 p-5 lg:col-span-2">
              <h3 className="text-base font-semibold text-amber-950">
                f) {aiReport.recomendaciones.titulo}
              </h3>
              <ul className="mt-2.5 list-disc space-y-1.5 pl-5 text-sm text-slate-700">
                {aiReport.recomendaciones.puntos.map((pt, i) => (
                  <li key={i}>{pt}</li>
                ))}
              </ul>
            </article>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-slate-900">
            Mapa de calor de correlaciones (Pearson)
          </h3>
          <HelpTip
            title="¿Cómo interpretar la correlación?"
            text="Va de -1 a +1. Valores cercanos a +1 indican que cuando una variable sube, la otra también. Valores cercanos a -1 indican que cuando una sube, la otra baja. Cerca de 0 significa poca relación lineal."
          />
        </div>
        <p className="mt-1 text-sm text-slate-600">
          Relación lineal entre pares de variables numéricas.
        </p>

        {!hasEnoughForCorr ? (
          <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            Se necesitan al menos 2 variables numéricas para calcular la matriz de correlaciones.
          </p>
        ) : (
          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
            <PlotlyChart
              data={heatmap.data}
              layout={heatmap.layout}
              height={Math.max(360, analysis.correlations.columns.length * 46 + 120)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
