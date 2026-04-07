"use client";

import { createContext, use, useEffect, useId, useRef, useState } from "react";
import * as d3 from "d3";
import {
  addDays,
  addWeeks,
  eachWeekOfInterval,
  eachDayOfInterval,
  format,
  startOfDay,
  startOfWeek,
  subDays,
  subWeeks,
} from "date-fns";
import { UTCDate } from "@date-fns/utc";
import Button from "@/components/Button";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useElementDimensions } from "@/utils/measure-element";

export interface ActivityChartEntry {
  date: Date;
  net: number;
}

interface ActivityChartContextValue {
  cursor: UTCDate | null;
  setCursor: (date: UTCDate | null) => void;
}

const ActivityChartContext = createContext<ActivityChartContextValue | null>(
  null,
);

export function ActivityChartProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [cursor, setCursor] = useState<UTCDate | null>(null);

  return (
    <ActivityChartContext value={{ cursor, setCursor }}>
      {children}
    </ActivityChartContext>
  );
}

export type ActivityChartRange = "30d" | "6m";

export function ActivityChartRangeToggle({
  range = "30d",
}: {
  range?: ActivityChartRange;
}) {
  const navigate = useNavigate();
  const search = useSearch({ from: "/_main/admin/languages/$code/users/" });

  function onClick() {
    const nextRange = range === "30d" ? "6m" : "30d";
    navigate({
      to: ".",
      search: { ...search, range: nextRange },
      replace: true,
    });
  }

  return (
    <Button variant="tertiary" onClick={onClick}>
      {range ?? "30d"}
    </Button>
  );
}

export default function ActivityChart({
  className = "",
  data,
  total,
  range,
  yMin,
  yMax,
}: {
  className?: string;
  data: ActivityChartEntry[];
  total: number;
  yMin: number;
  yMax: number;
  range: ActivityChartRange;
}) {
  const ctx = use(ActivityChartContext);
  const [localCursor, setLocalCursor] = useState<UTCDate | null>(null);
  const cursor = ctx ? ctx.cursor : localCursor;
  const setCursor = ctx ? ctx.setCursor : setLocalCursor;
  const cursorValue =
    (cursor && data.find((entry) => entry.date.valueOf() === cursor.valueOf()))
      ?.net ?? 0;

  const totalColor =
    total > 0 ? "text-blue-800"
    : total < 0 ? "text-red-700"
    : "text-gray-500";

  const cursorColor =
    cursorValue > 0 ? "text-blue-800"
    : cursorValue < 0 ? "text-red-700"
    : "text-gray-500";

  return (
    <div className={`flex flex-col items-stretch gap-1 ${className}`}>
      <ActivityChartSVG
        data={data}
        yMin={yMin}
        yMax={yMax}
        range={range}
        cursor={cursor}
        onCursorChange={setCursor}
      />
      <span className="flex text-xs tabular-nums text-gray-600 dark:text-gray-400">
        <span className="grow">
          <span>Total: </span>
          <span className={`${totalColor}`}>{total}</span>
        </span>
        {cursor && (
          <span>
            <span>{format(cursor, "MMM d")}: </span>
            <span className={`${cursorColor}`}>{cursorValue}</span>
          </span>
        )}
      </span>
    </div>
  );
}
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
  range,
  cursor,
  onCursorChange,
}: {
  data: ActivityChartEntry[];
  yMin: number;
  yMax: number;
  range: ActivityChartRange;
  cursor: UTCDate | null;
  onCursorChange: (date: UTCDate | null) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const cursorLineRef = useRef<d3.Selection<
    SVGLineElement,
    unknown,
    null,
    undefined
  > | null>(null);
  const xScaleRef = useRef<d3.ScaleTime<number, number, never> | null>(null);

  // Unique IDs so multiple charts on the same page don't share gradient defs
  const uid = useId().replace(/:/g, "");
  const gradientId = `activity-gradient-${uid}`;
  const clipId = `activity-clip-${uid}`;

  const [elementRef, size] = useElementDimensions<HTMLDivElement>();

  useEffect(() => {
    const svg = d3.select(svgRef.current);

    const today =
      range === "30d" ?
        startOfDay(new UTCDate())
      : startOfWeek(new UTCDate(), { weekStartsOn: 1 });
    const start = range === "30d" ? subDays(today, 29) : subWeeks(today, 26);

    const dataByDay = new Map<number, number>(
      data.map((d) => [startOfDay(new UTCDate(d.date)).getTime(), d.net]),
    );
    const days =
      range === "30d" ?
        eachDayOfInterval({ start, end: today })
      : eachWeekOfInterval({ start, end: today }, { weekStartsOn: 1 });
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

    const xScale = d3
      .scaleUtc()
      .domain([start, today])
      .range([0, size.inlineSize]);
    const yScale = d3
      .scaleLinear()
      .domain([effectiveMin, effectiveMax])
      .range([size.blockSize, 0]);
    xScaleRef.current = xScale;

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
      .attr("width", size.inlineSize)
      .attr("height", size.blockSize);

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
      .attr("y2", size.blockSize)
      .attr("stroke", "var(--color-gray-400)")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "3 2")
      .attr("pointer-events", "none")
      .style("display", "none");

    svg.on("mousemove", function (event: MouseEvent) {
      const [mouseX] = d3.pointer(event);
      const hoveredDate = roundToNearest(
        new UTCDate(xScale.invert(mouseX)),
        range,
      );
      onCursorChange(hoveredDate);
    });

    svg.on("mouseleave", function () {
      onCursorChange(null);
    });

    return () => {
      svg.selectAll("*").remove();
      svg.on(".", null);
      cursorLineRef.current = null;
      xScaleRef.current = null;
    };
  }, [data, yMin, yMax, gradientId, clipId, onCursorChange, range, size]);

  useEffect(() => {
    const line = cursorLineRef.current;
    if (!line) return;

    if (!cursor || !xScaleRef.current) {
      line.style("display", "none");
      return;
    }

    const x = xScaleRef.current(cursor);
    line.style("display", null).attr("x1", x).attr("x2", x);
  }, [cursor]);

  return (
    <div ref={elementRef} className="w-full flex-1">
      <svg
        className="cursor-crosshair"
        ref={svgRef}
        width={size.inlineSize}
        height={size.blockSize}
        overflow="visible"
      />
    </div>
  );
}

type Sentiment = keyof typeof COLOR;

function getSentiment(series: { net: number }[]): Sentiment {
  const total = series.reduce((sum, d) => sum + d.net, 0);
  if (total > 0) return "positive";
  if (total < 0) return "negative";
  return "neutral";
}

function roundToNearest(date: UTCDate, range: ActivityChartRange): UTCDate {
  const start =
    range === "30d" ? startOfDay(date) : startOfWeek(date, { weekStartsOn: 1 });
  const end = range === "30d" ? addDays(start, 1) : addWeeks(start, 1);

  const startDiff = Math.abs(date.valueOf() - start.valueOf());
  const endDiff = Math.abs(date.valueOf() - end.valueOf());

  if (startDiff < endDiff) {
    return start;
  } else {
    return end;
  }
}
