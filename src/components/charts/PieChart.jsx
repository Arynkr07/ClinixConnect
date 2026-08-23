import { useEffect, useRef } from 'react';
import { Chart } from 'chart.js/auto';

export default function PieChart({ labels, data, colors, type = 'doughnut', height = 240, options = {} }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return undefined;

    const chart = new Chart(ctx, {
      type,
      data: {
        labels,
        datasets: [
          {
            data,
            backgroundColor: colors,
            borderWidth: 0,
            hoverOffset: 15,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: type === 'doughnut' ? '75%' : undefined,
        plugins: { legend: { display: false } },
        ...options,
      },
    });

    return () => chart.destroy();
  }, [labels, data, colors, type, options]);

  return (
    <div style={{ height }} className="w-full flex items-center justify-center">
      <canvas ref={canvasRef} />
    </div>
  );
}
