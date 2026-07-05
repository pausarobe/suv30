import type { Model } from "@/domain/Model";

export class ModelService {
  async getModels(): Promise<Model[]> {
    const response = await fetch("/api/models");

    if (!response.ok) {
      throw new Error("No se han podido cargar los modelos");
    }

    return response.json() as Promise<Model[]>;
  }
}
