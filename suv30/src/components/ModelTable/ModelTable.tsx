import type { Model } from "@/domain/Model";
import styles from "./ModelTable.module.css";

type Props = {
  models: Model[];
};

export default function ModelTable({ models }: Props) {
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>Marca</th>
          <th>Modelo</th>
          <th>Generación</th>
          <th>Maletero</th>
          <th>Precio objetivo</th>
          <th>Valoración</th>
        </tr>
      </thead>

      <tbody>
        {models.map((model) => (
          <tr key={model.id}>
            <td>{model.brand}</td>
            <td>{model.model}</td>
            <td>{model.generation}</td>
            <td>{model.trunk} L</td>
            <td>{model.targetPrice.toLocaleString("es-ES")} €</td>
            <td>{model.rating}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
