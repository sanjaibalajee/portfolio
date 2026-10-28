"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Envelope, RoomView, ServerMessage } from "@/lib/party/types";
import { hasContentStock } from "@/lib/party/availability";
import {
  clearLocal,
  endpointUrl,
  readLocal,
  writeLocal,
  type Seat,
} from "./shared";
// Why the connection ended for good: another tab took the seat, the seat or
// display link was rejected, the room expired, or this page is out of date.
export type Terminal = "" | "tab" | "seat" | "ended" | "update";
export function usePartySocket(
  code: string,
  endpoint: string,
  socketEndpoint: string,
  seat: Seat | null,
  display: boolean,
  displayAdult = false,
  displayKey = "",
) {
  const [state, setState] = useState<RoomView>();
  const [status, setStatus] = useState("connecting");
  const [error, setError] = useState("");
  const [terminal, setTerminal] = useState<Terminal>("");
  const socket = useRef<WebSocket | null>(null);
  const authenticated = useRef(false);
  const pending = useRef(new Map<string, Envelope>());
  const draftKeys = useRef(new Map<string, string>());
  const current = useRef<RoomView | undefined>(undefined);
  const offset = useRef(0);
  const credential = seat ? JSON.stringify(seat) : "";
  useEffect(() => {
    if (!endpoint || (!credential && !(display && displayKey))) return;
    let stopped = false;
    let ended = false;
    let updating = false;
    let stale = 0;
    let attempt = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let ws: WebSocket;
    let lastResponse = Date.now();
    authenticated.current = false;
    current.current = undefined;
    pending.current.clear();
    draftKeys.current.clear();
    const saved = readLocal(`party:pending:${code}`);
    if (saved && !display) {
      try {
        const items = JSON.parse(saved) as (
          Envelope | { intent: Envelope; draftKey?: string }
        )[];
        for (const item of items) {
          const x = (
            "intent" in item && typeof item.intent === "object"
              ? item.intent
              : item
          ) as Envelope;
          if (["answer", "vote"].includes(x.type) && typeof x.id === "string") {
            pending.current.set(x.id, x);
            const key = "draftKey" in item ? item.draftKey : undefined;
            if (
              typeof key === "string" &&
              key.startsWith(`party:draft:${code}:`)
            )
              draftKeys.current.set(x.id, key);
          }
        }
      } catch {}
    }
    function persist() {
      writeLocal(
        `party:pending:${code}`,
        JSON.stringify(
          [...pending.current.values()]
            .filter((x) => x.type === "answer" || x.type === "vote")
            .map((intent) => ({
              intent,
              draftKey: draftKeys.current.get(intent.id),
            })),
        ),
      );
    }
    function end(reason: Terminal, message: string) {
      ended = true;
      clearTimeout(timer);
      setStatus("closed");
      setTerminal(reason);
      setError(message);
    }
    function connect() {
      if (stopped || ended) return;
      authenticated.current = false;
      setStatus("connecting");
      lastResponse = Date.now();
      let synced = false;
      const url =
        socketEndpoint || endpointUrl(endpoint).replace(/^http/, "ws");
      const connection = new WebSocket(`${url}/rooms/${code}/ws`);
      ws = connection;
      socket.current = connection;
      connection.onopen = () => {
        setTerminal("");
        if (stopped || connection !== ws) {
          connection.close();
          return;
        }
        connection.send(
          JSON.stringify({
            type: "auth",
            ...(display
              ? { watch: true, display: displayKey, adult: displayAdult }
              : JSON.parse(credential)),
          }),
        );
      };
      connection.onmessage = (e) => {
        if (stopped || connection !== ws) return;
        lastResponse = Date.now();
        if (e.data === "pong") return;
        let message: ServerMessage;
        try {
          message = JSON.parse(e.data);
        } catch {
          return;
        }
        if (!message || typeof message !== "object") return;
        if (message.type === "state") {
          if (!hasContentStock(message.state?.stock)) {
            updating = true;
            authenticated.current = false;
            current.current = undefined;
            setState(undefined);
            // Browsers only allow 1000 or 3000–4999 from a page.
            if (++stale >= 3) {
              connection.onclose = null;
              connection.close(1000, "Page out of date");
              end("update", "This page is out of date. Reload to keep playing.");
              return;
            }
            setStatus("reconnecting");
            setError("The room is updating. Reconnecting in a moment…");
            connection.close(4000, "Reconnect for room update");
            return;
          }
          stale = 0;
          if (updating) {
            setError("");
            updating = false;
          }
          const reveal = message.state.round?.reveal;
          if (reveal?.cached)
            reveal.chains =
              current.current?.round?.id === message.state.round!.id
                ? current.current.round.reveal?.chains || []
                : [];
          current.current = message.state;
          authenticated.current = true;
          setState(message.state);
          offset.current = message.state.serverNow - Date.now();
          setStatus("live");
          attempt = 0;
          if (message.state.me?.submitted && message.state.round)
            clearLocal(
              `party:draft:${code}:${message.state.round.id}:${message.state.round.step}`,
            );
          for (const [id, intent] of pending.current) {
            const round = message.state.round;
            if (intent.roundId && (
              intent.roundId !== round?.id ||
              (intent.type === "answer" && (round?.phase !== "answer" ||
                (round.game === "draw" && intent.step !== round.step))) ||
              (intent.type === "vote" && round?.phase !== "vote") ||
              (intent.type === "advance" && (intent.phase !== round?.phase || intent.step !== round?.step))
            )) {
              const key = draftKeys.current.get(id);
              if (key) clearLocal(key);
              draftKeys.current.delete(id);
              pending.current.delete(id);
              continue;
            }
            if (!synced && ws.readyState === WebSocket.OPEN)
              ws.send(JSON.stringify(intent));
          }
          synced = true;
          persist();
        } else if (message.type === "ack") {
          const key = draftKeys.current.get(message.id);
          if (key) clearLocal(key);
          draftKeys.current.delete(message.id);
          pending.current.delete(message.id);
          persist();
        } else if (message.type === "error") {
          setError(message.error);
          if (message.id) {
            pending.current.delete(message.id);
            draftKeys.current.delete(message.id);
          }
          persist();
        }
      };
      connection.onclose = (e) => {
        if (stopped || connection !== ws) return;
        authenticated.current = false;
        if (e.code === 4001)
          return end(
            "tab",
            "This seat is open in another tab. Close that tab, then reload here.",
          );
        if (e.code === 4004)
          return end("ended", "This party has ended. Start a fresh room.");
        if (e.code === 4003)
          return end(
            "seat",
            display
              ? "This display link is no longer valid. Copy a new one from the host’s phone."
              : "This seat is no longer available. Leave and join again.",
          );
        setStatus("reconnecting");
        timer = setTimeout(
          connect,
          Math.min(10000, 500 * 2 ** attempt++) + Math.random() * 300,
        );
      };
      connection.onerror = () => {
        if (stopped || connection !== ws) return;
        authenticated.current = false;
        setStatus("reconnecting");
      };
    }
    function checkConnection() {
      if (stopped || ended) return;
      if (Date.now() - lastResponse >= 75000) {
        authenticated.current = false;
        setStatus("reconnecting");
        // A stalled OPEN socket need not deliver a close event promptly.
        // Retire its handlers and establish a new authenticated connection.
        ws.onclose = null;
        ws.close();
        clearTimeout(timer);
        connect();
      } else if (ws.readyState === WebSocket.OPEN) {
        ws.send("ping");
      }
    }
    connect();
    const ping = setInterval(checkConnection, 25000);
    const online = () => {
      if (stopped || ended || document.visibilityState !== "visible") return;
      if (ws?.readyState === WebSocket.CLOSED) {
        clearTimeout(timer);
        connect();
      } else checkConnection();
    };
    window.addEventListener("online", online);
    document.addEventListener("visibilitychange", online);
    return () => {
      stopped = true;
      authenticated.current = false;
      clearTimeout(timer);
      clearInterval(ping);
      window.removeEventListener("online", online);
      document.removeEventListener("visibilitychange", online);
      ws?.close();
      socket.current = null;
    };
  }, [code, endpoint, socketEndpoint, credential, display, displayAdult, displayKey]);
  const send = useCallback(
    (type: string, data: Record<string, unknown> = {}) => {
      if (!authenticated.current || socket.current?.readyState !== WebSocket.OPEN || !current.current) {
        setError("Reconnecting. Your draft is saved on this device.");
        return false;
      }
      const intent: Envelope = {
        ...data,
        type,
        id: crypto.randomUUID(),
        // Scope to the screen the player acted on, even if a newer snapshot
        // arrived before React could render it.
        roundId: state?.round?.id,
        phase: state?.round?.phase,
        step: state?.round?.step,
        revision: state?.revision,
      };
      pending.current.set(intent.id, intent);
      if (type === "answer" && state?.round)
        draftKeys.current.set(
          intent.id,
          `party:draft:${code}:${state.round.id}:${state.round.step}`,
        );
      writeLocal(
        `party:pending:${code}`,
        JSON.stringify(
          [...pending.current.values()]
            .filter((x) => x.type === "answer" || x.type === "vote")
            .map((intent) => ({
              intent,
              draftKey: draftKeys.current.get(intent.id),
            })),
        ),
      );
      socket.current.send(JSON.stringify(intent));
      setError("");
      return true;
    },
    [code, state],
  );
  return { state, status, error, setError, send, terminal, offset };
}
