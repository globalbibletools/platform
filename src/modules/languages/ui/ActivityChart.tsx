"use client";

import { useEffect, useId, useRef } from "react";
import * as d3 from "d3";
import { eachDayOfInterval, startOfDay, subDays } from "date-fns";

export interface ActivityChartEntry {
  date: Date;
  net: number;
}

export interface ActivityChartProps {
  data: ActivityChartEntry[];
  yMin: number;
  yMax: number;
}

const WIDTH = 200;
const HEIGHT = 48;
const MARGIN = { top: 4, right: 4, bottom: 4, left: 4 };

// Solid color for each sentiment
const COLOR = {
  positive: "#066f74", // blue-800
  negative: "#dc2626", // red-600
  neutral: "#9ca3af", // gray-400
} as const;

type Sentiment = keyof typeof COLOR;

function getSentiment(series: { net: number }[]): Sentiment {
  const total = series.reduce((sum, d) => sum + d.net, 0);
  if (total > 0) return "positive";
  if (total < 0) return "negative";
  return "neutral";
}

export default function ActivityChart({
  data,
  yMin,
  yMax,
}: ActivityChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  // Unique IDs so multiple charts on the same page don't share gradient defs
  const uid = useId().replace(/:/g, "");
  const gradientId = `activity-gradient-${uid}`;
  const clipId = `activity-clip-${uid}`;

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const innerWidth = WIDTH - MARGIN.left - MARGIN.right;
    const innerHeight = HEIGHT - MARGIN.top - MARGIN.bottom;

    const today = startOfDay(new Date());
    const start = subDays(today, 29);

    // Build a complete 30-day series, filling missing days with 0
    const dataByDay = new Map<number, number>(
      data.map((d) => [startOfDay(d.date).getTime(), d.net]),
    );
    const days = eachDayOfInterval({ start, end: today });
    const series = days.map((day) => ({
      date: day,
      net: dataByDay.get(day.getTime()) ?? 0,
    }));

    const sentiment = getSentiment(series);
    const color = COLOR[sentiment];

    // If all values are 0 (yMin === yMax === 0), give a small symmetric range
    // so the baseline still renders and the chart isn't collapsed.
    const effectiveMin = yMin === yMax ? -1 : yMin;
    const effectiveMax = yMin === yMax ? 1 : yMax;

    const xScale = d3.scaleTime().domain([start, today]).range([0, innerWidth]);
    const yScale = d3
      .scaleLinear()
      .domain([effectiveMin, effectiveMax])
      .range([innerHeight, 0]);

    const zeroY = yScale(0);

    // --- defs: gradient + clip path ---
    const defs = svg.append("defs");

    // Vertical linear gradient: transparent white at zero baseline → solid color
    // at the extreme (top for positive, bottom for negative, center for neutral).
    // We express stop offsets in the SVG coordinate system (0% = top, 100% = bottom).
    const gradient = defs
      .append("linearGradient")
      .attr("id", gradientId)
      .attr("x1", "0%")
      .attr("x2", "0%")
      .attr("y1", "0%")
      .attr("y2", "100%");

    if (sentiment === "positive") {
      // Line goes up → deepest color at top (0%), fades to white at baseline
      gradient
        .append("stop")
        .attr("offset", "0%")
        .attr("stop-color", color)
        .attr("stop-opacity", 1);
      gradient
        .append("stop")
        .attr("offset", "20%")
        .attr("stop-color", color)
        .attr("stop-opacity", 0.5);
      gradient
        .append("stop")
        .attr("offset", `${((zeroY + MARGIN.top) / HEIGHT) * 100}%`)
        .attr("stop-color", color)
        .attr("stop-opacity", 0.05);
    } else if (sentiment === "negative") {
      // Line goes down → white at baseline, deepest color at bottom (100%)
      gradient
        .append("stop")
        .attr("offset", `${((zeroY + MARGIN.top) / HEIGHT) * 100}%`)
        .attr("stop-color", color)
        .attr("stop-opacity", 0.05);
      gradient
        .append("stop")
        .attr("offset", "80%")
        .attr("stop-color", color)
        .attr("stop-opacity", 0.5);
      gradient
        .append("stop")
        .attr("offset", "100%")
        .attr("stop-color", color)
        .attr("stop-opacity", 1);
    } else {
      // Neutral: uniform muted color, no gradient effect needed
      gradient
        .append("stop")
        .attr("offset", "0%")
        .attr("stop-color", color)
        .attr("stop-opacity", 0.3);
      gradient
        .append("stop")
        .attr("offset", "100%")
        .attr("stop-color", color)
        .attr("stop-opacity", 0.3);
    }

    // Clip path so the filled area never bleeds outside the inner frame
    defs
      .append("clipPath")
      .attr("id", clipId)
      .append("rect")
      .attr("width", innerWidth)
      .attr("height", innerHeight);

    // --- drawing ---
    const g = svg
      .append("g")
      .attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

    const lineGen = d3
      .line<{ date: Date; net: number }>()
      .x((d: { date: Date; net: number }) => xScale(d.date))
      .y((d: { date: Date; net: number }) => yScale(d.net))
      .curve(d3.curveMonotoneX);

    const areaGen = d3
      .area<{ date: Date; net: number }>()
      .x((d: { date: Date; net: number }) => xScale(d.date))
      .y0(zeroY)
      .y1((d: { date: Date; net: number }) => yScale(d.net))
      .curve(d3.curveMonotoneX);

    // Gradient fill between line and zero baseline
    g.append("path")
      .datum(series)
      .attr("clip-path", `url(#${clipId})`)
      .attr("fill", `url(#${gradientId})`)
      .attr("d", areaGen);

    // Zero baseline
    g.append("line")
      .attr("x1", 0)
      .attr("x2", innerWidth)
      .attr("y1", zeroY)
      .attr("y2", zeroY)
      .attr("stroke", color)
      .attr("stroke-opacity", 0.25)
      .attr("stroke-width", 1);

    // Activity line on top
    g.append("path")
      .datum(series)
      .attr("fill", "none")
      .attr("stroke", color)
      .attr("stroke-width", 1.5)
      .attr("d", lineGen);
  }, [data, yMin, yMax, gradientId, clipId]);

  return <svg ref={svgRef} width={WIDTH} height={HEIGHT} />;
}
