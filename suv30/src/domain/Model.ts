export interface Model {
  id: string;
  brand: string;
  model: string;
  generation: string;
  length: number;
  width: number;
  height: number;
  trunk: number;
  consumption: number;
  ecoLabel: "0" | "ECO" | "C" | "B";
}
