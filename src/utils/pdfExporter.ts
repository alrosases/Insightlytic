import { jsPDF } from 'jspdf';
import Plotly from 'plotly.js-dist-min';
import type { Data, Layout } from 'plotly.js';
import type {
  AiAnalysisReport,
  CustomChartConfig,
  DatasetAnalysis,
  ParsedDataset,
  PdfSectionSelection,
} from '../types/eda';
import {
  buildBoxplotChart,
  buildCorrelationHeatmap,
  buildHistogramChart,
  buildInteractiveChart,
  buildMissingValuesChart,
} from './chartBuilder';
import { formatValueDisplay } from './edaEngine';

function sanitizePdfText(str: string): string {
  return str
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2022/g, '-')
    .replace(/\u2192/g, '->')
    .replace(/\u2264/g, '<=')
    .replace(/\u2265/g, '>=')
    .replace(/\u20AC/g, 'EUR');
}

async function renderPlotToDataUrl(
  data: Data[],
  layout: Partial<Layout>,
  width = 760,
  height = 380
): Promise<string> {
  const tempDiv = document.createElement('div');
  tempDiv.style.position = 'fixed';
  tempDiv.style.left = '-9999px';
  tempDiv.style.top = '-9999px';
  tempDiv.style.width = `${width}px`;
  tempDiv.style.height = `${height}px`;
  document.body.appendChild(tempDiv);

  try {
    await Plotly.newPlot(
      tempDiv,
      data,
      {
        ...layout,
        paper_bgcolor: '#FFFFFF',
        plot_bgcolor: '#FFFFFF',
        width,
        height,
      },
      { staticPlot: true }
    );
    const dataUrl = await Plotly.toImage(tempDiv, {
      format: 'png',
      width,
      height,
      scale: 2,
    });
    return dataUrl;
  } finally {
    Plotly.purge(tempDiv);
    document.body.removeChild(tempDiv);
  }
}

export interface ExportPdfOptions {
  dataset: ParsedDataset;
  analysis: DatasetAnalysis;
  sections: PdfSectionSelection;
  histogramBins: number;
  savedCharts: CustomChartConfig[];
  activeInteractiveChart: CustomChartConfig | null;
  aiAnalysis: AiAnalysisReport | null;
  onProgress?: (label: string) => void;
}

export async function generatePdfReport({
  dataset,
  analysis,
  sections,
  histogramBins,
  savedCharts,
  activeInteractiveChart,
  aiAnalysis,
  onProgress,
}: ExportPdfOptions): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const ensureSpace = (neededMm: number, sectionTitle?: string) => {
    if (y + neededMm > pageHeight - 18) {
      doc.addPage();
      y = margin + 4;
      if (sectionTitle) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(148, 163, 184);
        doc.text(sanitizePdfText(`${dataset.fileName} - ${sectionTitle}`), margin, 11);
      }
    }
  };

  const drawSectionHeader = (title: string, subtitle?: string) => {
    ensureSpace(22);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(26, 11, 46);
    doc.text(sanitizePdfText(title), margin, y);
    y += 2.5;
    doc.setDrawColor(192, 132, 252);
    doc.setLineWidth(0.7);
    doc.line(margin, y, margin + contentWidth, y);
    y += 5;
    if (subtitle) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(100, 116, 139);
      const lines = doc.splitTextToSize(sanitizePdfText(subtitle), contentWidth);
      doc.text(lines, margin, y);
      y += lines.length * 4.5 + 3;
    }
  };

  const drawTable = (
    headers: string[],
    rows: string[][],
    colWidths: number[],
    sectionName: string
  ) => {
    const rowHeight = 7;
    ensureSpace(16, sectionName);

    // Header row
    doc.setFillColor(245, 238, 252);
    doc.rect(margin, y, contentWidth, rowHeight, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);

    let x = margin + 2;
    headers.forEach((h, idx) => {
      const maxChars = Math.max(4, Math.floor(colWidths[idx] / 1.9));
      const clean = sanitizePdfText(h);
      const clipped = clean.length > maxChars ? `${clean.slice(0, maxChars - 1)}.` : clean;
      doc.text(clipped, x, y + 4.8);
      x += colWidths[idx];
    });
    y += rowHeight;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.2);
    rows.forEach((row, rIdx) => {
      ensureSpace(rowHeight + 2, sectionName);
      if (rIdx % 2 === 1) {
        doc.setFillColor(250, 248, 253);
        doc.rect(margin, y, contentWidth, rowHeight, 'F');
      }
      doc.setTextColor(30, 41, 59);
      let cx = margin + 2;
      row.forEach((cell, cIdx) => {
        const maxChars = Math.max(4, Math.floor(colWidths[cIdx] / 1.85));
        const clean = sanitizePdfText(cell);
        const clipped = clean.length > maxChars ? `${clean.slice(0, maxChars - 1)}.` : clean;
        doc.text(clipped, cx, y + 4.8);
        cx += colWidths[cIdx];
      });
      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(0.2);
      doc.line(margin, y + rowHeight, margin + contentWidth, y + rowHeight);
      y += rowHeight;
    });
    y += 5;
  };

  // --- PORTADA ---
  onProgress?.('Generando portada del informe...');
  doc.setFillColor(245, 238, 252);
  doc.rect(0, 0, pageWidth, 82, 'F');
  doc.setFillColor(130, 10, 209);
  doc.rect(0, 82, pageWidth, 1.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(130, 10, 209);
  doc.text('EXPLORADOR DE DATOS', margin, 26);

  doc.setFontSize(24);
  doc.setTextColor(15, 23, 42);
  doc.text('Informe de Analisis Exploratorio', margin, 42);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Resumen descriptivo, calidad de datos, visualizaciones y conclusiones', margin, 52);

  const fechaHoy = new Date().toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Ficha técnica en portada
  y = 104;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, 56, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text('Ficha del conjunto de datos', margin + 8, y + 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  const fichaItems = [
    `Archivo analizado: ${dataset.fileName}`,
    `Formato detectado: ${dataset.format}${dataset.encoding ? ` (${dataset.encoding})` : ''}`,
    `Fecha del informe: ${fechaHoy}`,
    `Dimensiones: ${analysis.rowCount.toLocaleString('es-ES')} registros x ${analysis.colCount} variables`,
    `Datos faltantes totales: ${analysis.totalMissingPct.toFixed(2)}% | Filas duplicadas: ${analysis.duplicateRowCount}`,
  ];
  fichaItems.forEach((line, idx) => {
    doc.text(sanitizePdfText(line), margin + 8, y + 22 + idx * 6.5);
  });

  // Índice de secciones incluidas
  y = 178;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text('Secciones incluidas en este informe', margin, y);
  y += 8;

  const includedLabels: string[] = [];
  if (sections.resumen) includedLabels.push('1. Resumen general del dataset');
  if (sections.vistaPrevia) includedLabels.push('2. Vista previa (primeras 3 filas)');
  if (sections.variables) includedLabels.push('3. Tipos de variables');
  if (sections.faltantes) includedLabels.push('4. Analisis de datos faltantes');
  if (sections.estadisticas) includedLabels.push('5. Estadistica descriptiva');
  if (sections.histogramas) includedLabels.push('6. Distribucion (Histogramas)');
  if (sections.boxplots) includedLabels.push('7. Boxplots y valores atipicos (IQR)');
  if (sections.graficosUsuario) includedLabels.push('8. Graficos interactivos y correlaciones');
  if (sections.analisisIA) includedLabels.push('9. Analisis de tendencias y conclusiones (IA)');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  includedLabels.forEach((lbl) => {
    doc.text(sanitizePdfText(`- ${lbl}`), margin + 4, y);
    y += 6.5;
  });

  doc.addPage();
  y = margin + 4;

  // --- 1. RESUMEN GENERAL ---
  if (sections.resumen) {
    onProgress?.('Añadiendo resumen general...');
    drawSectionHeader('1. Resumen General');
    const cardW = (contentWidth - 9) / 4;
    const cards = [
      { label: 'Registros (filas)', val: analysis.rowCount.toLocaleString('es-ES') },
      { label: 'Variables (columnas)', val: String(analysis.colCount) },
      { label: 'Faltantes totales', val: `${analysis.totalMissingPct.toFixed(2)}%` },
      { label: 'Filas duplicadas', val: analysis.duplicateRowCount.toLocaleString('es-ES') },
    ];
    cards.forEach((c, idx) => {
      const cx = margin + idx * (cardW + 3);
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(cx, y, cardW, 20, 2, 2, 'FD');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(c.label, cx + 4, y + 7);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(30, 41, 59);
      doc.text(c.val, cx + 4, y + 15.5);
    });
    y += 28;
  }

  // --- 2. VISTA PREVIA ---
  if (sections.vistaPrevia) {
    onProgress?.('Añadiendo vista previa...');
    drawSectionHeader(
      '2. Vista Previa (Primeras 3 filas)',
      dataset.columns.length > 7
        ? 'Nota: Se muestran las primeras 7 columnas para mantener la legibilidad en pagina.'
        : undefined
    );
    const cols = dataset.columns.slice(0, 7);
    const colW = contentWidth / cols.length;
    const previewRows = dataset.rows
      .slice(0, 3)
      .map((r) => cols.map((c) => formatValueDisplay(r[c])));
    drawTable(
      cols,
      previewRows,
      cols.map(() => colW),
      'Vista Previa'
    );
  }

  // --- 3. TIPOS DE VARIABLES ---
  if (sections.variables) {
    onProgress?.('Añadiendo tipos de variables...');
    drawSectionHeader('3. Tipos de Variables');
    const rows = analysis.variables.map((v) => [
      v.name,
      v.type === 'numeric' ? 'Numerica' : v.type === 'date' ? 'Fecha' : 'Categorica',
      String(v.uniqueCount),
      v.exampleValue,
    ]);
    drawTable(
      ['Variable', 'Tipo', 'Unicos', 'Ejemplo'],
      rows,
      [62, 34, 24, contentWidth - 120],
      'Tipos de Variables'
    );
  }

  // --- 4. DATOS FALTANTES ---
  if (sections.faltantes) {
    onProgress?.('Generando sección de datos faltantes...');
    drawSectionHeader('4. Datos Faltantes');
    if (analysis.totalMissingCount === 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(22, 163, 74);
      doc.text('Excelente: No se encontraron valores faltantes en ninguna variable del dataset.', margin, y);
      y += 10;
    } else {
      const missingRows = analysis.variables.map((v) => [
        v.name,
        String(v.missingCount),
        `${v.missingPct.toFixed(2)}%`,
        v.missingPct > 20 ? 'Atencion (>20%)' : 'Normal',
      ]);
      drawTable(
        ['Variable', 'Faltantes', '% Faltantes', 'Estado'],
        missingRows,
        [72, 30, 32, contentWidth - 134],
        'Datos Faltantes'
      );

      const { data, layout } = buildMissingValuesChart(analysis);
      const chartH = Math.min(460, Math.max(250, layout.height ?? 300));
      const imgUrl = await renderPlotToDataUrl(data, layout, 760, chartH);
      const imgMmH = (chartH / 760) * contentWidth;
      ensureSpace(imgMmH + 6, 'Datos Faltantes');
      doc.addImage(imgUrl, 'PNG', margin, y, contentWidth, imgMmH);
      y += imgMmH + 8;
    }
  }

  // --- 5. ESTADÍSTICA DESCRIPTIVA ---
  if (sections.estadisticas) {
    onProgress?.('Añadiendo estadística descriptiva...');
    drawSectionHeader('5. Estadistica Descriptiva');
    const numList = Object.values(analysis.numericStats);
    if (numList.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(51, 65, 85);
      doc.text('Variables Numericas', margin, y);
      y += 5;
      const numRows = numList.map((s) => [
        s.column,
        s.mean.toFixed(2),
        s.median.toFixed(2),
        s.stdDev.toFixed(2),
        s.min.toFixed(2),
        s.q1.toFixed(2),
        s.q3.toFixed(2),
        s.max.toFixed(2),
      ]);
      drawTable(
        ['Variable', 'Media', 'Mediana', 'Desv.Est', 'Min', 'Q1', 'Q3', 'Max'],
        numRows,
        [44, 19, 19, 20, 19, 19, 19, 19],
        'Estadistica Descriptiva'
      );
    }

    const catList = Object.values(analysis.categoricalStats);
    if (catList.length > 0) {
      ensureSpace(20, 'Estadistica Descriptiva');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(51, 65, 85);
      doc.text('Variables Categoricas y Fechas (Resumen)', margin, y);
      y += 5;
      const catRows = catList.map((c) => [
        c.column,
        String(c.uniqueCount),
        c.mode,
        `${c.modeCount} (${c.modePct.toFixed(2)}%)`,
      ]);
      drawTable(
        ['Variable', 'Categorias', 'Moda', 'Frecuencia moda'],
        catRows,
        [52, 26, 62, contentWidth - 140],
        'Estadistica Descriptiva'
      );
    }
  }

  // --- 6. HISTOGRAMAS ---
  if (sections.histogramas) {
    const numList = Object.values(analysis.numericStats);
    if (numList.length > 0) {
      onProgress?.('Renderizando histogramas para PDF...');
      drawSectionHeader(
        '6. Histogramas de Variables Numericas',
        `Numero de intervalos (bins) configurado: ${histogramBins}`
      );
      const boxW = (contentWidth - 6) / 2;
      const boxH = 54;
      for (let i = 0; i < numList.length; i += 2) {
        ensureSpace(boxH + 10, 'Histogramas');
        const pair = numList.slice(i, i + 2);
        for (let j = 0; j < pair.length; j++) {
          const stat = pair[j];
          const { data, layout } = buildHistogramChart(stat, histogramBins);
          const img = await renderPlotToDataUrl(data, layout, 460, 290);
          const cx = margin + j * (boxW + 6);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.setTextColor(51, 65, 85);
          doc.text(sanitizePdfText(stat.column), cx, y);
          doc.addImage(img, 'PNG', cx, y + 2, boxW, boxH);
        }
        y += boxH + 10;
      }
    }
  }

  // --- 7. BOXPLOTS Y ATÍPICOS ---
  if (sections.boxplots) {
    const numList = Object.values(analysis.numericStats);
    if (numList.length > 0) {
      onProgress?.('Renderizando boxplots y tabla de atípicos...');
      drawSectionHeader('7. Boxplots y Valores Atipicos (Metodo IQR)');
      const outRows = numList.map((s) => [
        s.column,
        `${s.lowerFence.toFixed(2)} a ${s.upperFence.toFixed(2)}`,
        String(s.outlierCount),
        `${s.outlierPct.toFixed(2)}%`,
      ]);
      drawTable(
        ['Variable', 'Limites normales (IQR)', 'Atipicos', '% Atipicos'],
        outRows,
        [56, 66, 26, contentWidth - 148],
        'Boxplots y Atipicos'
      );

      const boxW = (contentWidth - 6) / 2;
      const boxH = 54;
      for (let i = 0; i < numList.length; i += 2) {
        ensureSpace(boxH + 10, 'Boxplots y Atipicos');
        const pair = numList.slice(i, i + 2);
        for (let j = 0; j < pair.length; j++) {
          const stat = pair[j];
          const { data, layout } = buildBoxplotChart(stat);
          const img = await renderPlotToDataUrl(data, layout, 460, 290);
          const cx = margin + j * (boxW + 6);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.setTextColor(51, 65, 85);
          doc.text(sanitizePdfText(stat.column), cx, y);
          doc.addImage(img, 'PNG', cx, y + 2, boxW, boxH);
        }
        y += boxH + 10;
      }
    }
  }

  // --- 8. GRÁFICOS DEL USUARIO + CORRELACIONES ---
  if (sections.graficosUsuario) {
    onProgress?.('Renderizando gráficos personalizados y correlaciones...');
    const chartsToInclude =
      savedCharts.length > 0
        ? savedCharts
        : activeInteractiveChart
          ? [activeInteractiveChart]
          : [];

    if (chartsToInclude.length > 0 || analysis.correlations.columns.length >= 2) {
      drawSectionHeader('8. Graficos Interactivos y Correlaciones');

      for (const cfg of chartsToInclude) {
        const { data, layout } = buildInteractiveChart(dataset, cfg);
        const img = await renderPlotToDataUrl(data, layout, 760, 400);
        const imgH = (400 / 760) * contentWidth;
        ensureSpace(imgH + 14, 'Graficos');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(30, 41, 59);
        doc.text(sanitizePdfText(cfg.title), margin, y);
        y += 3;
        doc.addImage(img, 'PNG', margin, y, contentWidth, imgH);
        y += imgH + 8;
      }

      if (analysis.correlations.columns.length >= 2) {
        const { data, layout } = buildCorrelationHeatmap(analysis.correlations);
        const img = await renderPlotToDataUrl(data, layout, 760, 460);
        const imgH = (460 / 760) * contentWidth;
        ensureSpace(imgH + 14, 'Correlaciones');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(30, 41, 59);
        doc.text('Mapa de Calor de Correlaciones (Pearson)', margin, y);
        y += 3;
        doc.addImage(img, 'PNG', margin, y, contentWidth, imgH);
        y += imgH + 8;
      }
    }
  }

  // --- 9. CONCLUSIONES ANÁLISIS IA ---
  if (sections.analisisIA) {
    onProgress?.('Añadiendo análisis inteligente...');
    drawSectionHeader('9. Analisis de Tendencias y Conclusiones (IA)');
    if (!aiAnalysis) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(
        'No se genero un analisis con IA antes de exportar este informe. Puedes generarlo en la seccion "Analisis IA".',
        margin,
        y
      );
      y += 10;
    } else {
      const blocks: { heading: string; paragraphs?: string[]; bullets: string[] }[] = [
        {
          heading: aiAnalysis.resumenGeneral.titulo,
          paragraphs: aiAnalysis.resumenGeneral.parrafos,
          bullets: aiAnalysis.resumenGeneral.puntosClave,
        },
        {
          heading: aiAnalysis.calidadDatos.titulo,
          paragraphs: [aiAnalysis.calidadDatos.evaluacion],
          bullets: aiAnalysis.calidadDatos.puntos,
        },
        {
          heading: aiAnalysis.tendenciasPatrones.titulo,
          bullets: aiAnalysis.tendenciasPatrones.puntos,
        },
        {
          heading: aiAnalysis.relacionesVariables.titulo,
          bullets: aiAnalysis.relacionesVariables.puntos,
        },
        {
          heading: aiAnalysis.conclusionesClave.titulo,
          bullets: aiAnalysis.conclusionesClave.puntos,
        },
        {
          heading: aiAnalysis.recomendaciones.titulo,
          bullets: aiAnalysis.recomendaciones.puntos,
        },
      ];

      blocks.forEach((b) => {
        ensureSpace(18, 'Analisis IA');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(130, 10, 209);
        doc.text(sanitizePdfText(b.heading), margin, y);
        y += 5.5;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(51, 65, 85);

        (b.paragraphs ?? []).forEach((p) => {
          const lines = doc.splitTextToSize(sanitizePdfText(p), contentWidth);
          ensureSpace(lines.length * 4.8 + 2, 'Analisis IA');
          doc.text(lines, margin, y);
          y += lines.length * 4.8 + 2;
        });

        b.bullets.forEach((pt) => {
          const lines = doc.splitTextToSize(sanitizePdfText(`- ${pt}`), contentWidth - 4);
          ensureSpace(lines.length * 4.6 + 2, 'Analisis IA');
          doc.text(lines, margin + 2, y);
          y += lines.length * 4.6 + 1.5;
        });
        y += 4;
      });
    }
  }

  // --- NUMERACIÓN DE PÁGINAS ---
  onProgress?.('Numerando páginas y finalizando...');
  const totalPages = doc.getNumberOfPages();
  for (let i = 2; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Explorador de Datos  |  Pagina ${i - 1} de ${totalPages - 1}`,
      pageWidth - margin,
      pageHeight - 9,
      { align: 'right' }
    );
  }

  const baseName = dataset.fileName.replace(/\.[^.]+$/, '');
  doc.save(`Informe_EDA_${baseName}.pdf`);
}
