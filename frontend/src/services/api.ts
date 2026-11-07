import type { ApiFieldError, DiamondInput, ModelInfo, PredictionResponse, RateInfo } from "../types";

export const API_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:8000").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number,
    public readonly fields: ApiFieldError[] = [],
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit, signal?: AbortSignal): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      signal,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
  } catch (err) {
    if ((err as Error).name === "AbortError") throw err;
    throw new ApiError(
      `Can't reach the valuation service at ${API_URL}. Check that the backend is running and that CORS allows this site.`,
      "network_error",
      0,
    );
  }

  if (!res.ok) {
    let code = "http_error";
    let message = `The service responded with an error (${res.status}).`;
    let fields: ApiFieldError[] = [];
    try {
      const body = await res.json();
      if (body?.error) {
        code = body.error.code ?? code;
        message = body.error.message ?? message;
        fields = body.error.fields ?? [];
      }
    } catch {
      /* non-JSON error body: keep the generic message */
    }
    throw new ApiError(message, code, res.status, fields);
  }
  return (await res.json()) as T;
}

export const api = {
  predict: (input: DiamondInput, signal?: AbortSignal) =>
    request<PredictionResponse>("/predict", { method: "POST", body: JSON.stringify(input) }, signal),
  exchangeRate: (signal?: AbortSignal) => request<RateInfo>("/exchange-rate", undefined, signal),
  modelInfo: (signal?: AbortSignal) => request<ModelInfo>("/model-info", undefined, signal),
};
