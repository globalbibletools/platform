"use client";

import { useEffect, useRef, useState } from "react";
import { Chart } from 'chart.js/auto';
import { format } from 'date-fns'
import Checkbox from "@/app/components/Checkbox";

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

export default function ProgressChart({ data, contributors }: ProgressChartProps) {
  const [isDarkMode, setDarkMode] = useState(false);
  useEffect(() => {
    const mediaMatch = window.matchMedia('(prefers-color-scheme: dark)');
    mediaMatch.addEventListener('change', (event) => {
      setDarkMode(event.matches);
    });
    setDarkMode(mediaMatch.matches);
  }, []);

  const [stackByContributor, setStacked] = useState(false)

  const chartRoot = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (chartRoot.current && data) {
      const chart = new Chart(chartRoot.current, {
          type: 'line',
          data: {
              labels: data.map(week => format(new Date(week.week), 'MMM dd, yyyy')),
              datasets: stackByContributor
                ? [
                    {
                        label: 'Unknown',
                        data: data.map(week => week.books.reduce((sum, book) => sum + (book.users.find(u => u.userId === null)?.approvedCount ?? 0), 0)),
                        fill: true,
                    },
                    ...contributors.map(contributor => ({
                        label: contributor.name,
                        data: data.map(week => week.books.reduce((sum, book) => sum + (book.users.find(u => u.userId === contributor.id)?.approvedCount ?? 0), 0)),
                        fill: true,
                    }))
                ]
                : [
                      {
                          label: 'Approved Glosses',
                          data: data.map(week => week.books.reduce((sum, book) => sum + book.users.reduce((sum, user) => sum + user.approvedCount, 0), 0)),
                          borderColor: isDarkMode ? '#59A8A2' : '#066F74',
                          fill: true,
                      }
                  ]
          },
          options: {
              interaction: {
                mode: 'index',
              },
              scales: {
                  y: {
                      stacked: true,
                      min: 0
                  }
              }
          }
      });
      return () => chart.destroy();
    }
  }, [data, isDarkMode, stackByContributor]);

    return <div>
        <div>
            <Checkbox checked={stackByContributor} onChange={e => setStacked(e.target.checked)}>Stack by Contributor</Checkbox>
        </div>
        <canvas ref={chartRoot} />
    </div>
}

