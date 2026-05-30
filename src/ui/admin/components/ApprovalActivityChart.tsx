"use client";

import { use, useEffect, useId, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import {
  eachDayOfInterval,
  eachWeekOfInterval,
  startOfDay,
  startOfWeek,
  subDays,
  subWeeks,
} from "date-fns";
import { UTCDate } from "@date-fns/utc";
import { GlossApprovalMethodRaw } from "@/modules/translation/types";
import { type PlatformDashboardAILanguageActivityReadModel } from "@/ui/admin/readModels/getPlatformDashboardAILanguagesReadModel";
import { ActivityChartContext, type ActivityChartRange } from "./ActivityChart";
import { useElementDimensions } from "@/utils/measure-element";

const APPROVAL_METHOD_KEYS: GlossApprovalMethodRaw[] = [
  GlossApprovalMethodRaw.UserInput,
  GlossApprovalMethodRaw.MachineSuggestion,
  GlossApprovalMethodRaw.GoogleSuggestion,
  GlossApprovalMethodRaw.LLMSuggestion,
];

const APPROVAL_METHOD_COLORS: Record<GlossApprovalMethodRaw, string> = {
  USER_INPUT: "#066f74",
  MACHINE_SUGGESTION: "#6d75af",
  GOOGLE_SUGGESTION: "#cc728a",
  LLM_SUGGESTION: "#bba154",
};

const APPROVAL_METHOD_LABELS: Record<GlossApprovalMethodRaw, string> = {
  USER_INPUT: "User",
  MACHINE_SUGGESTION: "Machine",
  GOOGLE_SUGGESTION: "Google",
  LLM_SUGGESTION: "LLM",
};

export default function ApprovalActivityChart({
  className = "",
  data,
  yMax,
  range,
}: {
  className?: string;
  data: PlatformDashboardAILanguageActivityReadModel[];
  yMax: number;
  range: ActivityChartRange;
}) {
  const ctx = use(ActivityChartContext);
  const [localCursor, setLocalCursor] = useState<UTCDate | null>(null);
  const cursor = ctx ? ctx.cursor : localCursor;
  const setCursor = ctx ? ctx.setCursor : setLocalCursor;

  const { countsByTime, totals } = useMemo(
    () => buildSeries(data, range),
    [data, range],
  );

  const cursorCounts = useMemo(() => {
    if (cursor === null) return null;
    const bucketTime = toBucketTime(cursor, range);
    return countsByTime.get(bucketTime) ?? null;
  }, [countsByTime, cursor, range]);

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <ApprovalActivityChartSVG
        className="relative h-10"
        data={data}
        yMax={yMax}
        range={range}
        cursor={cursor}
        onCursorChange={setCursor}
      />
      <div className="flex flex-wrap shrink-0 items-center gap-x-3 gap-y-1 text-xs tabular-nums text-gray-600 dark:text-gray-400">
        {APPROVAL_METHOD_KEYS.map((method) => (
          <span key={method} className="flex items-center gap-1">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm shrink-0"
              style={{ backgroundColor: APPROVAL_METHOD_COLORS[method] }}
            />
            <span>{APPROVAL_METHOD_LABELS[method]}:</span>
            <span>
              {cursorCounts ?
                (cursorCounts[method] ?? 0).toLocaleString()
              : (totals[method] ?? 0).toLocaleString()}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

function ApprovalActivityChartSVG({
  className = "",
  data,
  yMax,
  range,
  cursor,
  onCursorChange,
}: {
  className?: string;
  data: PlatformDashboardAILanguageActivityReadModel[];
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
  const xScaleRef = useRef<d3.ScaleBand<number> | null>(null);

  const chartId = useId().replace(/:/g, "");
  const clipId = `approval-activity-clip-${chartId}`;

  const [elementRef, size] = useElementDimensions<HTMLDivElement>();

  const { points, countsByTime } = useMemo(
    () => buildSeries(data, range),
    [data, range],
  );

  const effectiveYMax = Math.max(yMax, 1);

  useEffect(() => {
    const svg = d3.select(svgRef.current);

    const xScale = d3
      .scaleBand<number>()
      .domain(points.map((p) => p.valueOf()))
      .range([0, size.inlineSize])
      .padding(0.15);
    const yScale = d3
      .scaleLinear()
      .domain([0, effectiveYMax])
      .range([size.blockSize, 0]);
    xScaleRef.current = xScale;

    const defs = svg.append("defs");
    defs
      .append("clipPath")
      .attr("id", clipId)
      .append("rect")
      .attr("width", size.inlineSize)
      .attr("height", size.blockSize);

    const g = svg.append("g");

    // Baseline
    g.append("line")
      .attr("x1", 0)
      .attr("x2", size.inlineSize)
      .attr("y1", size.blockSize)
      .attr("y2", size.blockSize)
      .style("stroke", "var(--color-gray-300)");

    // Stacked bars — bottom layer is UserInput, then MachineSuggestion,
    // GoogleSuggestion, LLM_Suggestion on top.
    for (const method of APPROVAL_METHOD_KEYS) {
      g.selectAll(`.bar-${method}`)
        .data(points)
        .join("rect")
        .attr("class", `bar-${method}`)
        .attr("clip-path", `url(#${clipId})`)
        .style("fill", APPROVAL_METHOD_COLORS[method])
        .attr("rx", 1)
        .attr("x", (d) => xScale(d.valueOf()) ?? 0)
        .attr("width", xScale.bandwidth())
        .attr("y", (d) => {
          const counts = countsByTime.get(d.valueOf());
          const value = counts?.[method] ?? 0;
          const bottomOffset = stackedBottomOffset(
            countsByTime,
            d.valueOf(),
            method,
          );
          return yScale(bottomOffset + value);
        })
        .attr("height", (d) => {
          const counts = countsByTime.get(d.valueOf());
          const value = counts?.[method] ?? 0;
          if (value === 0) return 0;
          return size.blockSize - yScale(value);
        });
    }

    cursorLineRef.current = svg
      .append("line")
      .attr("y1", 0)
      .attr("y2", size.blockSize)
      .style("stroke", "var(--color-gray-400)")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "3 2")
      .attr("pointer-events", "none")
      .style("display", "none");

    svg.on("mousemove", function (event: MouseEvent) {
      const [mouseX] = d3.pointer(event);
      const hoveredBucket = findNearestBucket(xScale, points, mouseX);
      if (hoveredBucket !== null) {
        onCursorChange(new UTCDate(hoveredBucket));
      }
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
  }, [
    countsByTime,
    effectiveYMax,
    clipId,
    onCursorChange,
    points,
    range,
    size,
  ]);

  useEffect(() => {
    const line = cursorLineRef.current;
    const xScale = xScaleRef.current;

    if (!line || !xScale) {
      return;
    }

    if (cursor === null) {
      line.style("display", "none");
      return;
    }

    const bucketTime = toBucketTime(cursor, range);
    const x = (xScale(bucketTime) ?? 0) + xScale.bandwidth() / 2;

    line.style("display", null).attr("x1", x).attr("x2", x);
  }, [cursor, range]);

  return (
    <div ref={elementRef} className={`relative ${className}`}>
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

function findNearestBucket(
  xScale: d3.ScaleBand<number>,
  points: Date[],
  mouseX: number,
): number | null {
  let closest: number | null = null;
  let closestDist = Infinity;
  for (const point of points) {
    const bandStart = xScale(point.valueOf());
    if (bandStart === undefined) continue;
    const bandCenter = bandStart + xScale.bandwidth() / 2;
    const dist = Math.abs(mouseX - bandCenter);
    if (dist < closestDist) {
      closestDist = dist;
      closest = point.valueOf();
    }
  }
  return closest;
}

function stackedBottomOffset(
  countsByTime: Map<number, Record<GlossApprovalMethodRaw, number>>,
  bucketTime: number,
  method: GlossApprovalMethodRaw,
): number {
  let offset = 0;
  for (const m of APPROVAL_METHOD_KEYS) {
    if (m === method) break;
    offset += countsByTime.get(bucketTime)?.[m] ?? 0;
  }
  return offset;
}

function buildSeries(
  data: PlatformDashboardAILanguageActivityReadModel[],
  range: ActivityChartRange,
) {
  const now =
    range === "30d" ?
      startOfDay(new UTCDate())
    : startOfWeek(new UTCDate(), { weekStartsOn: 1 });
  const start = range === "30d" ? subDays(now, 29) : subWeeks(now, 26);
  const points =
    range === "30d" ?
      eachDayOfInterval({ start, end: now })
    : eachWeekOfInterval({ start, end: now }, { weekStartsOn: 1 });

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

  const totals: Record<GlossApprovalMethodRaw, number> = {
    USER_INPUT: 0,
    MACHINE_SUGGESTION: 0,
    GOOGLE_SUGGESTION: 0,
    LLM_SUGGESTION: 0,
  };

  for (const entry of data) {
    const bucketTime = toBucketTime(entry.date, range);
    const counts = countsByTime.get(bucketTime);
    if (!counts) continue;
    counts[entry.method] += entry.count;
    totals[entry.method] += entry.count;
  }

  return { points, countsByTime, totals };
}

function toBucketTime(date: Date, range: ActivityChartRange) {
  const dateAsUtc = new UTCDate(date);
  return (
    range === "30d" ?
      startOfDay(dateAsUtc)
    : startOfWeek(dateAsUtc, { weekStartsOn: 1 })).valueOf();
}
