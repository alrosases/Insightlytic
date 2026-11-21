import type { Data, Layout } from 'plotly.js';
import type {
  CorrelationMatrix,
  CustomChartConfig,
  DatasetAnalysis,
  NumericStats,
  ParsedDataset,
} from '../types/eda';
import { formatValueDisplay, isMissingValue, parseNumericValue, round2 } from './edaEngine';

export const PASTEL_PALETTE = [
  '#9F42E3', // morado Nubank suave
  '#C084FC', // lavanda pastel
  '#14B8A6', // menta complementaria
  '#38BDF8', // cielo suave
  '#F472B6', // orquídea rosa
  '#FBBF24', // ámbar cálido
  '#820AD1', // morado Nubank profundo
  '#34D399', // esmeralda suave
];

const BASE_FONT = {
  family: 'Plus Jakarta Sans, system-ui, sans-serif',
  size: 12,
  color: '#334155',
};

export function buildMissingValuesChart(analysis: DatasetAnalysis): {
  data: Data[];
  layout: Partial<Layout>;
} {
  const varsWithMissing = [...analysis.variables]
    .filter((v) => v.missingCount > 0)
    .sort((a, b) => a.missingPct - b.missingPct);

  const names = varsWithMissing.map((v) => v.name);
  const pcts = varsWithMissing.map((v) => v.missingPct);
  const counts = varsWithMissing.map((v) => v.missingCount);
  const colors = varsWithMissing.map((v) =>
    v.missingPct > 20 ? '#FDA4AF' : '#D8B4FE'
  );
  const lineColors = varsWithMissing.map((v) =>
    v.missingPct > 20 ? '#E11D48' : '#820AD1'
  );

  const data: Data[] = [
    {
      type: 'bar',
      orientation: 'h',
      y: names,
      x: pcts,
      text: pcts.map((p, idx) => `${p.toFixed(2)}% (${counts[idx]})`),
      textposition: 'outside',
      cliponaxis: false,
      marker: {
        color: colors,
        line: { color: lineColors, width: 1.2 },
      },
      hovertemplate:
        '<b>%{y}</b><br>Faltantes: %{x:.2f}%<br>Registros vacíos: %{customdata}<extra></extra>',
      customdata: counts,
    },
  ];

  const dynamicHeight = Math.max(260, varsWithMissing.length * 36 + 80);

  const layout: Partial<Layout> = {
    font: BASE_FONT,
    paper_bgcolor: 'transparent',
    plot_bgcolor: '#FFFFFF',
    height: dynamicHeight,
    margin: { l: 150, r: 90, t: 24, b: 48 },
    xaxis: {
      title: { text: 'Porcentaje de datos faltantes (%)' },
      range: [0, Math.min(108, Math.max(25, ...pcts) * 1.18)],
      gridcolor: '#F3F0F8',
      zerolinecolor: '#CBD5E1',
    },
    yaxis: {
      automargin: true,
      gridcolor: '#FAF8FD',
    },
    shapes: [
      {
        type: 'line',
        x0: 20,
        x1: 20,
        y0: -0.5,
        y1: Math.max(0.5, varsWithMissing.length - 0.5),
        line: {
          color: '#E11D48',
          width: 1.5,
          dash: 'dot',
        },
      },
    ],
  };

  return { data, layout };
}

export function buildHistogramChart(
  stats: NumericStats,
  bins: number
): { data: Data[]; layout: Partial<Layout> } {
  const data: Data[] = [
    {
      type: 'histogram',
      x: stats.values,
      nbinsx: bins,
      marker: {
        color: '#D8B4FE',
        line: {
          color: '#820AD1',
          width: 1,
        },
      },
      hovertemplate:
        'Intervalo: %{x}<br>Frecuencia: %{y} registros<extra></extra>',
    } as Data,
  ];

  const layout: Partial<Layout> = {
    font: BASE_FONT,
    paper_bgcolor: 'transparent',
    plot_bgcolor: '#FFFFFF',
    margin: { l: 48, r: 16, t: 20, b: 44 },
    bargap: 0.06,
    xaxis: {
      title: { text: stats.column, font: { size: 11 } },
      gridcolor: '#F3F0F8',
    },
    yaxis: {
      title: { text: 'Frecuencia', font: { size: 11 } },
      gridcolor: '#F3F0F8',
    },
  };

  return { data, layout };
}

export function buildBoxplotChart(stats: NumericStats): {
  data: Data[];
  layout: Partial<Layout>;
} {
  const data: Data[] = [
    {
      type: 'box',
      y: stats.values,
      name: stats.column,
      boxpoints: 'outliers',
      jitter: 0.25,
      fillcolor: '#E9D5FF',
      line: {
        color: '#820AD1',
        width: 1.6,
      },
      marker: {
        color: '#E11D48',
        size: 6,
        opacity: 0.85,
      },
      hovertemplate: `${stats.column}: %{y:.2f}<extra></extra>`,
    },
  ];

  const layout: Partial<Layout> = {
    font: BASE_FONT,
    paper_bgcolor: 'transparent',
    plot_bgcolor: '#FFFFFF',
    margin: { l: 52, r: 16, t: 18, b: 28 },
    showlegend: false,
    yaxis: {
      gridcolor: '#F3F0F8',
      zerolinecolor: '#E2E8F0',
    },
    xaxis: {
      showticklabels: false,
    },
  };

  return { data, layout };
}

export function buildCorrelationHeatmap(correlations: CorrelationMatrix): {
  data: Data[];
  layout: Partial<Layout>;
} {
  const cols = correlations.columns;
  const z = correlations.matrix.map((row) => row.map((v) => (v === null ? 0 : v)));
  const text = correlations.matrix.map((row) =>
    row.map((v) => (v === null ? 'N/D' : v.toFixed(2)))
  );

  const annotations: Partial<NonNullable<Layout['annotations']>[number]>[] = [];
  for (let i = 0; i < cols.length; i++) {
    for (let j = 0; j < cols.length; j++) {
      const val = correlations.matrix[i][j];
      const absVal = val !== null ? Math.abs(val) : 0;
      annotations.push({
        x: cols[j],
        y: cols[i],
        text: val !== null ? val.toFixed(2) : '—',
        showarrow: false,
        font: {
          size: cols.length > 8 ? 10 : 12,
          color: absVal > 0.55 ? '#FFFFFF' : '#1E293B',
        },
      });
    }
  }

  const data: Data[] = [
    {
      type: 'heatmap',
      z,
      x: cols,
      y: cols,
      zmin: -1,
      zmax: 1,
      text: text as unknown as string[],
      colorscale: [
        [0, '#FB7185'],
        [0.25, '#FFE4E6'],
        [0.5, '#FAF8FD'],
        [0.75, '#E9D5FF'],
        [1, '#820AD1'],
      ],
      hovertemplate:
        '<b>%{x}</b> vs <b>%{y}</b><br>Correlación (r): %{z:.2f}<extra></extra>',
      colorbar: {
        title: { text: 'r' },
        thickness: 14,
      },
    },
  ];

  const layout: Partial<Layout> = {
    font: BASE_FONT,
    paper_bgcolor: 'transparent',
    plot_bgcolor: '#FFFFFF',
    margin: { l: 120, r: 40, t: 30, b: 100 },
    annotations: annotations as Layout['annotations'],
    xaxis: {
      tickangle: -30,
      automargin: true,
    },
    yaxis: {
      autorange: 'reversed',
      automargin: true,
    },
  };

  return { data, layout };
}

export function buildInteractiveChart(
  dataset: ParsedDataset,
  config: CustomChartConfig
): { data: Data[]; layout: Partial<Layout> } {
  const { chartType, xVar, yVar, colorVar, aggregation } = config;
  const rows = dataset.rows;
  const hasColor = Boolean(colorVar && colorVar !== '__none__');

  // Agrupar filas por categoría de color si existe
  const groupKeys: string[] = [];
  const rowsByGroup = new Map<string, typeof rows>();

  if (hasColor) {
    for (const r of rows) {
      const gVal = isMissingValue(r[colorVar])
        ? 'Sin dato'
        : formatValueDisplay(r[colorVar]);
      if (!rowsByGroup.has(gVal)) {
        rowsByGroup.set(gVal, []);
        groupKeys.push(gVal);
      }
      rowsByGroup.get(gVal)!.push(r);
    }
  } else {
    groupKeys.push('Todos');
    rowsByGroup.set('Todos', rows);
  }

  // Limitar grupos excesivos a los 10 principales para claridad visual
  const limitedGroups = groupKeys.slice(0, 10);

  const traces: Data[] = [];

  if (chartType === 'bar') {
    const aggLabel =
      aggregation === 'count'
        ? 'Conteo'
        : aggregation === 'sum'
          ? `Suma de ${yVar}`
          : `Promedio de ${yVar}`;

    limitedGroups.forEach((group, idx) => {
      const groupRows = rowsByGroup.get(group) ?? [];
      const buckets = new Map<string, { sum: number; count: number }>();

      for (const r of groupRows) {
        if (isMissingValue(r[xVar])) continue;
        const xVal = formatValueDisplay(r[xVar]);
        const bucket = buckets.get(xVal) ?? { sum: 0, count: 0 };

        if (aggregation === 'count') {
          bucket.count += 1;
          buckets.set(xVal, bucket);
        } else {
          const yNum = parseNumericValue(r[yVar]);
          if (yNum !== null) {
            bucket.sum += yNum;
            bucket.count += 1;
            buckets.set(xVal, bucket);
          }
        }
      }

      const entries = Array.from(buckets.entries())
        .map(([label, b]) => {
          const val =
            aggregation === 'count'
              ? b.count
              : aggregation === 'sum'
                ? round2(b.sum)
                : b.count > 0
                  ? round2(b.sum / b.count)
                  : 0;
          return { label, val };
        })
        .slice(0, 40);

      traces.push({
        type: 'bar',
        name: hasColor ? group : aggLabel,
        x: entries.map((e) => e.label),
        y: entries.map((e) => e.val),
        marker: {
          color: PASTEL_PALETTE[idx % PASTEL_PALETTE.length],
        },
        hovertemplate: `<b>${xVar}:</b> %{x}<br><b>${aggLabel}:</b> %{y}<extra>${
          hasColor ? group : ''
        }</extra>`,
      });
    });

    return {
      data: traces,
      layout: {
        font: BASE_FONT,
        paper_bgcolor: 'transparent',
        plot_bgcolor: '#FFFFFF',
        barmode: hasColor ? 'group' : 'relative',
        margin: { l: 60, r: 24, t: 32, b: 70 },
        xaxis: { title: { text: xVar }, automargin: true, gridcolor: '#F1F5F9' },
        yaxis: { title: { text: aggLabel }, automargin: true, gridcolor: '#F1F5F9' },
        legend: { orientation: 'h', y: -0.22 },
      },
    };
  }

  if (chartType === 'line') {
    limitedGroups.forEach((group, idx) => {
      const groupRows = rowsByGroup.get(group) ?? [];
      const points: { x: string | number; y: number }[] = [];

      for (const r of groupRows) {
        if (isMissingValue(r[xVar])) continue;
        const yNum = parseNumericValue(r[yVar]);
        if (yNum === null) continue;
        const xNum = parseNumericValue(r[xVar]);
        points.push({
          x: xNum !== null ? xNum : formatValueDisplay(r[xVar]),
          y: yNum,
        });
      }

      points.sort((a, b) => {
        if (typeof a.x === 'number' && typeof b.x === 'number') return a.x - b.x;
        return String(a.x).localeCompare(String(b.x));
      });

      traces.push({
        type: 'scatter',
        mode: 'lines+markers',
        name: hasColor ? group : yVar,
        x: points.map((p) => p.x),
        y: points.map((p) => p.y),
        line: {
          color: PASTEL_PALETTE[idx % PASTEL_PALETTE.length],
          width: 2.2,
        },
        marker: {
          size: 5,
          color: PASTEL_PALETTE[idx % PASTEL_PALETTE.length],
        },
        hovertemplate: `<b>${xVar}:</b> %{x}<br><b>${yVar}:</b> %{y:.2f}<extra>${
          hasColor ? group : ''
        }</extra>`,
      });
    });

    return {
      data: traces,
      layout: {
        font: BASE_FONT,
        paper_bgcolor: 'transparent',
        plot_bgcolor: '#FFFFFF',
        margin: { l: 60, r: 24, t: 32, b: 70 },
        xaxis: { title: { text: xVar }, automargin: true, gridcolor: '#F1F5F9' },
        yaxis: { title: { text: yVar }, automargin: true, gridcolor: '#F1F5F9' },
        legend: { orientation: 'h', y: -0.22 },
      },
    };
  }

  // Dispersión (scatter)
  limitedGroups.forEach((group, idx) => {
    const groupRows = rowsByGroup.get(group) ?? [];
    const xs: (number | string)[] = [];
    const ys: (number | string)[] = [];

    for (const r of groupRows) {
      if (isMissingValue(r[xVar]) || isMissingValue(r[yVar])) continue;
      const xNum = parseNumericValue(r[xVar]);
      const yNum = parseNumericValue(r[yVar]);
      xs.push(xNum !== null ? xNum : formatValueDisplay(r[xVar]));
      ys.push(yNum !== null ? yNum : formatValueDisplay(r[yVar]));
    }

    traces.push({
      type: 'scatter',
      mode: 'markers',
      name: hasColor ? group : `${yVar} vs ${xVar}`,
      x: xs,
      y: ys,
      marker: {
        size: 8,
        opacity: 0.82,
        color: PASTEL_PALETTE[idx % PASTEL_PALETTE.length],
        line: { color: '#FFFFFF', width: 0.8 },
      },
      hovertemplate: `<b>${xVar}:</b> %{x}<br><b>${yVar}:</b> %{y}<extra>${
        hasColor ? group : ''
      }</extra>`,
    });
  });

  return {
    data: traces,
    layout: {
      font: BASE_FONT,
      paper_bgcolor: 'transparent',
      plot_bgcolor: '#FFFFFF',
      margin: { l: 60, r: 24, t: 32, b: 70 },
      xaxis: { title: { text: xVar }, automargin: true, gridcolor: '#F1F5F9' },
      yaxis: { title: { text: yVar }, automargin: true, gridcolor: '#F1F5F9' },
      legend: { orientation: 'h', y: -0.22 },
    },
  };
}
