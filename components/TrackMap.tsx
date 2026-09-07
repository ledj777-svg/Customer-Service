"use client";

import type { TrackingSnapshot } from "@/lib/types";
import { prettyStatus, when } from "@/lib/format";

export function TrackMap({ tracking, orderId }: { tracking: TrackingSnapshot; orderId: string }) {
  const x = 40 + tracking.progress * 220;
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#10231f] text-[#f4efe6]">
      <div className="flex items-start justify-between gap-3 px-4 pt-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#c9b89a]">Live courier</p>
          <p className="display text-lg">{prettyStatus(tracking.status)}</p>
          <p className="mt-1 text-sm text-[#d7cbb8]">{tracking.headline}</p>
        </div>
        <div className="text-right text-xs text-[#c9b89a]">
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
          const done = i <= Math.round(tracking.progress * (tracking.stops.length - 1));
          return (
            <g key={stop.code}>
              <circle cx={px} cy={py} r="6" fill={done ? "#e7b45a" : "#1e3b36"} stroke="#f4efe6" strokeWidth="1" />
              <text x={px} y={py + 18} textAnchor="middle" fill="#c9b89a" fontSize="8">
                {stop.city}
              </text>
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
      <div className="grid grid-cols-2 gap-2 px-4 pb-4 text-xs text-[#d7cbb8] sm:grid-cols-4">
        {tracking.stops.map((stop) => (
          <div key={stop.code} className="rounded-xl bg-white/5 px-2 py-2">
            <div className="text-[10px] uppercase tracking-wider text-[#e7b45a]">{stop.label}</div>
            <div>{stop.city}</div>
            <div className="opacity-70">{stop.at ? when(stop.at) : "pending"}</div>
          </div>
        ))}
      </div>
      <p className="px-4 pb-4 text-[11px] text-[#9aa89f]">
        {tracking.courier} · {tracking.currentCity} · {tracking.lat.toFixed(3)}, {tracking.lng.toFixed(3)}
      </p>
    </div>
  );
}
