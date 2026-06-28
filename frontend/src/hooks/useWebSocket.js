/**
 * HireFlow AI — WebSocket Hook (Step 4).
 * Connects to /ws/pipeline for real-time pipeline stage updates.
 */
export function useWebSocket() {
  return { connected: false, lastEvent: null };
}
