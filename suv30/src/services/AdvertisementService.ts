import type { Advertisement } from "@/domain/Advertisement";

export type CreateAdvertisementInput = Omit<
  Advertisement,
  "id" | "firstSeen" | "lastSeen"
>;

export class AdvertisementService {
  async getAdvertisements(): Promise<Advertisement[]> {
    const response = await fetch("/api/advertisements");

    if (!response.ok) {
      throw new Error("No se han podido cargar los anuncios");
    }

    return response.json() as Promise<Advertisement[]>;
  }

  async getAdvertisement(id: string): Promise<Advertisement> {
    const response = await fetch(`/api/advertisements/${encodeURIComponent(id)}`);

    if (!response.ok) {
      throw new Error("No se ha podido cargar el anuncio");
    }

    return response.json() as Promise<Advertisement>;
  }

  async createAdvertisement(
    advertisement: CreateAdvertisementInput
  ): Promise<Advertisement> {
    const response = await fetch("/api/advertisements", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(advertisement),
    });

    if (!response.ok) {
      throw new Error("No se ha podido guardar el anuncio");
    }

    return response.json() as Promise<Advertisement>;
  }

  async updateAdvertisement(
    id: string,
    advertisement: CreateAdvertisementInput
  ): Promise<Advertisement> {
    const response = await fetch(
      `/api/advertisements/${encodeURIComponent(id)}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(advertisement),
      }
    );

    if (!response.ok) {
      throw new Error("No se ha podido actualizar el anuncio");
    }

    return response.json() as Promise<Advertisement>;
  }

  async deleteAdvertisement(id: string): Promise<void> {
    const response = await fetch(
      `/api/advertisements/${encodeURIComponent(id)}`,
      {
        method: "DELETE",
      }
    );

    if (!response.ok) {
      throw new Error("No se ha podido borrar el anuncio");
    }
  }
}
