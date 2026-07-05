import type { Model } from "@/domain/Model";

export type CreateModelInput = Omit<Model, "id">;

export class ModelService {
  async getModels(): Promise<Model[]> {
    const response = await fetch("/api/models");

    if (!response.ok) {
      throw new Error("No se han podido cargar los modelos");
    }

    return response.json() as Promise<Model[]>;
  }

  async createModel(model: CreateModelInput): Promise<Model> {
    const response = await fetch("/api/models", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(model),
    });

    if (!response.ok) {
      throw new Error("No se ha podido guardar el modelo");
    }

    return response.json() as Promise<Model>;
  }

  async updateModel(id: string, model: CreateModelInput): Promise<Model> {
    const response = await fetch(`/api/models/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(model),
    });

    if (!response.ok) {
      throw new Error("No se ha podido actualizar el modelo");
    }

    return response.json() as Promise<Model>;
  }

  async deleteModel(id: string): Promise<void> {
    const response = await fetch(`/api/models/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error("No se ha podido borrar el modelo");
    }
  }
}
