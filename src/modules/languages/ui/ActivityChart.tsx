"use client";

import { useEffect, useId, useRef, useState } from "react";
import * as d3 from "d3";
import {
  eachDayOfInterval,
  format,
  startOfDay,
  subDays,
  addDays,
} from "date-fns";

export interface ActivityChartEntry {
  date: Date;
  net: number;
}

interface CursorPoint {
  date: Date;
  net: number;
  x: number;
}

export default function ActivityChart({
  data,
  total,
  yMin,
  yMax,
}: {
  data: ActivityChartEntry[];
  total: number;
  yMin: number;
  yMax: number;
}) {
  const [cursor, setCursor] = useState<CursorPoint | null>(null);

  const totalColor =
    total > 0 ? "text-blue-800"
    : total < 0 ? "text-red-700"
    : "text-gray-500";

  const cursorColor =
    cursor ?
      cursor.net > 0 ? "text-blue-800"
      : cursor.net < 0 ? "text-red-700"
      : "text-gray-500"
    : null;

  return (
    <div className="flex flex-col">
      <ActivityChartSVG
        {...{ data, yMin, yMax, cursor, onCursorChange: setCursor }}
      />
      <span className="flex h-5 leading-0">
        <span className="grow">
          <span className="text-xs font-bold">TOTAL: </span>
          <span className={`text-sm font-bold ${totalColor}`}>{total}</span>
        </span>
        {cursor && (
          <span>
            <span className="text-xs font-bold uppercase">
              {format(cursor.date, "MMM d")}:{" "}
            </span>
            <span className={`text-sm font-bold ${cursorColor}`}>
              {cursor.net}
            </span>
          </span>
        )}
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
  data,
  yMin,
  yMax,
  cursor,
  onCursorChange,
}: {
  data: ActivityChartEntry[];
  yMin: number;
  yMax: number;
  cursor: CursorPoint | null;
  onCursorChange: (point: CursorPoint | null) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const cursorLineRef = useRef<d3.Selection<
    SVGLineElement,
    unknown,
    null,
    undefined
  > | null>(null);

  // Unique IDs so multiple charts on the same page don't share gradient defs
  const uid = useId().replace(/:/g, "");
  const gradientId = `activity-gradient-${uid}`;
  const clipId = `activity-clip-${uid}`;

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    cursorLineRef.current = null;

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
      .x((d) => xScale(d.date))
      .y((d) => yScale(d.net))
      .curve(d3.curveMonotoneX);

    const areaGen = d3
      .area<{ date: Date; net: number }>()
      .x((d) => xScale(d.date))
      .y0(zeroY)
      .y1((d) => yScale(d.net))
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

    cursorLineRef.current = svg
      .append("line")
      .attr("y1", 0)
      .attr("y2", HEIGHT)
      .attr("stroke", "var(--color-gray-400)")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "3 2")
      .attr("pointer-events", "none")
      .style("display", "none");

    const bisect = d3.bisector((d: { date: Date; net: number }) => d.date).left;

    svg.on("mousemove", function (event: MouseEvent) {
      const [mouseX] = d3.pointer(event);
      const hoveredDate = roundToNearestStartOfDay(xScale.invert(mouseX));
      const idx = bisect(series, hoveredDate);
      const nearest = series[idx];

      onCursorChange({
        date: nearest.date,
        net: nearest.net,
        x: xScale(nearest.date),
      });
    });

    svg.on("mouseleave", function () {
      onCursorChange(null);
    });
  }, [data, yMin, yMax, gradientId, clipId, onCursorChange]);

  useEffect(() => {
    const line = cursorLineRef.current;
    if (!line) return;

    if (!cursor) {
      line.style("display", "none");
      return;
    }

    line.style("display", null).attr("x1", cursor.x).attr("x2", cursor.x);
  }, [cursor]);

  return (
    <svg
      className="cursor-crosshair"
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

function roundToNearestStartOfDay(date: Date): Date {
  const shouldRoundUp = date.getHours() >= 12;
  if (shouldRoundUp) return addDays(startOfDay(date), 1);
  else return startOfDay(date);
}
