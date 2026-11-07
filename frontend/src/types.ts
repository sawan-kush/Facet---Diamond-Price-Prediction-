export type Cut = "Fair" | "Good" | "Very Good" | "Premium" | "Ideal";
export type Color = "D" | "E" | "F" | "G" | "H" | "I" | "J";
export type Clarity = "I1" | "SI2" | "SI1" | "VS2" | "VS1" | "VVS2" | "VVS1" | "IF";

export interface DiamondInput {
  carat: number;
  cut: Cut;
  color: Color;
  clarity: Clarity;
  depth: number;
  table: number;
  x: number;
  y: number;
  z: number;
}

export interface RateInfo {
  base: "USD";
  quote: "INR";
  rate: number;
  source: string;
  as_of: string;
  fetched_at: string;
  is_fallback: boolean;
  is_stale: boolean;
  note?: string | null;
}

export interface PredictionResponse {
  price_inr: number;
  price_usd: number | null;
  model_output: { value: number; currency: "USD" | "INR" };
  converted: boolean;
  exchange_rate: RateInfo | null;
  input: DiamondInput;
  warnings: string[];
  predicted_at: string;
}

export interface LayerInfo {
  name: string;
  type: string;
  params: number;
  units?: number;
  activation?: string;
  dropout_rate?: number;
  l2?: number;
}

export interface EvaluationData {
  history?: { loss: number[]; val_loss?: number[] };
  actual_vs_predicted?: { actual: number[]; predicted: number[] };
}

export interface ModelInfo {
  name: string;
  framework: string;
  input_dim: number;
  output_dim: number;
  feature_columns: string[];
  categories: { cut: string[]; color: string[]; clarity: string[] };
  architecture: LayerInfo[];
  total_params: number;
  output_currency: "USD" | "INR";
  target_scaler: { mean: number; std: number };
  reported_metrics: {
    train_r2: number;
    test_r2: number;
    mae: number;
    rmse: number;
    source?: string;
  } | null;
  evaluation: EvaluationData | null;
}

export interface ApiFieldError {
  field: string;
  message: string;
}
