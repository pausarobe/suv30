import { useMemo, useState } from "react";
import {
  MdArrowDownward,
  MdArrowUpward,
  MdDeleteForever,
  MdEdit,
  MdUnfoldMore,
} from "react-icons/md";

import type { Model } from "@/domain/Model";
import styles from "./ModelTable.module.css";

type Props = {
  models: Model[];
  comparisonModelIds: string[];
  onToggleComparisonModel: (id: string) => void;
  onEditModel: (model: Model) => void;
  onDeleteModel: (id: string) => void;
};

type SortKey = "trunk" | "length" | "width";
type SortDirection = "asc" | "desc";

type SortState = {
  key: SortKey;
  direction: SortDirection;
};

export default function ModelTable({
  models,
  comparisonModelIds,
  onToggleComparisonModel,
  onEditModel,
  onDeleteModel,
}: Props) {
  const [sortState, setSortState] = useState<SortState>({
    key: "trunk",
    direction: "desc",
  });
  const sortedModels = useMemo(
    () =>
      [...models].sort((firstModel, secondModel) => {
        const directionMultiplier = sortState.direction === "asc" ? 1 : -1;
        return (
          (firstModel[sortState.key] - secondModel[sortState.key]) *
          directionMultiplier
        );
      }),
    [models, sortState],
  );

  const handleSort = (key: SortKey) => {
    setSortState((currentSortState) => ({
      key,
      direction:
        currentSortState.key === key && currentSortState.direction === "desc"
          ? "asc"
          : "desc",
    }));
  };

  const ecoClassMap: Record<string, string> = {
    "0": "cero",
    ECO: "eco",
    C: "c",
    B: "b",
  };

  return (
    <div className="table-scroll">
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Comparar</th>
            <th>Marca</th>
            <th>Modelo</th>
            <th>Generación</th>
            <th>Etiqueta</th>
            <SortableHeader
              label="Largo"
              sortKey="length"
              sortState={sortState}
              onSort={handleSort}
            />
            <SortableHeader
              label="Ancho"
              sortKey="width"
              sortState={sortState}
              onSort={handleSort}
            />
            <th>Alto</th>
            <SortableHeader
              label="Maletero"
              sortKey="trunk"
              sortState={sortState}
              onSort={handleSort}
            />
            <th>Consumo</th>
            <th>Acciones</th>
          </tr>
        </thead>

        <tbody>
          {sortedModels.map((model) => (
            <tr key={model.id}>
              <td>
                <input
                  aria-label={`Comparar ${model.brand} ${model.model}`}
                  checked={comparisonModelIds.includes(model.id)}
                  disabled={
                    !comparisonModelIds.includes(model.id) &&
                    comparisonModelIds.length >= 3
                  }
                  onChange={() => onToggleComparisonModel(model.id)}
                  type="checkbox"
                />
              </td>
              <td>{model.brand}</td>
              <td>{model.model}</td>
              <td>{model.generation}</td>
              <td>
                <div className={`eco-badge ${ecoClassMap[model.ecoLabel]}`}>
                  {model.ecoLabel}
                </div>
              </td>
              <td>{formatDimension(model.length)}</td>
              <td>{formatDimension(model.width)}</td>
              <td>{formatDimension(model.height)}</td>
              <td>{model.trunk} L</td>
              <td>{formatConsumption(model.consumption)}</td>
              <td>
                <div style={actionsStyle}>
                  <button
                    aria-label="Editar modelo"
                    onClick={() => onEditModel(model)}
                    style={editButtonStyle}
                    type="button"
                  >
                    <MdEdit />
                  </button>
                  <button
                    aria-label="Borrar modelo"
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

function SortableHeader({
  label,
  sortKey,
  sortState,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  sortState: SortState;
  onSort: (key: SortKey) => void;
}) {
  const isActive = sortState.key === sortKey;
  const SortIcon = isActive
    ? sortState.direction === "asc"
      ? MdArrowUpward
      : MdArrowDownward
    : MdUnfoldMore;

  return (
    <th>
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

function formatDimension(value: number) {
  return value > 0 ? `${value} mm` : "Pendiente";
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
