"use client";
import { useRef, useState } from "react";
import type { Stroke } from "@/lib/party/types";
import styles from "./party.module.css";
const colours = {
  ink: "#202620",
  red: "#c34b4b",
  blue: "#4a72bd",
  green: "#2f8358",
};
export function Drawing({
  strokes,
  label = "A player’s drawing",
}: {
  strokes: Stroke[];
  label?: string;
}) {
  return (
    <svg
      className={styles.canvasStatic}
      viewBox="0 0 800 600"
      role="img"
      aria-label={label}
    >
      {strokes.map((s, i) => (
        <polyline
          key={i}
          points={s.points.map(([x, y]) => `${x * 800},${y * 600}`).join(" ")}
          fill="none"
          stroke={colours[s.color as keyof typeof colours] || colours.ink}
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}
export function DrawingPad({
  value,
  onChange,
}: {
  value: Stroke[];
  onChange: (strokes: Stroke[]) => void;
}) {
  const [colour, setColour] = useState<keyof typeof colours>("ink");
  const [current, setCurrent] = useState<Stroke>();
  const live = useRef<Stroke | undefined>(undefined);
  // The finger or pen drawing the current stroke. Others (a palm, a second
  // finger) are ignored until it lifts.
  const pointer = useRef<number | null>(null);
  function point(e: React.PointerEvent<SVGSVGElement>): [number, number] {
    const r = e.currentTarget.getBoundingClientRect();
    return [
      Number(
        Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)).toFixed(3),
      ),
      Number(
        Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)).toFixed(3),
      ),
    ];
  }
  function end(e: React.PointerEvent<SVGSVGElement>) {
    if (e.pointerId !== pointer.current) return;
    pointer.current = null;
    if (live.current) {
      onChange([...value, live.current]);
      live.current = undefined;
      setCurrent(undefined);
    }
  }
  return (
    <div>
      <p className={styles.small}>
        Draw with your finger, pen, or mouse. No artistic ability expected.
      </p>
      <div className={styles.palette}>
        {Object.entries(colours).map(([id, hex]) => (
          <button
            type="button"
            key={id}
            aria-label={`${id} pen`}
            aria-pressed={colour === id}
            onClick={() => setColour(id as keyof typeof colours)}
          >
            <i style={{ background: hex }} />
          </button>
        ))}
        <button
          type="button"
          onClick={() => onChange(value.slice(0, -1))}
          disabled={!value.length}
        >
          undo
        </button>
        <button
          type="button"
          onClick={() => onChange([])}
          disabled={!value.length}
        >
          clear
        </button>
      </div>
      <svg
        className={styles.canvas}
        viewBox="0 0 800 600"
        role="img"
        aria-label="Drawing area. Drag to draw. Undo and clear buttons are above."
        onPointerDown={(e) => {
          if (
            pointer.current !== null ||
            value.length >= 70 ||
            // The server accepts 2,000 points; a stroke adds up to 180.
            value.reduce((n, s) => n + s.points.length, 0) >= 1800
          )
            return;
          e.preventDefault();
          e.currentTarget.setPointerCapture(e.pointerId);
          pointer.current = e.pointerId;
          live.current = { color: colour, points: [point(e)] };
          setCurrent(live.current);
        }}
        onPointerMove={(e) => {
          if (
            e.pointerId !== pointer.current ||
            !live.current ||
            live.current.points.length >= 180
          )
            return;
          const p = point(e);
          const last = live.current.points.at(-1)!;
          if (Math.hypot(p[0] - last[0], p[1] - last[1]) < 0.003) return;
          live.current = {
            ...live.current,
            points: [...live.current.points, p],
          };
          setCurrent(live.current);
        }}
        onPointerUp={end}
        onPointerCancel={end}
        onLostPointerCapture={end}
      >
        {[...value, ...(current ? [current] : [])].map((s, i) => (
          <polyline
            key={i}
            points={s.points.map(([x, y]) => `${x * 800},${y * 600}`).join(" ")}
            fill="none"
            stroke={colours[s.color as keyof typeof colours]}
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </svg>
      <p className={styles.small}>
        {value.length}/70 strokes · drawings stay in this room
      </p>
    </div>
  );
}
