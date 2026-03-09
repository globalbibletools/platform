"use client";

import { useEffect, useId, useRef } from "react";
import * as d3 from "d3";
import { eachDayOfInterval, startOfDay, subDays } from "date-fns";

export interface ActivityChartEntry {
  date: Date;
  net: number;
}

export default function ActivityChart({
  data,
  yMin,
  yMax,
}: {
  data: ActivityChartEntry[];
  yMin: number;
  yMax: number;
}) {
  const total = data.reduce((sum, entry) => sum + entry.net, 0);

  return (
    <div className="flex flex-col">
      <ActivityChartSVG className="" {...{ data, yMin, yMax }} />
      <span className="block h-5 leading-0">
        <span className="text-xs font-bold">TOTAL: </span>
        <span
          className={`text-sm font-bold ${
            total > 0 ? "text-blue-800"
            : total < 0 ? "text-red-700"
            : "text-gray-500"
          }`}
        >
          {total}
        </span>
      </span>
    </div>
  );
}

const WIDTH = 200;
const HEIGHT = 24;

const COLOR = {
  positive: "var(--color-blue-800)",
  negative: "var(--color-red-800)",
  neutral: "var(--color-gray-400)",
} as const;

const GRADIENT_OPACITY_MIN = 0;
const GRADIENT_OPACITY_MAX = 0.4;

function ActivityChartSVG({
  className,
  data,
  yMin,
  yMax,
}: {
  className: string;
  data: ActivityChartEntry[];
  yMin: number;
  yMax: number;
}) {
  const svgRef = useRef<SVGSVGElement>(null);

  // Unique IDs so multiple charts on the same page don't share gradient defs
  const uid = useId().replace(/:/g, "");
  const gradientId = `activity-gradient-${uid}`;
  const clipId = `activity-clip-${uid}`;

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const today = startOfDay(new Date());
    const start = subDays(today, 29);

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

    const xScale = d3.scaleTime().domain([start, today]).range([0, WIDTH]);
    const yScale = d3
      .scaleLinear()
      .domain([effectiveMin, effectiveMax])
      .range([HEIGHT, 0]);

    const zeroY = yScale(0);

    const defs = svg.append("defs");

    // Vertical linear gradient: transparent white at zero baseline → solid color
    // at the extreme (top for positive, bottom for negative, center for neutral).
    const gradient = defs
      .append("linearGradient")
      .attr("id", gradientId)
      .attr("x1", "0%")
      .attr("x2", "0%")
      .attr("y1", "0%")
      .attr("y2", "100%");

    if (sentiment === "positive") {
      gradient
        .append("stop")
        .attr("offset", "0%")
        .attr("stop-color", color)
        .attr("stop-opacity", GRADIENT_OPACITY_MAX);
      gradient
        .append("stop")
        .attr("offset", "100%")
        .attr("stop-color", color)
        .attr("stop-opacity", GRADIENT_OPACITY_MIN);
    } else if (sentiment === "negative") {
      gradient
        .append("stop")
        .attr("offset", "100%")
        .attr("stop-color", color)
        .attr("stop-opacity", GRADIENT_OPACITY_MIN);
      gradient
        .append("stop")
        .attr("offset", "100%")
        .attr("stop-color", color)
        .attr("stop-opacity", GRADIENT_OPACITY_MAX);
    }

    // Clip path so the filled area never bleeds outside the inner frame
    defs
      .append("clipPath")
      .attr("id", clipId)
      .append("rect")
      .attr("width", WIDTH)
      .attr("height", HEIGHT);

    const g = svg.append("g");

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

    // Activity line on top
    g.append("path")
      .datum(series)
      .attr("fill", "none")
      .attr("stroke", color)
      .attr("stroke-width", 1.5)
      .attr("d", lineGen);
  }, [data, yMin, yMax, gradientId, clipId]);

  return (
    <svg
      className={className}
      ref={svgRef}
      width={WIDTH}
      height={HEIGHT}
      overflow="visible"
    />
  );
}

type Sentiment = keyof typeof COLOR;

function getSentiment(series: { net: number }[]): Sentiment {
  const total = series.reduce((sum, d) => sum + d.net, 0);
  if (total > 0) return "positive";
  if (total < 0) return "negative";
  return "neutral";
}
