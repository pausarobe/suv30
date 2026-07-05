export interface Advertisement {
  id: string;

  modelId: string;

  title: string;

  url: string;

  price: number;

  year: number;

  km: number;

  fuel: string;

  gearbox: string;

  horsepower: number;

  city: string;

  province: string;

  seller: string;

  source: string;

  firstSeen: string;

  lastSeen: string;

  notes?: string;
}
