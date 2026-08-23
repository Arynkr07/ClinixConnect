import { useEffect, useRef } from 'react';
import { Chart } from 'chart.js/auto';
import { useTheme } from '../../hooks/useTheme';

export default function LineChart({ labels, data, datasets, height = 320, options = {} }) {
  const canvasRef = useRef(null);
  const { theme } = useTheme();
  const dark = theme === 'dark';

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return undefined;

    const primaryColor = dark ? '#93D3C0' : '#1B5E4F';
    const primaryFill = dark ? 'rgba(147, 211, 192, 0.12)' : 'rgba(27, 94, 79, 0.1)';

    const resolveColor = (value, fallback) => value ?? fallback;

    const chartData = datasets
      ? {
          labels,
          datasets: datasets.map((ds) => ({
            label: ds.label,
            data: ds.data,
            borderColor: ds.borderColor ?? primaryColor,
            backgroundColor: ds.backgroundColor ?? primaryFill,
            fill: ds.fill ?? true,
            tension: ds.tension ?? 0.4,
            pointBackgroundColor: ds.pointBackgroundColor ?? ds.borderColor ?? primaryColor,
            pointRadius: ds.pointRadius ?? 4,
            pointHoverRadius: ds.pointHoverRadius ?? 8,
          })),
        }
      : {
          labels,
          datasets: [
            {
              label: 'Consultations',
              data,
              borderColor: resolveColor(undefined, primaryColor),
              backgroundColor: resolveColor(undefined, primaryFill),
              fill: true,
              tension: 0.4,
              pointBackgroundColor: primaryColor,
              pointRadius: 5,
              pointHoverRadius: 8,
            },
          ],
        };

    const chart = new Chart(ctx, {
      type: 'line',
      data: chartData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' },
            ticks: { color: dark ? '#B0B3B8' : '#5A5A5A' },
          },
          x: {
            grid: { display: false },
            ticks: { color: dark ? '#B0B3B8' : '#5A5A5A' },
          },
        },
        ...options,
      },
    });

    return () => chart.destroy();
  }, [labels, data, datasets, options, dark]);

  return (
    <div style={{ height }} className="w-full">
      <canvas ref={canvasRef} />
    </div>
  );
}
