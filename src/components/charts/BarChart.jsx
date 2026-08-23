import { useEffect, useRef } from 'react';
import { Chart } from 'chart.js/auto';
import { useTheme } from '../../hooks/useTheme';

export default function BarChart({ labels, data, colors, height = 300, options = {}, horizontal = false }) {
  const canvasRef = useRef(null);
  const { theme } = useTheme();
  const dark = theme === 'dark';

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return undefined;

    const chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            data,
            backgroundColor: colors ?? (dark ? ['#93D3C0'] : ['#1B5E4F']),
            borderRadius: 8,
            barThickness: 40,
          },
        ],
      },
      options: {
        indexAxis: horizontal ? 'y' : 'x',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: {
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
  }, [labels, data, colors, height, options, horizontal, dark]);

  return (
    <div style={{ height }} className="w-full">
      <canvas ref={canvasRef} />
    </div>
  );
}
