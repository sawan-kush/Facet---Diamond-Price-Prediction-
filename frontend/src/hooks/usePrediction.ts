import { useCallback, useRef, useState } from "react";
import { api, ApiError } from "../services/api";
import type { DiamondInput, PredictionResponse } from "../types";

export type PredictionState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; result: PredictionResponse }
  | { status: "error"; error: ApiError };

export function usePrediction() {
  const [state, setState] = useState<PredictionState>({ status: "idle" });
  const ctrl = useRef<AbortController | null>(null);

  const run = useCallback(async (input: DiamondInput) => {
    ctrl.current?.abort();
    const c = new AbortController();
    ctrl.current = c;
    setState({ status: "loading" });
    try {
      const result = await api.predict(input, c.signal);
      if (!c.signal.aborted) setState({ status: "success", result });
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setState({ status: "error", error: e instanceof ApiError ? e : new ApiError(String(e), "unknown", 0) });
    }
  }, []);

  const reset = useCallback(() => {
    ctrl.current?.abort();
    setState({ status: "idle" });
  }, []);

  return { state, run, reset };
}
