import type { Advertisement } from "@/domain/Advertisement";

export type CreateAdvertisementInput = Omit<
  Advertisement,
  "id" | "firstSeen" | "lastSeen"
>;

export type MarketplaceImportInput = {
  source: string;
  modelId: string;
  searchUrl: string;
  maxResults: number;
};

export type MarketplaceImportResult = {
  imported: number;
  updated: number;
  skipped: number;
  errors: string[];
  results: Array<{
    status: "imported" | "updated" | "skipped" | "error";
    id?: string;
    title?: string;
    url: string;
    reason?: string;
  }>;
};

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

  async importFromMarketplace(
    input: MarketplaceImportInput
  ): Promise<MarketplaceImportResult> {
    const response = await fetch("/api/import/listings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      const responseText = await response.text();
      const errorResponse = (() => {
        try {
          return JSON.parse(responseText) as { error?: string };
        } catch {
          return null;
        }
      })();

      if (response.status === 404 && responseText.includes("Cannot POST")) {
        throw new Error(
          "El servidor API no tiene cargado el importador multi-web. Reinicia `npm run dev` y vuelve a probar."
        );
      }

      const parsedErrorResponse = errorResponse as {
        error?: string;
      } | null;

      throw new Error(
        (parsedErrorResponse?.error ?? responseText.trim()) ||
          "No se ha podido importar desde la web indicada"
      );
    }

    return response.json() as Promise<MarketplaceImportResult>;
  }

  async importFromCochesNet(
    input: Omit<MarketplaceImportInput, "source">
  ): Promise<MarketplaceImportResult> {
    return this.importFromMarketplace({ ...input, source: "cochesnet" });
  }
}
