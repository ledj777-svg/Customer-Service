"use client";

import type { TrackingSnapshot } from "@/lib/types";
import { prettyStatus, when } from "@/lib/format";

function stamp(iso?: string) {
  if (!iso) return "Pending";
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export function TrackMap({ tracking, orderId }: { tracking: TrackingSnapshot; orderId: string }) {
  const x = 40 + tracking.progress * 220;
  const reached = Math.round(tracking.progress * (tracking.stops.length - 1));
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#10231f] text-[#f4efe6]">
      <div className="flex items-start justify-between gap-3 px-4 pt-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#c9b89a]">Live courier</p>
          <p className="display text-lg">{prettyStatus(tracking.status)}</p>
          <p className="mt-1 text-sm text-[#d7cbb8]">{tracking.headline}</p>
        </div>
        <div className="shrink-0 text-right text-xs text-[#c9b89a]">
          <div>{orderId}</div>
          <div>ETA {when(tracking.eta)}</div>
        </div>
      </div>
      <svg viewBox="0 0 300 140" className="mt-2 h-36 w-full">
        <rect width="300" height="140" fill="#0c1c19" />
        <path d="M20 110 C 80 20, 140 130, 200 50 S 280 30, 280 80" fill="none" stroke="#2f5c54" strokeWidth="8" />
        <path d="M20 110 C 80 20, 140 130, 200 50 S 280 30, 280 80" fill="none" stroke="#7dbaad" strokeWidth="2" strokeDasharray="6 8" />
        {tracking.stops.map((stop, i) => {
          const px = 36 + i * 76;
          const py = i === 0 ? 104 : i === 1 ? 48 : i === 2 ? 78 : 58;
          const done = i <= reached;
          return (
            <g key={stop.code}>
              <circle cx={px} cy={py} r="6" fill={done ? "#e7b45a" : "#1e3b36"} stroke="#f4efe6" strokeWidth="1" />
            </g>
          );
        })}
        <g transform={`translate(${x} ${36 + Math.sin(tracking.progress * 6) * 8})`}>
          <rect x="-11" y="-7" width="22" height="14" rx="4" fill="#c45c3e" />
          <text x="0" y="3" textAnchor="middle" fill="#fff" fontSize="8">
            van
          </text>
        </g>
      </svg>

      <ol className="px-4 pb-3">
        {tracking.stops.map((stop, i) => {
          const done = i <= reached;
          return (
            <li key={stop.code} className="grid grid-cols-[14px_1fr] gap-3">
              <div className="flex flex-col items-center">
                <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${done ? "bg-[#e7b45a]" : "bg-white/20"}`} />
                {i < tracking.stops.length - 1 ? <span className="w-px flex-1 bg-white/15" /> : null}
              </div>
              <div className={i < tracking.stops.length - 1 ? "pb-3" : "pb-1"}>
                <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#e7b45a]">{stop.label}</p>
                <div className="mt-0.5 flex items-baseline justify-between gap-3 text-sm">
                  <span>{stop.city}</span>
                  <span className="shrink-0 text-xs text-[#9aa89f]">{stamp(stop.at)}</span>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      <p className="px-4 pb-4 text-[11px] text-[#9aa89f]">
        {tracking.courier} · {tracking.currentCity}
      </p>
    </div>
  );
}
