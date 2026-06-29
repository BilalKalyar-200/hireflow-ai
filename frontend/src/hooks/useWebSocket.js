/**
 * FILE 3 of 14 — HireFlow AI WebSocket Hook.
 * Connects to /ws/pipeline for real-time pipeline stage updates.
 */

import { useCallback, useEffect, useRef, useState } from "react";

const WS_URL =
  import.meta.env.VITE_WS_URL || "ws://localhost:8000/ws/pipeline";

/**
 * React hook for pipeline WebSocket connection.
 * Input: onEvent callback, enabled boolean
 * Output: { connected, lastEvent, reconnect }
 */
export function useWebSocket(onEvent, enabled = true) {
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState(null);
  const wsRef = useRef(null);
  const onEventRef = useRef(onEvent);

  onEventRef.current = onEvent;

  const connect = useCallback(() => {
    if (!enabled) return;

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => setConnected(true);

      ws.onmessage = (message) => {
        try {
          const data = JSON.parse(message.data);
          setLastEvent(data);
          if (onEventRef.current) onEventRef.current(data);
        } catch {
          /* ignore malformed messages */
        }
      };

      ws.onclose = () => {
        setConnected(false);
        wsRef.current = null;
      };

      ws.onerror = () => setConnected(false);
    } catch {
      setConnected(false);
    }
  }, [enabled]);

  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  /** Input: none | Output: none — reconnects WebSocket */
  const reconnect = useCallback(() => {
    if (wsRef.current) wsRef.current.close();
    connect();
  }, [connect]);

  return { connected, lastEvent, reconnect };
}
