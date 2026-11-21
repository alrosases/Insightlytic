import { useEffect, useRef } from 'react';
import Plotly from 'plotly.js-dist-min';
import type { Config, Data, Layout } from 'plotly.js';

interface PlotlyChartProps {
  data: Data[];
  layout: Partial<Layout>;
  className?: string;
  height?: number;
  onPlotReady?: (el: HTMLDivElement) => void;
}

export function PlotlyChart({
  data,
  layout,
  className = '',
  height = 320,
  onPlotReady,
}: PlotlyChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const mergedLayout: Partial<Layout> = {
      autosize: true,
      height: layout.height ?? height,
      ...layout,
    };

    const config: Partial<Config> = {
      responsive: true,
      displaylogo: false,
      modeBarButtonsToRemove: ['lasso2d', 'select2d', 'autoScale2d'],
    };

    let active = true;
    Plotly.react(el, data, mergedLayout, config).then(() => {
      if (active && onPlotReady) {
        onPlotReady(el);
      }
    });

    const observer = new ResizeObserver(() => {
      if (containerRef.current) {
        Plotly.Plots.resize(containerRef.current);
      }
    });
    observer.observe(el);

    return () => {
      active = false;
      observer.disconnect();
    };
  }, [data, layout, height, onPlotReady]);

  useEffect(() => {
    const el = containerRef.current;
    return () => {
      if (el) {
        Plotly.purge(el);
      }
    };
  }, []);

  return <div ref={containerRef} className={`w-full ${className}`} />;
}
