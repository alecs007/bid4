"use client";

import { cn } from "@/lib/utils/cn";

const THUMB =
  "[&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 " +
  "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full " +
  "[&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 " +
  "[&::-webkit-slider-thumb]:border-primary-600 [&::-webkit-slider-thumb]:cursor-grab " +
  "[&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:active:scale-110 " +
  "[&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 " +
  "[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white " +
  "[&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-primary-600 " +
  "[&::-moz-range-thumb]:cursor-grab " +
  "[&::-webkit-slider-thumb]:shadow-none [&::-moz-range-thumb]:shadow-none";

const BASE_INPUT =
  "absolute inset-x-0 top-1/2 h-5 w-full -translate-y-1/2 cursor-pointer appearance-none bg-transparent " +
  "focus-visible:outline-none [-webkit-tap-highlight-color:transparent]";

function percent(value: number, min: number, max: number): number {
  if (max <= min) return 0;
  return ((value - min) / (max - min)) * 100;
}

export function Slider({
  value,
  min,
  max,
  step = 1,
  onChange,
  label,
  formatValue,
  className,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  label: string;
  formatValue?: (value: number) => string;
  className?: string;
}) {
  return (
    <div className={cn("w-full", className)}>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <span className="text-sm font-bold text-ink-700">{label}</span>
        <span className="numeric text-sm font-extrabold text-ink-900">
          {formatValue ? formatValue(value) : value}
        </span>
      </div>
      <div className="relative h-5">
        <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-ink-200" />
        <div
          className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-primary-500"
          style={{ left: 0, width: `${percent(value, min, max)}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          aria-label={label}
          onChange={(event) => onChange(Number(event.target.value))}
          className={cn(BASE_INPUT, THUMB)}
        />
      </div>
    </div>
  );
}

export function RangeSlider({
  min,
  max,
  step = 1,
  value,
  onChange,
  label,
  formatValue,
  className,
}: {
  min: number;
  max: number;
  step?: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  label: string;
  formatValue?: (value: number) => string;
  className?: string;
}) {
  const [low, high] = value;
  const format = formatValue ?? ((input: number) => String(input));

  return (
    <div className={cn("w-full", className)}>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <span className="text-sm font-bold text-ink-700">{label}</span>
        <span className="numeric text-sm font-extrabold text-ink-900">
          {format(low)} la {format(high)}
        </span>
      </div>
      <div className="relative h-5">
        <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-ink-200" />
        <div
          className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-primary-500"
          style={{
            left: `${percent(low, min, max)}%`,
            right: `${100 - percent(high, min, max)}%`,
          }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={low}
          aria-label={`${label}, minim`}
          onChange={(event) =>
            onChange([Math.min(Number(event.target.value), high - step), high])
          }
          className={cn(BASE_INPUT, THUMB, "pointer-events-none")}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={high}
          aria-label={`${label}, maxim`}
          onChange={(event) =>
            onChange([low, Math.max(Number(event.target.value), low + step)])
          }
          className={cn(BASE_INPUT, THUMB, "pointer-events-none")}
        />
      </div>
    </div>
  );
}
