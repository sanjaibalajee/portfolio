"use client";
import type { ReactNode } from "react";
import styles from "./party.module.css";
export function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`${styles.panel} ${className}`}>{children}</section>
  );
}
export function Command({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...props} className={`${styles.command} ${props.className || ""}`}>
      {children}
    </button>
  );
}
export function endpointUrl(endpoint: string) {
  return endpoint === "local"
    ? `${window.location.protocol}//${window.location.hostname}:8787`
    : endpoint;
}
export interface Seat {
  code: string;
  playerId: string;
  token: string;
}
const memory = new Map<string, string>();
export function readLocal(key: string) {
  try {
    return localStorage.getItem(key) ?? memory.get(key) ?? null;
  } catch {
    return memory.get(key) ?? null;
  }
}
export function writeLocal(key: string, value: string) {
  memory.set(key, value);
  try {
    localStorage.setItem(key, value);
  } catch {}
}
export function clearLocal(key: string) {
  memory.delete(key);
  try {
    localStorage.removeItem(key);
  } catch {}
}
export function rememberSeat(seat: Seat) {
  writeLocal(`party:seat:${seat.code}`, JSON.stringify(seat));
}
export async function joinParty(
  endpoint: string,
  name: string,
  code?: string,
  adult = false,
): Promise<Seat> {
  const response = await fetch(
    `${endpointUrl(endpoint)}/rooms${code ? `/${code}/join` : ""}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, adult }),
      signal: AbortSignal.timeout(10000),
    },
  );
  const result = await response.json();
  if (!response.ok)
    throw new Error(result.error || "Could not join. Try again.");
  rememberSeat(result);
  writeLocal("party:name", name);
  return result;
}
