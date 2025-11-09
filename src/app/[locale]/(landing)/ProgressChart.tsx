"use client";

import { useEffect, useRef, useState } from "react";
import { Chart } from "chart.js/auto";

interface LanguageProgressStats {
  code: string;
  english_name: string;
  local_name: string;
  ntProgress: number;
  otProgress: number;
}

interface ProgressChartProps {
  languageStats: LanguageProgressStats[];
}

export default function ProgressChart({ languageStats }: ProgressChartProps) {
  const [isDarkMode, setDarkMode] = useState(false);
  useEffect(() => {
    const mediaMatch = window.matchMedia("(prefers-color-scheme: dark)");
    mediaMatch.addEventListener("change", (event) => {
      setDarkMode(event.matches);
    });
    setDarkMode(mediaMatch.matches);
  }, []);

  const chartRoot = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (chartRoot.current) {
      const chart = new Chart(chartRoot.current, {
        type: "bar",
        data: {
          labels: languageStats.map((lang) => lang.english_name),
          datasets: [
            {
              label: "Old Testament",
              data: languageStats.map((lang) => lang.otProgress * 100),
              backgroundColor: isDarkMode ? "#59A8A2" : "#066F74",
            },
            {
              label: "New Testament",
              data: languageStats.map((lang) => lang.ntProgress * 100),
              backgroundColor: isDarkMode ? "#CBBA79" : "#d1d5db",
            },
          ],
        },
        options: {
          interaction: {
            mode: "index",
          },
          maintainAspectRatio: false,
          indexAxis: "y",
          datasets: {
            bar: {
              barThickness: 8,
            },
          },
          plugins: {
            tooltip: {
              callbacks: {
                label(ctx) {
                  const value = ctx.parsed.x;
                  return `${ctx.dataset.label}: ${value === 100 || value === 0 ? value : value.toFixed(2)}%`;
                },
              },
            },
          },
        },
      });
      return () => chart.destroy();
    }
  }, [languageStats, isDarkMode]);

  return (
    <div className="w-full" style={{ height: 80 + 24 * languageStats.length }}>
      <canvas ref={chartRoot} />
    </div>
  );
}
