export type OpportunityClassification =
  | "Chollo"
  | "Oportunidad"
  | "Interesante"
  | "Normal"
  | "Descartado";

export type OpportunityScore = {
  score: number;
  classification: OpportunityClassification;
  reasons: string[];
  isRadarDeal: boolean;
};
