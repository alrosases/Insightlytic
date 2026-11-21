import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BoxSelect,
  Calculator,
  Check,
  FileDown,
  FileSpreadsheet,
  LayoutDashboard,
  LineChart,
  Menu,
  SlidersHorizontal,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import type {
  AiAnalysisReport,
  CustomChartConfig,
  NavSectionId,
  ParsedDataset,
  VariableType,
} from './types/eda';
import { createSampleDataset } from './data/sampleDataset';
import { extractExcelSheet, parseDataFile } from './utils/fileParser';
import {
  analyzeDataset,
  buildSummaryForGemini,
  detectVariableTypes,
} from './utils/edaEngine';
import { UploadSection } from './components/sections/UploadSection';
import { SummarySection } from './components/sections/SummarySection';
import { VariablesSection } from './components/sections/VariablesSection';
import { MissingSection } from './components/sections/MissingSection';
import { StatsSection } from './components/sections/StatsSection';
import { HistogramsSection } from './components/sections/HistogramsSection';
import { ChartsSection } from './components/sections/ChartsSection';
import { BoxplotsSection } from './components/sections/BoxplotsSection';
import { AiAnalysisSection } from './components/sections/AiAnalysisSection';
import { ReportSection } from './components/sections/ReportSection';

interface NavItem {
  id: NavSectionId;
  step: number;
  phase: string;
  label: string;
  shortDesc: string;
  guideTip: string;
  icon: typeof Upload;
  requiresData: boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'carga',
    step: 1,
    phase: 'Preparación',
    label: 'Carga',
    shortDesc: 'Subir archivo o ejemplo',
    guideTip:
      'Empieza subiendo un archivo CSV, TXT, Excel o JSON, o carga el conjunto de ejemplo para recorrer la plataforma.',
    icon: Upload,
    requiresData: false,
  },
  {
    id: 'resumen',
    step: 2,
    phase: 'Preparación',
    label: 'Resumen',
    shortDesc: 'Tamaño y vista previa',
    guideTip:
      'Comprueba cuántas filas y columnas tiene tu tabla y revisa en la vista previa que los textos con tildes o ñ se lean bien.',
    icon: LayoutDashboard,
    requiresData: true,
  },
  {
    id: 'variables',
    step: 3,
    phase: 'Preparación',
    label: 'Variables',
    shortDesc: 'Tipos de cada columna',
    guideTip:
      'Verifica que cada columna tenga el tipo correcto (Numérica, Categórica o Fecha). Si alguna requiere ajuste, cámbiala aquí.',
    icon: SlidersHorizontal,
    requiresData: true,
  },
  {
    id: 'faltantes',
    step: 4,
    phase: 'Calidad de datos',
    label: 'Faltantes',
    shortDesc: 'Detectar datos vacíos',
    guideTip:
      'Revisa si existen columnas con muchos valores vacíos. Las que superan el 20 % aparecen resaltadas en rojo suave.',
    icon: AlertTriangle,
    requiresData: true,
  },
  {
    id: 'estadisticas',
    step: 5,
    phase: 'Calidad de datos',
    label: 'Estadísticas',
    shortDesc: 'Promedios y frecuencias',
    guideTip:
      'Consulta promedios, medianas, rangos y cuartiles en variables numéricas, y qué categorías se repiten más en las de texto.',
    icon: Calculator,
    requiresData: true,
  },
  {
    id: 'histogramas',
    step: 6,
    phase: 'Exploración visual',
    label: 'Histogramas',
    shortDesc: 'Distribución numérica',
    guideTip:
      'Observa en qué rangos se agrupan tus valores numéricos y mueve el deslizador para ver más o menos detalle.',
    icon: BarChart3,
    requiresData: true,
  },
  {
    id: 'graficos',
    step: 7,
    phase: 'Exploración visual',
    label: 'Gráficos',
    shortDesc: 'Cruce libre de variables',
    guideTip:
      'Combina dos o tres variables en gráficos de barras, líneas o dispersión y guarda tus favoritos para incluirlos en el PDF.',
    icon: LineChart,
    requiresData: true,
  },
  {
    id: 'boxplots',
    step: 8,
    phase: 'Exploración visual',
    label: 'Boxplots',
    shortDesc: 'Valores extremos (atípicos)',
    guideTip:
      'Detecta automáticamente valores inusualmente altos o bajos (puntos rojos) usando el método del rango intercuartílico.',
    icon: BoxSelect,
    requiresData: true,
  },
  {
    id: 'analisis',
    step: 9,
    phase: 'Conclusiones',
    label: 'Análisis IA',
    shortDesc: 'Tendencias y correlaciones',
    guideTip:
      'Genera un diagnóstico redactado por Gemini a partir del resumen estadístico y explora el mapa de calor de correlaciones.',
    icon: Sparkles,
    requiresData: true,
  },
  {
    id: 'informe',
    step: 10,
    phase: 'Conclusiones',
    label: 'Informe',
    shortDesc: 'Exportar reporte PDF',
    guideTip:
      'Marca las secciones que quieres incluir y descarga un informe PDF completo con portada, gráficos y conclusiones.',
    icon: FileDown,
    requiresData: true,
  },
];

const PHASES = ['Preparación', 'Calidad de datos', 'Exploración visual', 'Conclusiones'];

export default function App() {
  const [activeSection, setActiveSection] = useState<NavSectionId>('carga');
  const [visitedSteps, setVisitedSteps] = useState<Set<NavSectionId>>(
    () => new Set(['carga'])
  );
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const [dataset, setDataset] = useState<ParsedDataset | null>(null);
  const [excelWorkbook, setExcelWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const [detectedTypes, setDetectedTypes] = useState<Record<string, VariableType>>({});
  const [typeOverrides, setTypeOverrides] = useState<Record<string, VariableType>>({});

  const [histogramBins, setHistogramBins] = useState<number>(12);
  const [interactiveChart, setInteractiveChart] = useState<CustomChartConfig>({
    id: 'active',
    title: '',
    chartType: 'bar',
    xVar: '',
    yVar: '',
    colorVar: '__none__',
    aggregation: 'count',
  });
  const [savedCharts, setSavedCharts] = useState<CustomChartConfig[]>([]);

  const [aiReport, setAiReport] = useState<AiAnalysisReport | null>(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const navigateTo = (id: NavSectionId) => {
    setActiveSection(id);
    setVisitedSteps((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    setMobileNavOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const initializeWithDataset = (nextDataset: ParsedDataset) => {
    const detected = detectVariableTypes(nextDataset);
    setDataset(nextDataset);
    setDetectedTypes(detected);
    setTypeOverrides({});
    setSavedCharts([]);
    setAiReport(null);
    setAiError(null);
    setVisitedSteps(new Set(['carga']));

    const cols = nextDataset.columns;
    const firstCat =
      cols.find((c) => detected[c] === 'categorical') ??
      cols.find((c) => detected[c] === 'date') ??
      cols[0] ??
      '';
    const firstNum = cols.find((c) => detected[c] === 'numeric') ?? cols[1] ?? cols[0] ?? '';

    setInteractiveChart({
      id: 'active',
      title: '',
      chartType: 'bar',
      xVar: firstCat,
      yVar: firstNum,
      colorVar: '__none__',
      aggregation: firstNum ? 'avg' : 'count',
    });
  };

  const handleFileSelected = async (file: File) => {
    setIsLoadingFile(true);
    setFileError(null);
    try {
      const result = await parseDataFile(file);
      setExcelWorkbook(result.excelWorkbook ?? null);
      initializeWithDataset(result.dataset);
    } catch (err) {
      setFileError(
        err instanceof Error ? err.message : 'No se pudo procesar el archivo seleccionado.'
      );
    } finally {
      setIsLoadingFile(false);
    }
  };

  const handleLoadSample = () => {
    setFileError(null);
    setExcelWorkbook(null);
    const sample = createSampleDataset();
    initializeWithDataset(sample);
    navigateTo('resumen');
  };

  const handleExcelSheetChange = (sheetName: string) => {
    if (!excelWorkbook || !dataset) return;
    setFileError(null);
    try {
      const nextDataset = extractExcelSheet(
        excelWorkbook,
        sheetName,
        dataset.fileName,
        dataset.fileSizeBytes
      );
      initializeWithDataset(nextDataset);
    } catch (err) {
      setFileError(
        err instanceof Error ? err.message : 'Error al cambiar de hoja de Excel.'
      );
    }
  };

  const analysis = useMemo(() => {
    if (!dataset) return null;
    return analyzeDataset(dataset, detectedTypes, typeOverrides);
  }, [dataset, detectedTypes, typeOverrides]);

  const handleOverrideType = (column: string, newType: VariableType) => {
    setTypeOverrides((prev) => {
      if (detectedTypes[column] === newType) {
        const copy = { ...prev };
        delete copy[column];
        return copy;
      }
      return { ...prev, [column]: newType };
    });
  };

  const handleGenerateAi = async () => {
    if (!dataset || !analysis) return;
    setIsGeneratingAi(true);
    setAiError(null);
    try {
      const summary = buildSummaryForGemini(dataset, analysis);
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary }),
      });

      const payload = (await response.json()) as {
        analysis?: AiAnalysisReport;
        error?: string;
      };

      if (!response.ok || !payload.analysis) {
        throw new Error(
          payload.error || 'No se pudo obtener la respuesta del análisis inteligente.'
        );
      }

      setAiReport(payload.analysis);
    } catch (err) {
      setAiError(
        err instanceof Error
          ? err.message
          : 'Error de conexión al generar el análisis con Gemini.'
      );
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const activeIndex = NAV_ITEMS.findIndex((n) => n.id === activeSection);
  const activeNavMeta = NAV_ITEMS[activeIndex] ?? NAV_ITEMS[0];
  const prevStep = activeIndex > 0 ? NAV_ITEMS[activeIndex - 1] : null;
  const nextStep =
    activeIndex < NAV_ITEMS.length - 1 ? NAV_ITEMS[activeIndex + 1] : null;

  const progressPct = dataset
    ? Math.round((visitedSteps.size / NAV_ITEMS.length) * 100)
    : 10;

  const handleSelectNav = (item: NavItem) => {
    if (item.requiresData && !dataset) return;
    navigateTo(item.id);
  };

  return (
    <div className="flex min-h-screen bg-[#FAF8FD] text-slate-800">
      {/* Backdrop móvil */}
      {mobileNavOpen && (
        <div
          onClick={() => setMobileNavOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-[1px] lg:hidden"
        />
      )}

      {/* Barra lateral guiada por fases */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-purple-100/90 bg-white transition-transform duration-200 lg:static lg:translate-x-0 ${
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-100 px-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#820AD1] text-white shadow-xs">
              <FileSpreadsheet className="h-4 w-4" />
            </div>
            <span className="font-display text-base font-bold tracking-tight text-[#1A0B2E] whitespace-nowrap">
              Explorador de Datos
            </span>
          </div>
          <button
            type="button"
            onClick={() => setMobileNavOpen(false)}
            aria-label="Cerrar menú"
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Barra de progreso del recorrido */}
        <div className="border-b border-slate-100 px-5 py-3.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-slate-600">Recorrido guiado</span>
            <span className="font-semibold text-[#820AD1] tabular-nums">
              Paso {activeNavMeta.step} de {NAV_ITEMS.length}
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-purple-100">
            <div
              className="h-full rounded-full bg-[#820AD1] transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        <nav
          aria-label="Pasos del análisis"
          className="custom-scrollbar flex-1 space-y-5 overflow-y-auto px-3 py-4"
        >
          {PHASES.map((phaseName) => {
            const phaseItems = NAV_ITEMS.filter((i) => i.phase === phaseName);
            return (
              <div key={phaseName}>
                <p className="mb-1.5 px-3 text-[11px] font-semibold tracking-wide text-slate-400">
                  {phaseName}
                </p>
                <div className="space-y-1">
                  {phaseItems.map((item) => {
                    const Icon = item.icon;
                    const disabled = item.requiresData && !dataset;
                    const isActive = activeSection === item.id;
                    const isVisited = Boolean(dataset) && visitedSteps.has(item.id) && !isActive;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        disabled={disabled}
                        onClick={() => handleSelectNav(item)}
                        title={
                          disabled
                            ? 'Carga primero un archivo de datos para desbloquear este paso'
                            : `${item.label}: ${item.shortDesc}`
                        }
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors ${
                          isActive
                            ? 'bg-[#F5EEFC] text-[#6D08B1]'
                            : disabled
                              ? 'cursor-not-allowed text-slate-400/75'
                              : 'text-slate-600 hover:bg-[#FAF8FD] hover:text-slate-900'
                        }`}
                      >
                        <span
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[11px] font-semibold tabular-nums ${
                            isActive
                              ? 'bg-[#820AD1] text-white'
                              : isVisited
                                ? 'bg-emerald-100 text-emerald-700'
                                : disabled
                                  ? 'bg-slate-100 text-slate-400'
                                  : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {isVisited ? (
                            <Check className="h-3.5 w-3.5" />
                          ) : (
                            String(item.step).padStart(2, '0')
                          )}
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`truncate text-sm font-medium ${
                                isActive ? 'text-[#4C0582]' : ''
                              }`}
                            >
                              {item.label}
                            </span>
                            <Icon
                              className={`h-3.5 w-3.5 shrink-0 ${
                                isActive
                                  ? 'text-[#820AD1]'
                                  : disabled
                                    ? 'text-slate-300'
                                    : 'text-slate-400'
                              }`}
                            />
                          </div>
                          <p className="truncate text-[11px] text-slate-400">
                            {item.shortDesc}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="border-t border-slate-100 p-4">
          {dataset && analysis ? (
            <div className="text-xs text-slate-600">
              <p className="truncate font-semibold text-slate-900" title={dataset.fileName}>
                {dataset.fileName}
              </p>
              <p className="mt-1 text-slate-500 tabular-nums">
                {analysis.rowCount.toLocaleString('es-ES')} filas · {analysis.colCount} variables
              </p>
            </div>
          ) : (
            <p className="text-xs leading-relaxed text-slate-500">
              Completa el Paso 01 para desbloquear el recorrido completo de análisis.
            </p>
          )}
        </div>
      </aside>

      {/* Contenido principal */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-purple-100/90 bg-white/95 px-4 backdrop-blur-xs sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Abrir menú"
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex min-w-0 items-center gap-2 text-sm">
              <span className="hidden text-slate-400 sm:inline whitespace-nowrap">
                {activeNavMeta.phase}
              </span>
              <span className="hidden text-slate-300 sm:inline" aria-hidden="true">
                /
              </span>
              <h1 className="truncate font-display text-base font-semibold text-[#1A0B2E]">
                {String(activeNavMeta.step).padStart(2, '0')}. {activeNavMeta.label}
              </h1>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-4">
            {dataset && analysis && (
              <span className="hidden text-xs text-slate-500 md:inline tabular-nums">
                {dataset.fileName} · {analysis.rowCount.toLocaleString('es-ES')} filas ·{' '}
                {analysis.colCount} columnas
              </span>
            )}

            {dataset ? (
              <button
                type="button"
                onClick={() => navigateTo('informe')}
                className="rounded-xl bg-[#820AD1] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-[#6D08B1] whitespace-nowrap shrink-0"
              >
                Exportar PDF
              </button>
            ) : (
              <button
                type="button"
                onClick={handleLoadSample}
                className="rounded-xl border border-purple-200 bg-white px-4 py-2 text-xs font-medium text-[#6D08B1] transition-colors hover:bg-[#F5EEFC] whitespace-nowrap shrink-0"
              >
                Probar ejemplo
              </button>
            )}
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 p-4 sm:p-6 lg:p-8">
          {/* Guía contextual del paso actual */}
          <div className="mb-6 flex flex-col gap-2 rounded-2xl border border-purple-100 bg-white px-5 py-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold text-[#820AD1] tabular-nums">
                Paso {activeNavMeta.step} de {NAV_ITEMS.length} · {activeNavMeta.phase}
              </p>
              <p className="mt-0.5 text-sm text-slate-700">{activeNavMeta.guideTip}</p>
            </div>
          </div>

          {activeSection === 'carga' && (
            <UploadSection
              dataset={dataset}
              isLoading={isLoadingFile}
              error={fileError}
              onFileSelected={handleFileSelected}
              onLoadSample={handleLoadSample}
              onSheetChange={handleExcelSheetChange}
              onGoToSummary={() => navigateTo('resumen')}
            />
          )}

          {dataset && analysis && activeSection === 'resumen' && (
            <SummarySection dataset={dataset} analysis={analysis} />
          )}

          {dataset && analysis && activeSection === 'variables' && (
            <VariablesSection
              analysis={analysis}
              typeOverrides={typeOverrides}
              onOverrideType={handleOverrideType}
              onResetOverrides={() => setTypeOverrides({})}
            />
          )}

          {dataset && analysis && activeSection === 'faltantes' && (
            <MissingSection analysis={analysis} />
          )}

          {dataset && analysis && activeSection === 'estadisticas' && (
            <StatsSection analysis={analysis} />
          )}

          {dataset && analysis && activeSection === 'histogramas' && (
            <HistogramsSection
              analysis={analysis}
              bins={histogramBins}
              onBinsChange={setHistogramBins}
            />
          )}

          {dataset && analysis && activeSection === 'graficos' && (
            <ChartsSection
              dataset={dataset}
              analysis={analysis}
              config={interactiveChart}
              onConfigChange={setInteractiveChart}
              savedCharts={savedCharts}
              onSaveChart={(cfg) => setSavedCharts((prev) => [...prev, cfg])}
              onRemoveSavedChart={(id) =>
                setSavedCharts((prev) => prev.filter((c) => c.id !== id))
              }
            />
          )}

          {dataset && analysis && activeSection === 'boxplots' && (
            <BoxplotsSection analysis={analysis} />
          )}

          {dataset && analysis && activeSection === 'analisis' && (
            <AiAnalysisSection
              analysis={analysis}
              aiReport={aiReport}
              isGenerating={isGeneratingAi}
              error={aiError}
              onGenerate={handleGenerateAi}
            />
          )}

          {dataset && analysis && activeSection === 'informe' && (
            <ReportSection
              dataset={dataset}
              analysis={analysis}
              histogramBins={histogramBins}
              savedCharts={savedCharts}
              activeInteractiveChart={interactiveChart}
              aiAnalysis={aiReport}
            />
          )}

          {/* Navegación guiada inferior entre pasos */}
          {dataset && (
            <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-purple-100 pt-6">
              {prevStep ? (
                <button
                  type="button"
                  onClick={() => navigateTo(prevStep.id)}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-xs transition-colors hover:bg-slate-50 hover:text-slate-900 whitespace-nowrap"
                >
                  <ArrowLeft className="h-4 w-4 text-slate-400" />
                  Paso {prevStep.step}: {prevStep.label}
                </button>
              ) : (
                <div />
              )}

              {nextStep && (
                <button
                  type="button"
                  onClick={() => navigateTo(nextStep.id)}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#820AD1] px-5 py-2.5 text-sm font-medium text-white shadow-xs transition-colors hover:bg-[#6D08B1] whitespace-nowrap"
                >
                  Continuar al Paso {nextStep.step}: {nextStep.label}
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
