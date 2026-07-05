import { useEffect, useMemo, useState } from "react";

import type { Advertisement } from "@/domain/Advertisement";
import type { Model } from "@/domain/Model";
import {
  AdvertisementService,
  type CreateAdvertisementInput,
} from "@/services/AdvertisementService";
import { ModelService } from "@/services/ModelService";
import { enrichAdvertisementsWithOpportunity } from "@/services/OpportunityService";

type AdvertisementFormState = {
  modelId: string;
  title: string;
  price: string;
  year: string;
  km: string;
  fuel: string;
  gearbox: string;
  horsepower: string;
  city: string;
  province: string;
  seller: string;
  source: string;
  url: string;
  notes: string;
};

const defaultFormState: AdvertisementFormState = {
  modelId: "",
  title: "",
  price: "",
  year: "2025",
  km: "",
  fuel: "Gasolina",
  gearbox: "Manual",
  horsepower: "",
  city: "",
  province: "",
  seller: "",
  source: "",
  url: "",
  notes: "",
};

const advertisementService = new AdvertisementService();
const modelService = new ModelService();

export default function MarketPage() {
  const [advertisements, setAdvertisements] = useState<Advertisement[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [form, setForm] = useState<AdvertisementFormState>(defaultFormState);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formMessage, setFormMessage] = useState<string | null>(null);

  const rankedAdvertisements = useMemo(
    () => enrichAdvertisementsWithOpportunity(advertisements, models),
    [advertisements, models]
  );
  const radarDeals = rankedAdvertisements.filter(
    (item) => item.opportunity.isRadarDeal
  );

  useEffect(() => {
    Promise.all([
      advertisementService.getAdvertisements(),
      modelService.getModels(),
    ])
      .then(([advertisementsResponse, modelsResponse]) => {
        setAdvertisements(advertisementsResponse);
        setModels(modelsResponse);

        setForm((currentForm) => ({
          ...currentForm,
          modelId: currentForm.modelId || modelsResponse[0]?.id || "",
        }));
      })
      .catch(() => setError("No se han podido cargar los datos del mercado."))
      .finally(() => setIsLoading(false));
  }, []);

  const updateField =
    (field: keyof AdvertisementFormState) =>
    (
      event:
        | React.ChangeEvent<HTMLInputElement>
        | React.ChangeEvent<HTMLSelectElement>
        | React.ChangeEvent<HTMLTextAreaElement>
    ) => {
      setForm((currentForm) => ({
        ...currentForm,
        [field]: event.target.value,
      }));
    };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setFormMessage(null);

    const advertisement: CreateAdvertisementInput = {
      modelId: form.modelId,
      title: form.title,
      price: Number(form.price),
      year: Number(form.year),
      km: Number(form.km),
      fuel: form.fuel,
      gearbox: form.gearbox,
      horsepower: Number(form.horsepower),
      city: form.city,
      province: form.province,
      seller: form.seller,
      source: form.source,
      url: form.url || "#",
      notes: form.notes,
    };

    try {
      const createdAdvertisement =
        await advertisementService.createAdvertisement(advertisement);

      setAdvertisements((currentAdvertisements) => [
        ...currentAdvertisements,
        createdAdvertisement,
      ]);
      setForm({
        ...defaultFormState,
        modelId: form.modelId,
      });
      setFormMessage("Anuncio guardado.");
    } catch {
      setFormMessage("No se ha podido guardar el anuncio.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <h1>Mercado</h1>

      <p>Anuncios ordenados por Índice de Oportunidad.</p>

      {isLoading && <p>Cargando anuncios...</p>}
      {error && <p>{error}</p>}

      {!isLoading && !error && (
        <>
          <section style={radarStyle}>
            <h2 style={sectionTitleStyle}>Radar de Chollos</h2>

            {radarDeals.length === 0 ? (
              <p>No hay oportunidades claras ahora mismo.</p>
            ) : (
              <div style={radarListStyle}>
                {radarDeals.slice(0, 3).map(({ advertisement, opportunity }) => (
                  <article key={advertisement.id} style={radarItemStyle}>
                    <strong>{advertisement.title}</strong>
                    <span>
                      IO {opportunity.score.toFixed(1)} ·{" "}
                      {opportunity.classification}
                    </span>
                    <span>
                      {advertisement.price.toLocaleString("es-ES")} € ·{" "}
                      {advertisement.km.toLocaleString("es-ES")} km ·{" "}
                      {advertisement.city}
                    </span>
                  </article>
                ))}
              </div>
            )}
          </section>

          <form onSubmit={handleSubmit} style={formStyle}>
            <h2 style={sectionTitleStyle}>Añadir anuncio</h2>

            <label style={fieldStyle}>
              Modelo
              <select
                required
                value={form.modelId}
                onChange={updateField("modelId")}
                style={inputStyle}
              >
                {models.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.brand} {model.model}
                  </option>
                ))}
              </select>
            </label>

            <label style={fieldStyle}>
              Título
              <input
                required
                value={form.title}
                onChange={updateField("title")}
                style={inputStyle}
              />
            </label>

            <label style={fieldStyle}>
              Precio
              <input
                required
                min="0"
                type="number"
                value={form.price}
                onChange={updateField("price")}
                style={inputStyle}
              />
            </label>

            <label style={fieldStyle}>
              Año
              <input
                required
                min="2020"
                max="2026"
                type="number"
                value={form.year}
                onChange={updateField("year")}
                style={inputStyle}
              />
            </label>

            <label style={fieldStyle}>
              Km
              <input
                required
                min="0"
                type="number"
                value={form.km}
                onChange={updateField("km")}
                style={inputStyle}
              />
            </label>

            <label style={fieldStyle}>
              Potencia
              <input
                required
                min="0"
                type="number"
                value={form.horsepower}
                onChange={updateField("horsepower")}
                style={inputStyle}
              />
            </label>

            <label style={fieldStyle}>
              Combustible
              <select
                required
                value={form.fuel}
                onChange={updateField("fuel")}
                style={inputStyle}
              >
                <option>Gasolina</option>
                <option>Híbrido ligero</option>
                <option>Híbrido</option>
                <option>PHEV</option>
              </select>
            </label>

            <label style={fieldStyle}>
              Cambio
              <select
                required
                value={form.gearbox}
                onChange={updateField("gearbox")}
                style={inputStyle}
              >
                <option>Manual</option>
                <option>Automático</option>
              </select>
            </label>

            <label style={fieldStyle}>
              Ciudad
              <input
                required
                value={form.city}
                onChange={updateField("city")}
                style={inputStyle}
              />
            </label>

            <label style={fieldStyle}>
              Provincia
              <input
                required
                value={form.province}
                onChange={updateField("province")}
                style={inputStyle}
              />
            </label>

            <label style={fieldStyle}>
              Vendedor
              <input
                required
                value={form.seller}
                onChange={updateField("seller")}
                style={inputStyle}
              />
            </label>

            <label style={fieldStyle}>
              Web origen
              <input
                required
                value={form.source}
                onChange={updateField("source")}
                style={inputStyle}
                placeholder="coches.net"
              />
            </label>

            <label style={wideFieldStyle}>
              URL
              <input
                value={form.url}
                onChange={updateField("url")}
                style={inputStyle}
                placeholder="https://..."
              />
            </label>

            <label style={wideFieldStyle}>
              Notas
              <textarea
                value={form.notes}
                onChange={updateField("notes")}
                style={{ ...inputStyle, minHeight: "72px", resize: "vertical" }}
              />
            </label>

            <div style={actionsStyle}>
              <button disabled={isSaving || models.length === 0} type="submit">
                {isSaving ? "Guardando..." : "Guardar anuncio"}
              </button>
              {formMessage && <span>{formMessage}</span>}
            </div>
          </form>

          <div style={tableShellStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>IO</th>
                  <th style={thStyle}>Estado</th>
                  <th style={thStyle}>Modelo</th>
                  <th style={thStyle}>Título</th>
                  <th style={thStyle}>Precio</th>
                  <th style={thStyle}>Km</th>
                  <th style={thStyle}>Año</th>
                  <th style={thStyle}>Ciudad</th>
                  <th style={thStyle}>Motivos</th>
                </tr>
              </thead>

              <tbody>
                {rankedAdvertisements.map(
                  ({ advertisement, model, opportunity }) => (
                    <tr key={advertisement.id}>
                      <td style={tdStyle}>
                        <strong>{opportunity.score.toFixed(1)}</strong>
                      </td>
                      <td style={tdStyle}>{opportunity.classification}</td>
                      <td style={tdStyle}>
                        {model
                          ? `${model.brand} ${model.model}`
                          : advertisement.modelId}
                      </td>
                      <td style={tdStyle}>{advertisement.title}</td>
                      <td style={tdStyle}>
                        {advertisement.price.toLocaleString("es-ES")} €
                      </td>
                      <td style={tdStyle}>
                        {advertisement.km.toLocaleString("es-ES")}
                      </td>
                      <td style={tdStyle}>{advertisement.year}</td>
                      <td style={tdStyle}>{advertisement.city}</td>
                      <td style={tdStyle}>
                        {opportunity.reasons.slice(0, 3).join(" · ")}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}

const sectionTitleStyle: React.CSSProperties = {
  gridColumn: "1 / -1",
  fontSize: "1rem",
};

const radarStyle: React.CSSProperties = {
  marginTop: "1rem",
  padding: "16px",
  border: "1px solid #dce4ef",
  borderRadius: "8px",
  background: "#ffffff",
  boxShadow: "0 12px 28px rgb(15 23 42 / 6%)",
};

const radarListStyle: React.CSSProperties = {
  display: "grid",
  gap: "10px",
  marginTop: "10px",
};

const radarItemStyle: React.CSSProperties = {
  display: "grid",
  gap: "4px",
  padding: "10px",
  border: "1px solid #edf2f7",
  borderRadius: "6px",
  background: "#f8fafc",
};

const formStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "12px",
  marginTop: "1rem",
  padding: "16px",
  border: "1px solid #dce4ef",
  borderRadius: "8px",
  background: "#ffffff",
  boxShadow: "0 12px 28px rgb(15 23 42 / 6%)",
};

const fieldStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  fontSize: "0.9rem",
};

const wideFieldStyle: React.CSSProperties = {
  ...fieldStyle,
  gridColumn: "1 / -1",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px",
  border: "1px solid #ccc",
  borderRadius: "6px",
  font: "inherit",
};

const actionsStyle: React.CSSProperties = {
  gridColumn: "1 / -1",
  display: "flex",
  alignItems: "center",
  gap: "12px",
};

const tableShellStyle: React.CSSProperties = {
  marginTop: "1.5rem",
  overflowX: "auto",
  border: "1px solid #dce4ef",
  borderRadius: "8px",
  background: "#ffffff",
  boxShadow: "0 12px 28px rgb(15 23 42 / 6%)",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  minWidth: "980px",
  borderCollapse: "collapse",
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "12px",
  borderBottom: "1px solid #dce4ef",
  color: "#475569",
  background: "#f8fafc",
  fontSize: "0.78rem",
  textTransform: "uppercase",
};

const tdStyle: React.CSSProperties = {
  padding: "12px",
  borderBottom: "1px solid #edf2f7",
  verticalAlign: "top",
};
