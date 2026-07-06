import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  MdArrowDownward,
  MdArrowUpward,
  MdDeleteForever,
  MdEdit,
  MdMoreVert,
  MdUnfoldMore,
} from "react-icons/md";

import type { Advertisement } from "@/domain/Advertisement";
import type { Model } from "@/domain/Model";
import {
  AdvertisementService,
  type CreateAdvertisementInput,
  type MarketplaceImportResult,
} from "@/services/AdvertisementService";
import { ModelService } from "@/services/ModelService";
import { enrichAdvertisementsWithOpportunity } from "@/services/OpportunityService";
import {
  getOpportunityGradient,
  getOpportunityTextColor,
} from "@/utils/opportunityStyle";
import { HiOutlineSparkles } from "react-icons/hi2";

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
  imageUrl: string;
  notes: string;
};

type ImportFormState = {
  source: string;
  modelId: string;
  searchUrl: string;
  maxResults: string;
};

type MarketSortKey = "io" | "price" | "km" | "year" | "trunk";
type SortDirection = "asc" | "desc";

type MarketSortState = {
  key: MarketSortKey;
  direction: SortDirection;
};

const importSources = [
  {
    id: "cochesnet",
    label: "coches.net",
    placeholder: "https://www.coches.net/...",
  },
  {
    id: "autohero",
    label: "Autohero",
    placeholder: "https://www.autohero.com/...",
  },
  {
    id: "ocasionplus",
    label: "OcasionPlus",
    placeholder: "https://www.ocasionplus.com/...",
  },
  {
    id: "flexicar",
    label: "Flexicar",
    placeholder: "https://www.flexicar.es/...",
  },
  {
    id: "automovilessanchez",
    label: "Automoviles Sanchez",
    placeholder: "https://automovilessanchez.es/...",
  },
  {
    id: "carza",
    label: "Carza Ocasion",
    placeholder: "https://carzaocasion.com/...",
  },
  { id: "generic", label: "Otra web", placeholder: "https://..." },
];

const defaultFormState: AdvertisementFormState = {
  modelId: "",
  title: "",
  price: "",
  year: "",
  km: "",
  fuel: "",
  gearbox: "",
  horsepower: "",
  city: "",
  province: "",
  seller: "",
  source: "",
  url: "",
  imageUrl: "",
  notes: "",
};

const defaultImportFormState: ImportFormState = {
  source: "cochesnet",
  modelId: "",
  searchUrl: "",
  maxResults: "10",
};

const mapAdvertisementToForm = (
  advertisement: Advertisement,
): AdvertisementFormState => ({
  modelId: advertisement.modelId,
  title: advertisement.title,
  price: String(advertisement.price),
  year: String(advertisement.year),
  km: String(advertisement.km),
  fuel: advertisement.fuel,
  gearbox: advertisement.gearbox,
  horsepower: String(advertisement.horsepower),
  city: advertisement.city,
  province: advertisement.province,
  seller: advertisement.seller,
  source: advertisement.source,
  url: advertisement.url,
  imageUrl: advertisement.imageUrl ?? "",
  notes: advertisement.notes ?? "",
});

const ecoClassMap: Record<string, string> = {
  "0": "cero",
  ECO: "eco",
  C: "c",
  B: "b",
};

const advertisementService = new AdvertisementService();
const modelService = new ModelService();

export default function MarketPage() {
  const [advertisements, setAdvertisements] = useState<Advertisement[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [form, setForm] = useState<AdvertisementFormState>(defaultFormState);
  const [importForm, setImportForm] = useState<ImportFormState>(
    defaultImportFormState,
  );
  const [editingAdvertisementId, setEditingAdvertisementId] = useState<
    string | null
  >(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [openActionsId, setOpenActionsId] = useState<string | null>(null);
  const [hoveredImageId, setHoveredImageId] = useState<string | null>(null);
  const [sortState, setSortState] = useState<MarketSortState>({
    key: "io",
    direction: "desc",
  });
  const [importResult, setImportResult] =
    useState<MarketplaceImportResult | null>(null);
  const navigate = useNavigate();
  const [, setSearchParams] = useSearchParams();
  const rankedAdvertisements = useMemo(
    () => enrichAdvertisementsWithOpportunity(advertisements, models),
    [advertisements, models],
  );
  const sortedAdvertisements = useMemo(() => {
    const getSortValue = (item: (typeof rankedAdvertisements)[number]) => {
      if (sortState.key === "io") {
        return item.opportunity.score;
      }

      if (sortState.key === "trunk") {
        return item.model?.trunk ?? 0;
      }

      return item.advertisement[sortState.key];
    };

    return [...rankedAdvertisements].sort((firstItem, secondItem) => {
      const firstValue = getSortValue(firstItem);
      const secondValue = getSortValue(secondItem);
      const directionMultiplier = sortState.direction === "asc" ? 1 : -1;

      return (firstValue - secondValue) * directionMultiplier;
    });
  }, [rankedAdvertisements, sortState]);
  const radarDeals = rankedAdvertisements.filter(
    (item) => item.opportunity.isRadarDeal,
  );

  useEffect(() => {
    Promise.all([
      advertisementService.getAdvertisements(),
      modelService.getModels(),
    ])
      .then(([advertisementsResponse, modelsResponse]) => {
        setAdvertisements(advertisementsResponse);
        setModels(modelsResponse);

        const editAdvertisementId = new URLSearchParams(
          window.location.search,
        ).get("edit");
        const advertisementToEdit = advertisementsResponse.find(
          (advertisement) => advertisement.id === editAdvertisementId,
        );

        if (advertisementToEdit) {
          setEditingAdvertisementId(advertisementToEdit.id);
          setForm(mapAdvertisementToForm(advertisementToEdit));
          setFormMessage("Editando anuncio.");
        } else {
          setForm((currentForm) => ({
            ...currentForm,
            modelId: currentForm.modelId || modelsResponse[0]?.id || "",
          }));
        }

        setImportForm((currentForm) => ({
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
        | React.ChangeEvent<HTMLTextAreaElement>,
    ) => {
      setForm((currentForm) => ({
        ...currentForm,
        [field]: event.target.value,
      }));
    };

  const updateImportField =
    (field: keyof ImportFormState) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setImportForm((currentForm) => ({
        ...currentForm,
        [field]: event.target.value,
      }));
    };

  const refreshAdvertisements = async () => {
    const nextAdvertisements = await advertisementService.getAdvertisements();
    setAdvertisements(nextAdvertisements);
  };

  const handleImportSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setIsImporting(true);
    setImportMessage(null);
    setImportResult(null);

    try {
      const result = await advertisementService.importFromMarketplace({
        source: importForm.source,
        modelId: importForm.modelId,
        searchUrl: importForm.searchUrl,
        maxResults: Number(importForm.maxResults),
      });

      await refreshAdvertisements();
      setImportResult(result);
      setImportMessage(
        `${result.imported} nuevos, ${result.updated} actualizados, ${result.skipped} saltados.`,
      );
    } catch (error) {
      setImportMessage(
        error instanceof Error
          ? error.message
          : "No se ha podido importar desde la web indicada.",
      );
    } finally {
      setIsImporting(false);
    }
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
      imageUrl: form.imageUrl,
      notes: form.notes,
    };

    try {
      const savedAdvertisement = editingAdvertisementId
        ? await advertisementService.updateAdvertisement(
            editingAdvertisementId,
            advertisement,
          )
        : await advertisementService.createAdvertisement(advertisement);

      setAdvertisements((currentAdvertisements) =>
        editingAdvertisementId
          ? currentAdvertisements.map((currentAdvertisement) =>
              currentAdvertisement.id === editingAdvertisementId
                ? savedAdvertisement
                : currentAdvertisement,
            )
          : [...currentAdvertisements, savedAdvertisement],
      );
      setForm({
        ...defaultFormState,
        modelId: form.modelId,
      });
      setEditingAdvertisementId(null);
      clearEditSearchParam();
      setFormMessage(
        editingAdvertisementId ? "Anuncio actualizado." : "Anuncio guardado.",
      );
    } catch {
      setFormMessage(
        editingAdvertisementId
          ? "No se ha podido actualizar el anuncio."
          : "No se ha podido guardar el anuncio.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditAdvertisement = (advertisement: Advertisement) => {
    setEditingAdvertisementId(advertisement.id);
    setForm(mapAdvertisementToForm(advertisement));
    setFormMessage("Editando anuncio.");
    setSearchParams((currentSearchParams) => {
      const nextSearchParams = new URLSearchParams(currentSearchParams);
      nextSearchParams.set("edit", advertisement.id);
      return nextSearchParams;
    });
  };

  const handleOpenAdvertisement = (id: string) => {
    navigate(`/market/${id}`);
  };

  const cancelEdit = () => {
    setEditingAdvertisementId(null);
    setForm({
      ...defaultFormState,
      modelId: models[0]?.id ?? "",
    });
    setFormMessage(null);
    clearEditSearchParam();
  };

  const clearEditSearchParam = () => {
    setSearchParams((currentSearchParams) => {
      const nextSearchParams = new URLSearchParams(currentSearchParams);
      nextSearchParams.delete("edit");
      return nextSearchParams;
    });
  };

  const handleDeleteAdvertisement = async (id: string) => {
    setFormMessage(null);

    try {
      await advertisementService.deleteAdvertisement(id);
      setAdvertisements((currentAdvertisements) =>
        currentAdvertisements.filter(
          (advertisement) => advertisement.id !== id,
        ),
      );
      if (editingAdvertisementId === id) {
        cancelEdit();
      }
      setFormMessage("Anuncio borrado.");
    } catch {
      setFormMessage("No se ha podido borrar el anuncio.");
    }
  };

  const handleSort = (key: MarketSortKey) => {
    setSortState((currentSortState) => ({
      key,
      direction:
        currentSortState.key === key && currentSortState.direction === "desc"
          ? "asc"
          : "desc",
    }));
  };

  return (
    <>
      <h1>Mercado</h1>

      <p>Anuncios ordenados por Índice de Oportunidad.</p>

      {isLoading && <p>Cargando anuncios...</p>}
      {error && <p>{error}</p>}

      {!isLoading && !error && (
        <>
          <form onSubmit={handleImportSubmit} style={importPanelStyle}>
            <h2 style={sectionTitleStyle}>
              <div
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <span>Importar desde web</span>
                <HiOutlineSparkles
                  style={{ fontSize: "1.5rem", color: "var(--color-primary)" }}
                />
              </div>
            </h2>
            <label style={fieldStyle}>
              Web
              <select
                required
                value={importForm.source}
                onChange={updateImportField("source")}
                style={inputStyle}
              >
                {importSources.map((source) => (
                  <option key={source.id} value={source.id}>
                    {source.label}
                  </option>
                ))}
              </select>
            </label>

            <label
              style={{
                ...fieldStyle,
                gridColumn: "2 / -1",
              }}
            >
              Modelo
              <select
                required
                value={importForm.modelId}
                onChange={updateImportField("modelId")}
                style={inputStyle}
              >
                {models.map((model) => (
                  <option key={model.id} value={model.id}>
                    {formatModelOptionLabel(model)}
                  </option>
                ))}
              </select>
            </label>

            <label style={wideFieldStyle}>
              URL filtrada
              <input
                required
                type="url"
                value={importForm.searchUrl}
                onChange={updateImportField("searchUrl")}
                style={inputStyle}
                placeholder={
                  importSources.find(
                    (source) => source.id === importForm.source,
                  )?.placeholder ?? "https://..."
                }
              />
            </label>

            <label style={fieldStyle}>
              Limite
              <input
                required
                min="1"
                max="25"
                type="number"
                value={importForm.maxResults}
                onChange={updateImportField("maxResults")}
                style={inputStyle}
              />
            </label>

            <div style={actionsStyle}>
              <button
                disabled={isImporting || models.length === 0}
                type="submit"
              >
                {isImporting ? "Importando..." : "Importar anuncios"}
              </button>
              {importMessage && (
                <span className="info-text">{importMessage}</span>
              )}
            </div>

            {importResult && (
              <div style={importSummaryStyle}>
                {importResult.errors.map((importError) => (
                  <p key={importError} className="info-text">
                    {importError}
                  </p>
                ))}
                {importResult.results.slice(0, 6).map((result) => (
                  <p key={`${result.status}-${result.url}`}>
                    <strong>{result.status}</strong>{" "}
                    {result.title ?? result.url}
                    {result.reason ? ` - ${result.reason}` : ""}
                  </p>
                ))}
              </div>
            )}
          </form>

          <form onSubmit={handleSubmit} style={formStyle}>
            <h2 style={sectionTitleStyle}>
              {editingAdvertisementId ? "Editar anuncio" : "Añadir anuncio"}
            </h2>

            <label
              style={{
                ...fieldStyle,
                gridColumn: "1 / -1",
              }}
            >
              Modelo
              <select
                required
                value={form.modelId}
                onChange={updateField("modelId")}
                style={inputStyle}
              >
                {models.map((model) => (
                  <option key={model.id} value={model.id}>
                    {formatModelOptionLabel(model)}
                  </option>
                ))}
              </select>
            </label>

            <label
              style={{
                ...fieldStyle,
                gridColumn: "1 / 4",
              }}
            >
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
              URL imagen
              <input
                value={form.imageUrl}
                onChange={updateField("imageUrl")}
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
                {isSaving
                  ? "Guardando..."
                  : editingAdvertisementId
                    ? "Guardar cambios"
                    : "Guardar anuncio"}
              </button>
              {editingAdvertisementId && (
                <button
                  onClick={cancelEdit}
                  style={secondaryButtonStyle}
                  type="button"
                >
                  Cancelar
                </button>
              )}
              {formMessage && <span className="info-text">{formMessage}</span>}
            </div>
          </form>

          <section style={radarStyle}>
            <h2 style={sectionTitleStyle}>Radar de Chollos</h2>

            {radarDeals.length === 0 ? (
              <p>No hay oportunidades claras ahora mismo.</p>
            ) : (
              <div style={radarListStyle}>
                {radarDeals
                  .slice(0, 3)
                  .map(({ advertisement, opportunity }) => (
                    <article
                      key={advertisement.id}
                      style={radarItemStyle}
                      onClick={() => handleOpenAdvertisement(advertisement.id)}
                    >
                      <strong>{advertisement.title}</strong>
                      <span>
                        <OpportunityBadge score={opportunity.score} />{" "}
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

          <div style={tableShellStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <SortableHeader
                    label="IO"
                    sortKey="io"
                    sortState={sortState}
                    onSort={handleSort}
                  />
                  <th style={thStyle}>Modelo</th>
                  <th style={thStyle}>Foto</th>
                  <SortableHeader
                    label="Maletero"
                    sortKey="trunk"
                    sortState={sortState}
                    onSort={handleSort}
                  />
                  <th style={thStyle}>DGT</th>
                  <th style={thStyle}>Consumo</th>
                  <SortableHeader
                    label="Precio"
                    sortKey="price"
                    sortState={sortState}
                    onSort={handleSort}
                  />
                  <th style={thStyle}>Motor</th>
                  <th style={thStyle}>CV</th>
                  <SortableHeader
                    label="Km"
                    sortKey="km"
                    sortState={sortState}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Año"
                    sortKey="year"
                    sortState={sortState}
                    onSort={handleSort}
                  />
                  <th style={thStyle}>Motivos</th>
                  <th style={thStyle}>
                    <span style={{ display: "none" }}>Acciones</span>
                  </th>
                </tr>
              </thead>

              <tbody>
                {sortedAdvertisements.map(
                  ({ advertisement, model, opportunity }) => (
                    <tr
                      key={advertisement.id}
                      onClick={() => handleOpenAdvertisement(advertisement.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          handleOpenAdvertisement(advertisement.id);
                        }
                      }}
                      style={clickableRowStyle}
                      tabIndex={0}
                    >
                      <td style={tdStyle}>
                        <OpportunityBadge score={opportunity.score} />
                      </td>
                      <td style={tdStyle}>
                        <span style={{ fontWeight: "bold" }}>
                          {model?.model}
                        </span>{" "}
                        {model?.generation}
                      </td>
                      <td style={tdStyle}>
                        {advertisement.imageUrl ? (
                          <span
                            onMouseEnter={() =>
                              setHoveredImageId(advertisement.id)
                            }
                            onMouseLeave={() => setHoveredImageId(null)}
                            style={listingImageWrapperStyle}
                          >
                            <img
                              alt={advertisement.title}
                              src={advertisement.imageUrl}
                              style={listingImageStyle}
                            />
                            {hoveredImageId === advertisement.id && (
                              <img
                                alt=""
                                aria-hidden="true"
                                src={advertisement.imageUrl}
                                style={listingImagePreviewStyle}
                              />
                            )}
                          </span>
                        ) : (
                          "Sin foto"
                        )}
                      </td>
                      <td style={tdStyle}>
                        {model?.trunk ? `${model.trunk} L` : "Pendiente"}
                      </td>
                      <td style={tdStyle}>
                        <div
                          className={`eco-badge ${
                            model ? ecoClassMap[model.ecoLabel] : ""
                          }`}
                        >
                          {model?.ecoLabel ?? "Pendiente"}
                        </div>
                      </td>
                      <td style={tdStyle}>
                        {model?.consumption
                          ? `${model.consumption.toFixed(1)}`
                          : "Pendiente"}
                      </td>
                      <td style={tdStyle}>
                        {advertisement.price.toLocaleString("es-ES")} €
                      </td>
                      <td style={tdStyle}>
                        {formatEngineType(advertisement.fuel)}
                      </td>
                      <td style={tdStyle}>
                        {advertisement.horsepower
                          ? `${advertisement.horsepower} CV`
                          : "Pendiente"}
                      </td>
                      <td style={tdStyle}>
                        {advertisement.km.toLocaleString("es-ES")}
                      </td>
                      <td style={tdStyle}>{advertisement.year}</td>
                      <td style={tdStyle}>
                        {formatListingReasons(
                          advertisement,
                          model,
                          opportunity.reasons,
                        )}
                      </td>
                      <td style={tdStyle}>
                        <div
                          onClick={(event) => event.stopPropagation()}
                          onKeyDown={(event) => event.stopPropagation()}
                          style={rowActionsStyle}
                        >
                          <button
                            aria-expanded={openActionsId === advertisement.id}
                            aria-label="Abrir acciones"
                            onClick={() =>
                              setOpenActionsId((currentOpenActionsId) =>
                                currentOpenActionsId === advertisement.id
                                  ? null
                                  : advertisement.id,
                              )
                            }
                            style={actionsMenuButtonStyle}
                            type="button"
                          >
                            <MdMoreVert />
                          </button>
                          {openActionsId === advertisement.id && (
                            <div style={actionsMenuStyle}>
                              <button
                                onClick={() => {
                                  setOpenActionsId(null);
                                  handleEditAdvertisement(advertisement);
                                }}
                                style={actionsMenuItemStyle}
                                type="button"
                              >
                                <MdEdit />
                                Editar
                              </button>
                              <button
                                onClick={() => {
                                  setOpenActionsId(null);
                                  handleDeleteAdvertisement(advertisement.id);
                                }}
                                style={actionsMenuDangerItemStyle}
                                type="button"
                              >
                                <MdDeleteForever />
                                Borrar
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}

function OpportunityBadge({ score }: { score: number }) {
  const displayScore = score === 10 ? "10" : score.toFixed(1);

  return (
    <span
      style={{
        ...opportunityBadgeStyle,
        background: getOpportunityGradient(score),
        color: getOpportunityTextColor(score),
      }}
    >
      {displayScore}
    </span>
  );
}
function formatModelOptionLabel(model: Model) {
  const details = [
    model.generation,
    model.trunk > 0 ? `${model.trunk} L` : "",
    model.consumption > 0 ? `${model.consumption.toFixed(1)} l/100` : "",
    model.ecoLabel ? `Etiqueta ${model.ecoLabel}` : "",
  ].filter(Boolean);

  return `${model.brand} ${model.model}${details.length ? ` - ${details.join(" · ")}` : ""}`;
}

function formatEngineType(fuel: string) {
  const normalizedFuel = fuel
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (/phev|enchufable/.test(normalizedFuel)) {
    return "Híbrido enchufable (PHEV)";
  }

  if (/hibrido/.test(normalizedFuel)) {
    return "Híbrido (HEV)";
  }

  if (/gasolina/.test(normalizedFuel)) {
    return "Gasolina";
  }

  return fuel || "Pendiente";
}

function formatListingReasons(
  advertisement: Advertisement,
  model: Model | undefined,
  opportunityReasons: string[],
) {
  const criteriaFailureReasons = getSearchCriteriaFailureReasons(
    advertisement,
    model,
  );
  const displayedReasons = [
    ...criteriaFailureReasons,
    ...opportunityReasons.filter(
      (reason) => !criteriaFailureReasons.includes(reason),
    ),
  ];
  const maxReasons = Math.max(criteriaFailureReasons.length, 3);
  const visibleReasons = displayedReasons.slice(0, maxReasons);

  if (visibleReasons.length === 0) {
    return "Sin motivos";
  }

  return (
    <span>
      {visibleReasons.map((reason, index) => (
        <span key={reason}>
          <span
            style={
              reason.startsWith("Incumple")
                ? criteriaFailureReasonStyle
                : undefined
            }
          >
            {reason}
          </span>
          {index < visibleReasons.length - 1 ? " | " : ""}
        </span>
      ))}
    </span>
  );
}

function getSearchCriteriaFailureReasons(
  advertisement: Advertisement,
  model?: Model,
) {
  const normalizedText = [
    advertisement.title,
    advertisement.fuel,
    advertisement.notes ?? "",
    advertisement.city,
    advertisement.province,
  ]
    .join(" ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const reasons: string[] = [];

  if (advertisement.price > 30000) {
    reasons.push("Incumple: precio > 30.000");
  }

  if (advertisement.km > 50000) {
    reasons.push("Incumple: km > 50.000");
  }

  if (advertisement.year < 2024) {
    reasons.push("Incumple: año < 2024");
  }

  if (advertisement.horsepower < 140) {
    reasons.push("Incumple: menos de 140 CV");
  }

  if (/puretech|diesel|electrico/.test(normalizedText)) {
    reasons.push("Incumple: motor descartado");
  }

  if (model && model.trunk > 0 && model.trunk < 520) {
    reasons.push("Incumple: maletero < 520 L");
  }

  if (model && model.consumption > 7.2) {
    reasons.push("Incumple: consumo > 7.2");
  }

  if (!/zaragoza|reus|tarragona/.test(normalizedText)) {
    reasons.push("Incumple: zona no prioritaria");
  }

  return reasons;
}

function SortableHeader({
  label,
  sortKey,
  sortState,
  onSort,
}: {
  label: string;
  sortKey: MarketSortKey;
  sortState: MarketSortState;
  onSort: (key: MarketSortKey) => void;
}) {
  const isActive = sortState.key === sortKey;
  const SortIcon = isActive
    ? sortState.direction === "asc"
      ? MdArrowUpward
      : MdArrowDownward
    : MdUnfoldMore;

  return (
    <th style={thStyle}>
      <button
        aria-label={`Ordenar por ${label}`}
        onClick={() => onSort(sortKey)}
        style={sortableHeaderButtonStyle}
        type="button"
      >
        <span>{label}</span>
        <SortIcon aria-hidden="true" style={sortableHeaderIconStyle} />
      </button>
    </th>
  );
}

const opportunityBadgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "999px",
  padding: "5px 9px",
  fontSize: "0.82rem",
  fontWeight: 800,
  boxShadow: "0 8px 18px rgb(15 23 42 / 14%)",
};

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
  gap: "6px",
  padding: "10px",
  border: "1px solid #edf2f7",
  borderRadius: "6px",
  background: "#f8fafc",
  cursor: "pointer",
};

const importPanelStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(200px, 100%), 1fr))",
  gap: "12px",
  marginTop: "1rem",
  padding: "16px",
  border: "1px solid #bfdbfe",
  borderRadius: "8px",
  background: "linear-gradient(135deg, #eff6ff 0%, #ffffff 55%, #ecfdf5 100%)",
  boxShadow: "0 12px 28px rgb(15 23 42 / 6%)",
};

const importSummaryStyle: React.CSSProperties = {
  gridColumn: "1 / -1",
  display: "grid",
  gap: "6px",
  padding: "10px",
  border: "1px solid #dbeafe",
  borderRadius: "6px",
  background: "rgb(255 255 255 / 70%)",
  fontSize: "0.86rem",
};

const formStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(180px, 100%), 1fr))",
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
  flexWrap: "wrap",
  gap: "12px",
};

const secondaryButtonStyle: React.CSSProperties = {
  background: "#64748b",
};

const tableShellStyle: React.CSSProperties = {
  marginTop: "1.5rem",
  overflowX: "auto",
  WebkitOverflowScrolling: "touch",
  border: "1px solid #dce4ef",
  borderRadius: "8px",
  background: "#ffffff",
  boxShadow: "0 12px 28px rgb(15 23 42 / 6%)",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  minWidth: "1320px",
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

const sortableHeaderButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  padding: 0,
  minHeight: "auto",
  width: "auto",
  border: 0,
  background: "transparent",
  color: "inherit",
  cursor: "pointer",
  font: "inherit",
  fontWeight: 800,
  textTransform: "uppercase",
};

const sortableHeaderIconStyle: React.CSSProperties = {
  flex: "0 0 auto",
  fontSize: "1rem",
};

const tdStyle: React.CSSProperties = {
  padding: "12px",
  borderBottom: "1px solid #edf2f7",
  // verticalAlign: "top",
};

const clickableRowStyle: React.CSSProperties = {
  cursor: "pointer",
};

const criteriaFailureReasonStyle: React.CSSProperties = {
  color: "#dc2626",
};

const listingImageWrapperStyle: React.CSSProperties = {
  position: "relative",
  display: "inline-block",
};

const listingImageStyle: React.CSSProperties = {
  width: "88px",
  height: "58px",
  objectFit: "cover",
  borderRadius: "6px",
  border: "1px solid #e2e8f0",
  background: "#f8fafc",
  display: "block",
};

const listingImagePreviewStyle: React.CSSProperties = {
  position: "absolute",
  left: "102px",
  top: "-38px",
  width: "320px",
  maxWidth: "min(320px, 70vw)",
  height: "210px",
  objectFit: "cover",
  borderRadius: "8px",
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  boxShadow: "0 18px 38px rgb(15 23 42 / 22%)",
  pointerEvents: "none",
  zIndex: 20,
};

const rowActionsStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "center",
  position: "relative",
};

const actionsMenuButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "32px",
  minHeight: "32px",
  padding: 0,
  border: "1px solid #dce4ef",
  borderRadius: "7px",
  background: "#ffffff",
  color: "#475569",
  cursor: "pointer",
  fontSize: "1.2rem",
};

const actionsMenuStyle: React.CSSProperties = {
  position: "absolute",
  top: "36px",
  right: 0,
  zIndex: 30,
  display: "grid",
  minWidth: "128px",
  padding: "6px",
  border: "1px solid #dce4ef",
  borderRadius: "8px",
  background: "#ffffff",
  boxShadow: "0 14px 30px rgb(15 23 42 / 16%)",
};

const actionsMenuItemStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-start",
  gap: "8px",
  width: "100%",
  minHeight: "auto",
  padding: "8px",
  border: 0,
  borderRadius: "6px",
  background: "transparent",
  color: "#18212f",
  cursor: "pointer",
  font: "inherit",
  fontWeight: 700,
};

const actionsMenuDangerItemStyle: React.CSSProperties = {
  ...actionsMenuItemStyle,
  color: "#dc2626",
};
