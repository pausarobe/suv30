import { useEffect, useState } from "react";

import ModelTable from "@/components/ModelTable/ModelTable";
import type { Model } from "@/domain/Model";
import { ModelService, type CreateModelInput } from "@/services/ModelService";
import { HiOutlineSparkles } from "react-icons/hi2";

type ModelFormState = {
  brand: string;
  model: string;
  generation: string;
  length: string;
  width: string;
  height: string;
  trunk: string;
  consumption: string;
  ecoLabel: Model["ecoLabel"];
};

const knownBrands = [
  "Hyundai",
  "Kia",
  "Mazda",
  "Nissan",
  "Ford",
  "Skoda",
  "Renault",
  "Toyota",
  "Volkswagen",
  "Seat",
  "Cupra",
  "Peugeot",
  "Citroen",
  "Citroën",
  "Opel",
  "MG",
];

const knownModelHints = [
  {
    brand: "Skoda",
    model: "Kamiq",
    length: "4241",
    width: "1793",
    height: "1553",
    platform: "PQ25",
  },
];

const defaultFormState: ModelFormState = {
  brand: "",
  model: "",
  generation: "",
  length: "",
  width: "",
  height: "",
  trunk: "",
  consumption: "",
  ecoLabel: "C",
};

const modelService = new ModelService();

export default function ModelsPage() {
  const [models, setModels] = useState<Model[]>([]);
  const [form, setForm] = useState<ModelFormState>(defaultFormState);
  const [sourceText, setSourceText] = useState("");
  const [comparisonModelIds, setComparisonModelIds] = useState<string[]>([]);
  const [editingModelId, setEditingModelId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formMessage, setFormMessage] = useState<string | null>(null);

  useEffect(() => {
    modelService
      .getModels()
      .then(setModels)
      .catch(() => setError("No se han podido cargar los modelos."))
      .finally(() => setIsLoading(false));
  }, []);

  const updateField =
    (field: keyof ModelFormState) =>
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

  const handleParseSourceText = () => {
    const parsedForm = parseModelText(sourceText, form);

    setForm(parsedForm);
    setFormMessage("Ficha leída. Revisa los campos antes de guardar.");
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setFormMessage(null);

    const model: CreateModelInput = {
      brand: form.brand,
      model: form.model,
      generation: form.generation,
      length: Number(form.length),
      width: Number(form.width),
      height: Number(form.height),
      trunk: Number(form.trunk),
      consumption: Number(form.consumption),
      ecoLabel: form.ecoLabel,
    };

    try {
      const savedModel = editingModelId
        ? await modelService.updateModel(editingModelId, model)
        : await modelService.createModel(model);

      setModels((currentModels) => {
        const nextModels = editingModelId
          ? currentModels.map((currentModel) =>
              currentModel.id === editingModelId ? savedModel : currentModel,
            )
          : [...currentModels, savedModel];

        return nextModels.sort((a, b) =>
          `${a.brand} ${a.model}`.localeCompare(`${b.brand} ${b.model}`),
        );
      });
      setForm(defaultFormState);
      setEditingModelId(null);
      setFormMessage(
        editingModelId ? "Modelo actualizado." : "Modelo guardado.",
      );
    } catch {
      setFormMessage(
        editingModelId
          ? "No se ha podido actualizar el modelo."
          : "No se ha podido guardar el modelo.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditModel = (model: Model) => {
    setEditingModelId(model.id);
    setForm({
      brand: model.brand,
      model: model.model,
      generation: model.generation,
      length: String(model.length),
      width: String(model.width),
      height: String(model.height),
      trunk: String(model.trunk),
      consumption: String(model.consumption),
      ecoLabel: model.ecoLabel,
    });
    setFormMessage("Editando modelo.");
  };

  const cancelEdit = () => {
    setEditingModelId(null);
    setForm(defaultFormState);
    setFormMessage(null);
  };

  const handleDeleteModel = async (id: string) => {
    setFormMessage(null);

    try {
      await modelService.deleteModel(id);
      setModels((currentModels) =>
        currentModels.filter((model) => model.id !== id),
      );
      setComparisonModelIds((currentIds) =>
        currentIds.filter((modelId) => modelId !== id),
      );
      if (editingModelId === id) {
        cancelEdit();
      }
      setFormMessage("Modelo borrado.");
    } catch {
      setFormMessage(
        "No se ha podido borrar el modelo. Revisa si tiene anuncios asociados.",
      );
    }
  };

  const handleToggleComparisonModel = (id: string) => {
    setComparisonModelIds((currentIds) => {
      if (currentIds.includes(id)) {
        return currentIds.filter((currentId) => currentId !== id);
      }

      return currentIds.length >= 3 ? currentIds : [...currentIds, id];
    });
  };

  const comparisonModels = comparisonModelIds
    .map((id) => models.find((model) => model.id === id))
    .filter((model): model is Model => Boolean(model));

  return (
    <>
      <h1>Modelos</h1>

      {isLoading && <p>Cargando modelos...</p>}
      {error && <p>{error}</p>}

      {!isLoading && !error && (
        <>
          <section style={parserPanelStyle}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <h2 style={sectionTitleStyle}>Rellenar desde texto</h2>
              <HiOutlineSparkles style={{ fontSize: "1.5rem", color: "var(--color-primary)" }}/>
            </div>

            <label style={wideFieldStyle}>
              Texto de ficha técnica
              <textarea
                value={sourceText}
                onChange={(event) => setSourceText(event.target.value)}
                style={{
                  ...inputStyle,
                  minHeight: "130px",
                  resize: "vertical",
                }}
                placeholder="Pega aquí una ficha técnica, descripción de anuncio o texto largo del modelo..."
              />
            </label>

            <div style={actionsStyle}>
              <button
                disabled={sourceText.trim().length === 0}
                onClick={handleParseSourceText}
                type="button"
              >
                Extraer datos
              </button>
              <span className="info-text">
                Rellena marca, modelo, medidas, maletero, consumo, etiqueta y
                generación cuando los detecta.
              </span>
            </div>
          </section>

          <form onSubmit={handleSubmit} style={formStyle}>
            <h2 style={sectionTitleStyle}>
              {editingModelId ? "Editar modelo" : "Añadir modelo"}
            </h2>

            <label style={fieldStyle}>
              Marca
              <input
                required
                value={form.brand}
                onChange={updateField("brand")}
                style={inputStyle}
              />
            </label>

            <label style={fieldStyle}>
              Modelo
              <input
                required
                value={form.model}
                onChange={updateField("model")}
                style={inputStyle}
              />
            </label>

            <label style={{
              ...fieldStyle,
              gridColumn: "span 2",
            }}>
              Generación
              <input
                required
                value={form.generation}
                onChange={updateField("generation")}
                style={inputStyle}
              />
            </label>

            <label style={fieldStyle}>
              Etiqueta ecológica
              <select
                required
                value={form.ecoLabel}
                onChange={updateField("ecoLabel")}
                style={inputStyle}
              >
                <option value="0">0</option>
                <option value="ECO">ECO</option>
                <option value="C">C</option>
                <option value="B">B</option>
              </select>
            </label>

            <label style={fieldStyle}>
              Largo
              <input
                required
                min="0"
                type="number"
                value={form.length}
                onChange={updateField("length")}
                style={inputStyle}
                placeholder="mm"
              />
            </label>

            <label style={fieldStyle}>
              Ancho
              <input
                required
                min="0"
                type="number"
                value={form.width}
                onChange={updateField("width")}
                style={inputStyle}
                placeholder="mm"
              />
            </label>

            <label style={fieldStyle}>
              Alto
              <input
                required
                min="0"
                type="number"
                value={form.height}
                onChange={updateField("height")}
                style={inputStyle}
                placeholder="mm"
              />
            </label>

            <label style={fieldStyle}>
              Maletero
              <input
                required
                min="0"
                type="number"
                value={form.trunk}
                onChange={updateField("trunk")}
                style={inputStyle}
                placeholder="litros"
              />
            </label>

            <label style={fieldStyle}>
              Consumo
              <input
                required
                min="0"
                step="0.1"
                type="number"
                value={form.consumption}
                onChange={updateField("consumption")}
                style={inputStyle}
                placeholder="l/100 km"
              />
            </label>

            <div style={actionsStyle}>
              <button disabled={isSaving} type="submit">
                {isSaving
                  ? "Guardando..."
                  : editingModelId
                    ? "Guardar cambios"
                    : "Guardar modelo"}
              </button>
              {editingModelId && (
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

          <ModelTable
            models={models}
            comparisonModelIds={comparisonModelIds}
            onToggleComparisonModel={handleToggleComparisonModel}
            onEditModel={handleEditModel}
            onDeleteModel={handleDeleteModel}
          />

          <section style={comparisonPanelStyle}>
            <div style={comparisonHeaderStyle}>
              <h2 style={sectionTitleStyle}>Comparador</h2>
              <span className="info-text">
                {comparisonModels.length}/3 modelos seleccionados
              </span>
            </div>

            {comparisonModels.length < 2 ? (
              <p className="info-text">
                Selecciona 2 o 3 modelos en la tabla para compararlos.
              </p>
            ) : (
              <div style={comparisonGridStyle}>
                {comparisonModels.map((model) => (
                  <article key={model.id} style={comparisonCardStyle}>
                    <h3 style={comparisonTitleStyle}>
                      {model.brand} {model.model}
                    </h3>
                    <p className="info-text">{model.generation}</p>

                    <ComparisonDetail label="Etiqueta" value={model.ecoLabel} />
                    <ComparisonDetail
                      label="Maletero"
                      value={`${model.trunk} L`}
                    />
                    <ComparisonDetail
                      label="Consumo"
                      value={`${model.consumption.toFixed(1)} l/100 km`}
                    />
                    <ComparisonDetail
                      label="Largo"
                      value={`${model.length} mm`}
                    />
                    <ComparisonDetail
                      label="Ancho"
                      value={`${model.width} mm`}
                    />
                    <ComparisonDetail label="Alto" value={`${model.height} mm`} />
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </>
  );
}

function ComparisonDetail({ label, value }: { label: string; value: string }) {
  return (
    <div style={comparisonDetailStyle}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function parseModelText(
  text: string,
  currentForm: ModelFormState,
): ModelFormState {
  const normalizedText = normalizeText(text);
  const titleLine = getTitleLine(text);
  const dimensions = parseDimensions(normalizedText);
  const modelHint = parseKnownModelHint(normalizedText, dimensions);
  const brand =
    parseBrand(normalizedText) || modelHint?.brand || currentForm.brand;
  const model = brand
    ? parseModelName(titleLine || normalizedText, brand) ||
      modelHint?.model ||
      currentForm.model
    : currentForm.model;
  const parsedGeneration = parseGeneration(titleLine, brand, model);

  return {
    ...currentForm,
    brand,
    model,
    generation:
      parsedGeneration ||
      parseMotorGeneration(normalizedText) ||
      currentForm.generation ||
      "A revisar",
    length: dimensions.length || currentForm.length,
    width: dimensions.width || currentForm.width,
    height: dimensions.height || currentForm.height,
    trunk: parseTrunk(normalizedText) || currentForm.trunk,
    consumption: parseConsumption(normalizedText) || currentForm.consumption,
    ecoLabel: parseEcoLabel(normalizedText) || currentForm.ecoLabel,
  };
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function getTitleLine(text: string) {
  return (
    text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find(
        (line) =>
          line.length > 8 && !/^(inicio|volver|datos|ficha)/i.test(line),
      ) ?? ""
  );
}

function parseBrand(text: string) {
  return (
    knownBrands.find((brand) =>
      new RegExp(`\\b${escapeRegex(brand)}\\b`, "i").test(text),
    ) ?? ""
  );
}

function parseModelName(text: string, brand: string) {
  const afterBrand = text.match(
    new RegExp(`${escapeRegex(brand)}\\s+([\\w\\-]+)`, "i"),
  );
  return cleanModelName(afterBrand?.[1] ?? "");
}

function parseGeneration(title: string, brand: string, model: string) {
  if (!title || !brand || !model) {
    return "";
  }

  return title
    .replace(new RegExp(`\\b${escapeRegex(brand)}\\b`, "i"), "")
    .replace(new RegExp(`\\b${escapeRegex(model)}\\b`, "i"), "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseKnownModelHint(
  text: string,
  dimensions: { length: string; width: string; height: string },
) {
  return knownModelHints.find((hint) => {
    const platformMatches = new RegExp(
      `\\b${escapeRegex(hint.platform)}\\b`,
      "i",
    ).test(text);
    const dimensionsMatch =
      dimensions.length === hint.length &&
      dimensions.width === hint.width &&
      dimensions.height === hint.height;

    return platformMatches || dimensionsMatch;
  });
}

function parseMotorGeneration(text: string) {
  const displacement = text.match(/Motor de\s+(\d,[0-9])\s+litros/i)?.[1];
  const horsepower = text.match(/Potencia de\s+(\d{2,3})\s*CV/i)?.[1];
  const fuel = parseFuelName(text);
  const gearbox = text.match(
    /Transmisi[oó]n de tipo\s+(manual|autom[aá]tico)/i,
  )?.[1];
  const parts = [
    displacement
      ? `${displacement.replace(",", ".")} ${fuel === "Diesel" ? "TDI" : "TSI"}`
      : "",
    horsepower ? `${horsepower} CV` : "",
    gearbox ? capitalize(gearbox) : "",
  ].filter(Boolean);

  return parts.join(" ");
}

function parseDimensions(text: string) {
  const explicitDimensions = text.match(
    /(\d{4})\s*(?:mm)?\s*(?:x|×)\s*(\d{4})\s*(?:mm)?\s*(?:x|×)\s*(\d{4})\s*(?:mm)?/i,
  );

  if (explicitDimensions) {
    return {
      length: explicitDimensions[1],
      width: explicitDimensions[2],
      height: explicitDimensions[3],
    };
  }

  const exteriorDimensions = text.match(
    /Dimensiones exteriores:.*?(\d{1,2}[.\s]\d{3})\s*mm de largo.*?(\d{1,2}[.\s]\d{3})\s*mm de ancho.*?(\d{1,2}[.\s]\d{3})\s*mm de alto/i,
  );

  if (exteriorDimensions) {
    return {
      length: normalizeInteger(exteriorDimensions[1]),
      width: normalizeInteger(exteriorDimensions[2]),
      height: normalizeInteger(exteriorDimensions[3]),
    };
  }

  const length =
    findNumberBeforeLabel(text, ["largo", "longitud"]) ||
    findNumberAfterLabel(text, ["largo", "longitud"]);
  const width =
    findNumberBeforeLabel(text, ["ancho", "anchura"]) ||
    findNumberAfterLabel(text, ["ancho", "anchura"]);
  const height =
    findNumberBeforeLabel(text, ["alto", "altura"]) ||
    findNumberAfterLabel(text, ["alto", "altura"]);

  return { length, width, height };
}

function parseTrunk(text: string) {
  return (
    findNumberAfterLabel(text, [
      "maletero",
      "compartimento de carga",
      "capacidad",
    ]) || ""
  );
}

function parseConsumption(text: string) {
  const mixedConsumption = text.match(
    /(\d{1,2}(?:[,.]\d)?)\s*l\/100\s*km\s*\((?:mixto|combinado)\)/i,
  );
  const labeledConsumption = text.match(
    /(?:consumo|mixto|combinado)[^\d]{0,30}(\d{1,2}(?:[,.]\d)?)\s*l\/100\s*km/i,
  );
  const consumption = mixedConsumption?.[1] ?? labeledConsumption?.[1] ?? "";

  return consumption.replace(",", ".");
}

function parseEcoLabel(text: string): Model["ecoLabel"] | "" {
  const label = text.match(
    /(?:etiqueta|distintivo)[^\w]{0,20}(?:ecol[oó]gica|medioambiental)?[^\w]{0,20}(0|ECO|C|B)\b/i,
  )?.[1];

  if (label) {
    return label.toUpperCase() as Model["ecoLabel"];
  }

  if (/EU6|Euro\s*6|EU6d|EU6\.2/i.test(text)) {
    return "C";
  }

  return "";
}

function findNumberAfterLabel(text: string, labels: string[]) {
  for (const label of labels) {
    const match = text.match(
      new RegExp(
        `${escapeRegex(label)}[^\\d]{0,45}(\\d{3,4}(?:[.,]\\d+)?)`,
        "i",
      ),
    );

    if (match) {
      return normalizeInteger(match[1]);
    }
  }

  return "";
}

function findNumberBeforeLabel(text: string, labels: string[]) {
  for (const label of labels) {
    const match = text.match(
      new RegExp(
        `(\\d{1,2}(?:[.\\s]\\d{3})|\\d{3,4})\\s*mm\\s+de\\s+${escapeRegex(label)}`,
        "i",
      ),
    );

    if (match) {
      return normalizeInteger(match[1]);
    }
  }

  return "";
}

function parseFuelName(text: string) {
  if (/diesel|di[eé]sel/i.test(text)) {
    return "Diesel";
  }

  return "Gasolina";
}

function normalizeInteger(value: string) {
  return value.replace(/\D/g, "");
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function cleanModelName(value: string) {
  return value.replace(/[^\w-]/g, "").trim();
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const sectionTitleStyle: React.CSSProperties = {
  gridColumn: "1 / -1",
  fontSize: "1rem",
};

const parserPanelStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(240px, 100%), 1fr))",
  gap: "12px",
  marginTop: "1rem",
  padding: "16px",
  border: "1px solid #bfdbfe",
  borderRadius: "8px",
  background: "linear-gradient(135deg, #eff6ff 0%, #ffffff 60%, #ecfdf5 100%)",
  boxShadow: "0 12px 28px rgb(15 23 42 / 6%)",
};

const comparisonPanelStyle: React.CSSProperties = {
  marginTop: "1rem",
  padding: "16px",
  border: "1px solid #dce4ef",
  borderRadius: "8px",
  background: "#ffffff",
  boxShadow: "0 12px 28px rgb(15 23 42 / 6%)",
};

const comparisonHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  flexWrap: "wrap",
};

const comparisonGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(220px, 100%), 1fr))",
  gap: "12px",
  marginTop: "12px",
};

const comparisonCardStyle: React.CSSProperties = {
  display: "grid",
  gap: "8px",
  padding: "12px",
  border: "1px solid #edf2f7",
  borderRadius: "8px",
  background: "#f8fafc",
};

const comparisonTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "1rem",
};

const comparisonDetailStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "10px",
  paddingTop: "6px",
  borderTop: "1px solid #e2e8f0",
};

const formStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(170px, 100%), 1fr))",
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
