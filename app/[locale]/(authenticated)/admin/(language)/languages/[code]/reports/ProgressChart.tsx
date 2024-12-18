"use client";

import { useEffect, useRef, useState } from "react";
import { Chart } from 'chart.js/auto';
import { format } from 'date-fns'

interface Contributor {
    id: string
    name: string
}

interface UserContribution {
    userId: string | null
    approvedCount: number
    unapprovedCount: number
}

interface BookProgress {
    bookId: number
    users: UserContribution[]
}

interface WeeklyProgress {
    week: Date
    books: BookProgress[]
}

export interface ProgressChartProps {
    contributors: Contributor[]
    data: WeeklyProgress[]
}

export default function ProgressChart({ data }: ProgressChartProps) {
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
          type: 'line',
          data: {
              labels: data.map(week => format(new Date(week.week), 'MMM dd, yyyy')),
              datasets: [
                  {
                      label: 'Approved Glosses',
                      data: data.map(week => week.books.reduce((sum, book) => sum + book.users.reduce((sum, user) => sum + user.approvedCount, 0), 0)),
                      fill: true,
                      borderColor: isDarkMode ? '#59A8A2' : '#066F74',
                  },
                  {
                      label: 'Unapproved Glosses',
                      data: data.map(week => week.books.reduce((sum, book) => sum + book.users.reduce((sum, user) => sum + user.unapprovedCount, 0), 0)),
                      fill: true,
                      borderColor: isDarkMode ? '#4b5563' : '#d1d5db',
                  }
              ]
          }
      });
      return () => chart.destroy();
    }
  }, [data, isDarkMode]);

    return <canvas ref={chartRoot} />
}

