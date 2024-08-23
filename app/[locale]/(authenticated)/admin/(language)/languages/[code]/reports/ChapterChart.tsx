"use client";

import { useEffect, useRef, useState } from "react";
import { Chart } from 'chart.js/auto';

export interface ChapterChartProps {
    data: { name: string; approvedCount: number; wordCount: number }[]
}

export default function ChapterChart({ data }: ChapterChartProps) {
  const [isDarkMode, setDarkMode] = useState(false);
  useEffect(() => {
    const mediaMatch = window.matchMedia('(prefers-color-scheme: dark)');
    mediaMatch.addEventListener('change', (event) => {
      setDarkMode(event.matches);
    });
    setDarkMode(mediaMatch.matches);
  }, []);

  const chartRoot = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (chartRoot.current && data) {
      const chart = new Chart(chartRoot.current, {
        type: 'bar',
        data: {
          labels: data.map((book) => book.name),
          datasets: [
            {
              label: 'Approved',
              data: data.map((book) => book.approvedCount),
              backgroundColor: isDarkMode ? '#59A8A2' : '#066F74',
            },
            {
              label: 'Remaining',
              data: data.map(
                (book) => book.wordCount - book.approvedCount
              ),
              backgroundColor: isDarkMode ? '#4b5563' : '#d1d5db',
            },
          ],
        },
        options: {
          maintainAspectRatio: false,
          indexAxis: 'y',
          interaction: {
            mode: 'index',
          },
          scales: {
            x: {
              stacked: true,
            },
            y: {
              stacked: true,
            },
          },
          plugins: {
            legend: { display: false },
          },
        },
      });
      return () => chart.destroy();
    }
  }, [data, isDarkMode]);

    return <canvas ref={chartRoot} />
}
