"use client";

import {
  addDays,
  addWeeks,
  eachDayOfInterval,
  eachWeekOfInterval,
  format,
  startOfDay,
  startOfWeek,
  subDays,
  subWeeks,
} from "date-fns";
import { UTCDate } from "@date-fns/utc";
import * as d3 from "d3";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { type LanguageApprovalActivityReadModel } from "@/ui/admin/readModels/getLanguageApprovalActivityReadModel";
import { useElementDimensions } from "@/utils/measure-element";
import { type ActivityChartRange } from "./ActivityChart";
import {
  DashboardCard,
  DashboardCardEmptyState,
  DashboardCardHeader,
} from "./DashboardCard";
import { GlossApprovalMethodRaw } from "@/modules/translation/types";

const APPROVAL_METHOD_KEYS: GlossApprovalMethodRaw[] = [
  GlossApprovalMethodRaw.UserInput,
  GlossApprovalMethodRaw.MachineSuggestion,
  GlossApprovalMethodRaw.GoogleSuggestion,
  GlossApprovalMethodRaw.LLMSuggestion,
];

const APPROVAL_METHOD_COLORS: Record<GlossApprovalMethodRaw, string> = {
  USER_INPUT: "var(--color-blue-800)",
  MACHINE_SUGGESTION: "var(--color-viz-purple)",
  GOOGLE_SUGGESTION: "var(--color-viz-pink)",
  LLM_SUGGESTION: "var(--color-brown-400)",
};

interface ApprovalSeriesData {
  points: Date[];
  totals: Record<GlossApprovalMethodRaw, number>;
  countsByTime: Map<number, Record<GlossApprovalMethodRaw, number>>;
}

export default function LanguageGlossApprovalDashboardCard({
  className = "",
  approvalActivity,
  range,
}: {
  className?: string;
  approvalActivity: LanguageApprovalActivityReadModel[];
  range: ActivityChartRange;
}) {
  const [cursor, setCursor] = useState<UTCDate | null>(null);
  const [hoveredMethod, setHoveredMethod] =
    useState<GlossApprovalMethodRaw | null>(null);

  const { points, totals, countsByTime } = useMemo(
    () => buildSeries(approvalActivity, range),
    [approvalActivity, range],
  );

  const cursorCounts =
    cursor === null ? null : (
      (countsByTime.get(toBucketTime(cursor, range)) ?? {
        USER_INPUT: 0,
        MACHINE_SUGGESTION: 0,
        GOOGLE_SUGGESTION: 0,
        LLM_SUGGESTION: 0,
      })
    );

  return (
    <DashboardCard className={className}>
      <DashboardCardHeader title="Gloss approvals" />
      <div className="flex-1 overflow-hidden relative px-4 py-3">
        {approvalActivity.length === 0 ?
          <DashboardCardEmptyState>
            No gloss approvals in the selected range.
          </DashboardCardEmptyState>
        : <ApprovalActivityChart
            points={points}
            countsByTime={countsByTime}
            range={range}
            cursor={cursor}
            onCursorChange={setCursor}
            hoveredMethod={hoveredMethod}
            onHoveredMethodChange={setHoveredMethod}
          />
        }
      </div>
      <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-3 text-xs tabular-nums text-gray-700 dark:text-gray-300">
        <table className="border-collapse">
          <thead>
            <tr className="text-gray-500 dark:text-gray-400">
              <th className="text-left font-semibold pb-1 pr-3"></th>
              <th className="text-right font-semibold pb-1 pr-3 w-14">Total</th>
              {cursor && (
                <th className="text-right font-semibold pb-1 w-14">
                  {format(cursor, "MMM d")}
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            <LegendItem
              method={GlossApprovalMethodRaw.UserInput}
              color={APPROVAL_METHOD_COLORS.USER_INPUT}
              label="User input"
              total={totals.USER_INPUT}
              cursorCount={cursor ? (cursorCounts?.USER_INPUT ?? 0) : undefined}
              active={
                hoveredMethod === null ||
                hoveredMethod === GlossApprovalMethodRaw.UserInput
              }
              onHoveredMethodChange={setHoveredMethod}
            />
            <LegendItem
              method={GlossApprovalMethodRaw.MachineSuggestion}
              color={APPROVAL_METHOD_COLORS.MACHINE_SUGGESTION}
              label="Machine suggestion"
              total={totals.MACHINE_SUGGESTION}
              cursorCount={
                cursor ? (cursorCounts?.MACHINE_SUGGESTION ?? 0) : undefined
              }
              active={
                hoveredMethod === null ||
                hoveredMethod === GlossApprovalMethodRaw.MachineSuggestion
              }
              onHoveredMethodChange={setHoveredMethod}
            />
            <LegendItem
              method={GlossApprovalMethodRaw.GoogleSuggestion}
              color={APPROVAL_METHOD_COLORS.GOOGLE_SUGGESTION}
              label="Google suggestion"
              total={totals.GOOGLE_SUGGESTION}
              cursorCount={
                cursor ? (cursorCounts?.GOOGLE_SUGGESTION ?? 0) : undefined
              }
              active={
                hoveredMethod === null ||
                hoveredMethod === GlossApprovalMethodRaw.GoogleSuggestion
              }
              onHoveredMethodChange={setHoveredMethod}
            />
            <LegendItem
              method={GlossApprovalMethodRaw.LLMSuggestion}
              color={APPROVAL_METHOD_COLORS.LLM_SUGGESTION}
              label="LLM suggestion"
              total={totals.LLM_SUGGESTION}
              cursorCount={
                cursor ? (cursorCounts?.LLM_SUGGESTION ?? 0) : undefined
              }
              active={
                hoveredMethod === null ||
                hoveredMethod === GlossApprovalMethodRaw.LLMSuggestion
              }
              onHoveredMethodChange={setHoveredMethod}
            />
          </tbody>
        </table>
      </div>
    </DashboardCard>
  );
}

function LegendItem({
  method,
  color,
  label,
  total,
  cursorCount,
  active,
  onHoveredMethodChange,
}: {
  method: GlossApprovalMethodRaw;
  color: string;
  label: string;
  total: number;
  cursorCount?: number;
  active: boolean;
  onHoveredMethodChange: (method: GlossApprovalMethodRaw | null) => void;
}) {
  return (
    <tr
      className={active ? "" : "opacity-45"}
      onMouseEnter={() => onHoveredMethodChange(method)}
      onMouseLeave={() => onHoveredMethodChange(null)}
    >
      <th className="font-normal text-left py-1 pr-3">
        <span className="inline-flex items-center gap-2">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: color }}
          />
          <span>{label}</span>
        </span>
      </th>
      <td className="text-right py-1 pr-3">{total.toLocaleString()}</td>
      {typeof cursorCount === "number" && (
        <td className="text-right py-1 text-gray-500 dark:text-gray-400">
          {cursorCount.toLocaleString()}
        </td>
      )}
    </tr>
  );
}

function ApprovalActivityChart({
  points,
  countsByTime,
  range,
  cursor,
  onCursorChange,
  hoveredMethod,
  onHoveredMethodChange,
}: {
  points: Date[];
  countsByTime: Map<number, Record<GlossApprovalMethodRaw, number>>;
  range: ActivityChartRange;
  cursor: UTCDate | null;
  onCursorChange: (date: UTCDate | null) => void;
  hoveredMethod: GlossApprovalMethodRaw | null;
  onHoveredMethodChange: (method: GlossApprovalMethodRaw | null) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const xScaleRef = useRef<d3.ScaleTime<number, number, never> | null>(null);
  const yScaleRef = useRef<d3.ScaleLinear<number, number, never> | null>(null);
  const cursorLineRef = useRef<d3.Selection<
    SVGLineElement,
    unknown,
    null,
    undefined
  > | null>(null);
  const pointMarkersRef = useRef<Record<
    GlossApprovalMethodRaw,
    d3.Selection<SVGCircleElement, unknown, null, undefined>
  > | null>(null);
  const linePathsRef = useRef<Record<
    GlossApprovalMethodRaw,
    d3.Selection<
      SVGPathElement,
      { date: Date; count: number }[],
      null,
      undefined
    >
  > | null>(null);

  const chartId = useId().replace(/:/g, "");
  const clipId = `approval-clip-${chartId}`;

  const [elementRef, size] = useElementDimensions<HTMLDivElement>();

  const yMax = useMemo(
    () =>
      Math.max(
        1,
        ...Array.from(countsByTime.values()).flatMap((counts) =>
          APPROVAL_METHOD_KEYS.map((method) => counts[method]),
        ),
      ),
    [countsByTime],
  );

  useEffect(() => {
    const svg = d3.select(svgRef.current);

    const today =
      range === "30d" ?
        startOfDay(new UTCDate())
      : startOfWeek(new UTCDate(), { weekStartsOn: 1 });
    const start = range === "30d" ? subDays(today, 29) : subWeeks(today, 26);

    const xScale = d3
      .scaleUtc()
      .domain([start, today])
      .range([0, size.inlineSize]);
    const yScale = d3
      .scaleLinear()
      .domain([0, yMax])
      .range([size.blockSize, 0]);

    xScaleRef.current = xScale;
    yScaleRef.current = yScale;

    const lineGen = d3
      .line<{ date: Date; count: number }>()
      .x((d) => xScale(d.date))
      .y((d) => yScale(d.count))
      .curve(d3.curveMonotoneX);

    const chartRoot = svg.append("g");

    const linePaths = {} as Record<
      GlossApprovalMethodRaw,
      d3.Selection<
        SVGPathElement,
        { date: Date; count: number }[],
        null,
        undefined
      >
    >;

    for (const method of APPROVAL_METHOD_KEYS) {
      const linePoints = points.map((point) => ({
        date: point,
        count: countsByTime.get(point.valueOf())?.[method] ?? 0,
      }));

      const linePath = chartRoot
        .append("path")
        .datum(linePoints)
        .attr("fill", "none")
        .attr("stroke", APPROVAL_METHOD_COLORS[method])
        .attr("stroke-width", 2.25)
        .attr("d", lineGen)
        .on("mouseenter", () => onHoveredMethodChange(method))
        .on("mousemove", () => onHoveredMethodChange(method))
        .on("mouseleave", () => onHoveredMethodChange(null));

      linePaths[method] = linePath;
    }

    linePathsRef.current = linePaths;

    cursorLineRef.current = svg
      .append("line")
      .attr("y1", 0)
      .attr("y2", size.blockSize)
      .attr("stroke", "var(--color-gray-400)")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "3 2")
      .attr("pointer-events", "none")
      .style("display", "none");

    pointMarkersRef.current = {
      USER_INPUT: svg
        .append("circle")
        .attr("r", 3.5)
        .attr("fill", APPROVAL_METHOD_COLORS.USER_INPUT)
        .attr("stroke", "var(--color-white)")
        .attr("stroke-width", 1)
        .attr("pointer-events", "none")
        .style("display", "none"),
      MACHINE_SUGGESTION: svg
        .append("circle")
        .attr("r", 3.5)
        .attr("fill", APPROVAL_METHOD_COLORS.MACHINE_SUGGESTION)
        .attr("stroke", "var(--color-white)")
        .attr("stroke-width", 1)
        .attr("pointer-events", "none")
        .style("display", "none"),
      GOOGLE_SUGGESTION: svg
        .append("circle")
        .attr("r", 3.5)
        .attr("fill", APPROVAL_METHOD_COLORS.GOOGLE_SUGGESTION)
        .attr("stroke", "var(--color-white)")
        .attr("stroke-width", 1)
        .attr("pointer-events", "none")
        .style("display", "none"),
      LLM_SUGGESTION: svg
        .append("circle")
        .attr("r", 3.5)
        .attr("fill", APPROVAL_METHOD_COLORS.LLM_SUGGESTION)
        .attr("stroke", "var(--color-white)")
        .attr("stroke-width", 1)
        .attr("pointer-events", "none")
        .style("display", "none"),
    };

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
      onHoveredMethodChange(null);
    });

    return () => {
      svg.selectAll("*").remove();
      svg.on(".", null);
      xScaleRef.current = null;
      yScaleRef.current = null;
      cursorLineRef.current = null;
      pointMarkersRef.current = null;
      linePathsRef.current = null;
    };
  }, [
    clipId,
    countsByTime,
    onCursorChange,
    onHoveredMethodChange,
    points,
    range,
    size,
    yMax,
  ]);

  useEffect(() => {
    const linePaths = linePathsRef.current;
    const markers = pointMarkersRef.current;

    if (!linePaths || !markers) {
      return;
    }

    for (const method of APPROVAL_METHOD_KEYS) {
      const isActive = hoveredMethod === null || hoveredMethod === method;
      linePaths[method]
        .attr("stroke-width", isActive ? 2.75 : 1.25)
        .attr("stroke-opacity", isActive ? 1 : 0.25);
      markers[method].attr("opacity", isActive ? 1 : 0.35);
    }
  }, [hoveredMethod]);

  useEffect(() => {
    const line = cursorLineRef.current;
    const markers = pointMarkersRef.current;
    const xScale = xScaleRef.current;
    const yScale = yScaleRef.current;

    if (!line || !markers || !xScale || !yScale) {
      return;
    }

    if (cursor === null) {
      line.style("display", "none");
      for (const method of APPROVAL_METHOD_KEYS) {
        markers[method].style("display", "none");
      }
      return;
    }

    const bucketTime = toBucketTime(cursor, range);
    const counts = countsByTime.get(bucketTime);
    const x = xScale(new Date(bucketTime));

    line.style("display", null).attr("x1", x).attr("x2", x);

    for (const method of APPROVAL_METHOD_KEYS) {
      const y = yScale(counts?.[method] ?? 0);
      markers[method].style("display", null).attr("cx", x).attr("cy", y);
    }
  }, [countsByTime, cursor, range]);

  return (
    <div ref={elementRef} className="h-full w-full relative">
      <svg
        className="absolute inset-0 cursor-crosshair"
        ref={svgRef}
        width={size.inlineSize}
        height={size.blockSize}
        overflow="visible"
      />
    </div>
  );
}

function buildSeries(
  approvalActivity: LanguageApprovalActivityReadModel[],
  range: ActivityChartRange,
): ApprovalSeriesData {
  const now =
    range === "30d" ?
      startOfDay(new UTCDate())
    : startOfWeek(new UTCDate(), { weekStartsOn: 1 });
  const start = range === "30d" ? subDays(now, 29) : subWeeks(now, 26);
  const points =
    range === "30d" ?
      eachDayOfInterval({ start, end: now })
    : eachWeekOfInterval({ start, end: now }, { weekStartsOn: 1 });

  const totals: Record<GlossApprovalMethodRaw, number> = {
    USER_INPUT: 0,
    MACHINE_SUGGESTION: 0,
    GOOGLE_SUGGESTION: 0,
    LLM_SUGGESTION: 0,
  };

  const countsByTime = new Map<number, Record<GlossApprovalMethodRaw, number>>(
    points.map((point) => [
      point.valueOf(),
      {
        USER_INPUT: 0,
        MACHINE_SUGGESTION: 0,
        GOOGLE_SUGGESTION: 0,
        LLM_SUGGESTION: 0,
      },
    ]),
  );

  for (const entry of approvalActivity) {
    const method = entry.method;
    const bucketTime = toBucketTime(entry.date, range);

    const counts = countsByTime.get(bucketTime);
    if (!counts) {
      continue;
    }

    counts[method] += entry.count;
    totals[method] += entry.count;
  }

  return {
    points,
    totals,
    countsByTime,
  };
}

function toBucketTime(date: Date, range: ActivityChartRange) {
  const dateAsUtc = new UTCDate(date);
  return (
    range === "30d" ?
      startOfDay(dateAsUtc)
    : startOfWeek(dateAsUtc, { weekStartsOn: 1 })).valueOf();
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
