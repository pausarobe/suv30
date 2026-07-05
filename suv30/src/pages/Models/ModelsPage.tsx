import { useEffect, useState } from "react";

import ModelTable from "@/components/ModelTable/ModelTable";
import type { Model } from "@/domain/Model";
import { ModelService, type CreateModelInput } from "@/services/ModelService";

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
  targetPrice: string;
  rating: string;
};

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
  targetPrice: "",
  rating: "A revisar",
};

const modelService = new ModelService();

export default function ModelsPage() {
  const [models, setModels] = useState<Model[]>([]);
  const [form, setForm] = useState<ModelFormState>(defaultFormState);
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
      targetPrice: Number(form.targetPrice),
      rating: form.rating,
    };

    try {
      const savedModel = editingModelId
        ? await modelService.updateModel(editingModelId, model)
        : await modelService.createModel(model);

      setModels((currentModels) => {
        const nextModels = editingModelId
          ? currentModels.map((currentModel) =>
              currentModel.id === editingModelId ? savedModel : currentModel
            )
          : [...currentModels, savedModel];

        return nextModels.sort((a, b) =>
          `${a.brand} ${a.model}`.localeCompare(`${b.brand} ${b.model}`)
        );
      });
      setForm(defaultFormState);
      setEditingModelId(null);
      setFormMessage(editingModelId ? "Modelo actualizado." : "Modelo guardado.");
    } catch {
      setFormMessage(
        editingModelId
          ? "No se ha podido actualizar el modelo."
          : "No se ha podido guardar el modelo."
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
      targetPrice: String(model.targetPrice),
      rating: model.rating,
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
        currentModels.filter((model) => model.id !== id)
      );
      if (editingModelId === id) {
        cancelEdit();
      }
      setFormMessage("Modelo borrado.");
    } catch {
      setFormMessage(
        "No se ha podido borrar el modelo. Revisa si tiene anuncios asociados."
      );
    }
  };

  return (
    <>
      <h1>Modelos</h1>

      {isLoading && <p>Cargando modelos...</p>}
      {error && <p>{error}</p>}

      {!isLoading && !error && (
        <>
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

            <label style={fieldStyle}>
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

            <label style={fieldStyle}>
              Precio objetivo
              <input
                required
                min="0"
                type="number"
                value={form.targetPrice}
                onChange={updateField("targetPrice")}
                style={inputStyle}
              />
            </label>

            <label style={fieldStyle}>
              Valoración
              <select
                required
                value={form.rating}
                onChange={updateField("rating")}
                style={inputStyle}
              >
                <option>Candidato principal</option>
                <option>Recomendable</option>
                <option>A revisar</option>
                <option>Descartado</option>
              </select>
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
                <button onClick={cancelEdit} style={secondaryButtonStyle} type="button">
                  Cancelar
                </button>
              )}
              {formMessage && <span>{formMessage}</span>}
            </div>
          </form>

          <ModelTable
            models={models}
            onEditModel={handleEditModel}
            onDeleteModel={handleDeleteModel}
          />
        </>
      )}
    </>
  );
}

const sectionTitleStyle: React.CSSProperties = {
  gridColumn: "1 / -1",
  fontSize: "1rem",
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
