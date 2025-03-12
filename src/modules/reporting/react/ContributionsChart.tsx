"use client";

import { useEffect, useRef, useState } from "react";
import { Chart } from "chart.js/auto";
import "chartjs-adapter-date-fns";
import { format, addWeeks } from "date-fns";

interface ContributionRecord {
  week: Date;
  approvedCount: number;
  revokedCount: number;
  editedApprovedCount: number;
  editedUnapprovedCount: number;
}

interface ContributionsChartProps {
  data: ContributionRecord[];
}

export default function ContributionsChart({ data }: ContributionsChartProps) {
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
          labels: data.map((record) => record.week),
          datasets: [
            {
              label: "Words Approved",
              data: data.map((record) => record.approvedCount),
              backgroundColor: isDarkMode ? "#59A8A2" : "#066F74",
            },
            {
              label: "Approved Words Edited",
              data: data.map((record) => record.editedApprovedCount),
              backgroundColor: isDarkMode ? "#83C5BE" : "#01A5A7",
            },
            {
              label: "Words Revoked",
              data: data.map((record) => record.revokedCount),
              backgroundColor: isDarkMode ? "#f87171" : "#f87171",
            },
            {
              label: "Unapproved Words Edited",
              data: data.map((record) => record.editedUnapprovedCount),
              backgroundColor: isDarkMode ? "#78716c" : "#d6d3d1",
            },
          ],
        },
        options: {
          animation: false,
          interaction: {
            mode: "index",
          },
          scales: {
            y: {
              stacked: true,
            },
            x: {
              type: "time",
              stacked: true,
              min: data
                .reduce(
                  (min, record) => (record.week < min ? record.week : min),
                  addWeeks(new Date(), -12),
                )
                .valueOf(),
              max: Date.now(),
              time: {
                unit: "week",
                displayFormats: {
                  week: "MMM dd, yyyy",
                },
              },
            },
          },
        },
      });
      return () => chart.destroy();
    }
  }, [isDarkMode]);

  return (
    <div className="w-full">
      <canvas ref={chartRoot} />
    </div>
  );
}
