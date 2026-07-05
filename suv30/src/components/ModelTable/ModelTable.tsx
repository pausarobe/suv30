import { MdDeleteForever, MdEdit } from "react-icons/md";

import type { Model } from "@/domain/Model";
import styles from "./ModelTable.module.css";

type Props = {
  models: Model[];
  onEditModel: (model: Model) => void;
  onDeleteModel: (id: string) => void;
};

export default function ModelTable({
  models,
  onEditModel,
  onDeleteModel,
}: Props) {
  return (
    <div className="table-scroll">
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Marca</th>
            <th>Modelo</th>
            <th>Generación</th>
            <th>Etiqueta</th>
            <th>Medidas</th>
            <th>Maletero</th>
            <th>Consumo</th>
            <th>Precio objetivo</th>
            <th>Valoración</th>
            <th>Acciones</th>
          </tr>
        </thead>

        <tbody>
          {models.map((model) => (
            <tr key={model.id}>
              <td>{model.brand}</td>
              <td>{model.model}</td>
              <td>{model.generation}</td>
              <td>{model.ecoLabel}</td>
              <td>{formatDimensions(model)}</td>
              <td>{model.trunk} L</td>
              <td>{formatConsumption(model.consumption)}</td>
              <td>{model.targetPrice.toLocaleString("es-ES")} €</td>
              <td>{model.rating}</td>
              <td>
                <div style={actionsStyle}>
                  <button
                    onClick={() => onEditModel(model)}
                    style={editButtonStyle}
                    type="button"
                  >
                    <MdEdit />
                  </button>
                  <button
                    onClick={() => onDeleteModel(model.id)}
                    style={deleteButtonStyle}
                    type="button"
                  >
                    <MdDeleteForever />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatDimensions(model: Model) {
  if (model.length <= 0 || model.width <= 0 || model.height <= 0) {
    return "Pendiente";
  }

  return `${model.length} x ${model.width} x ${model.height} mm`;
}

function formatConsumption(consumption: number) {
  return consumption > 0 ? `${consumption.toFixed(1)} l/100 km` : "Pendiente";
}

const actionsStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "center",
  gap: "10px",
};

const iconButtonStyle: React.CSSProperties = {
  padding: 0,
  background: "transparent",
  borderRadius: "4px",
  cursor: "pointer",
  width: "auto",
  minHeight: "auto",
  fontSize: "1.2rem",
};

const editButtonStyle: React.CSSProperties = {
  ...iconButtonStyle,
  color: "#475569",
};

const deleteButtonStyle: React.CSSProperties = {
  ...iconButtonStyle,
  color: "#dc2626",
};
