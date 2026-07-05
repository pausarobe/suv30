import { NavLink, Outlet } from "react-router-dom";
import styles from "./MainLayout.module.css";

const getLinkClassName = ({ isActive }: { isActive: boolean }) =>
  isActive ? `${styles.link} ${styles.active}` : styles.link;

export default function MainLayout() {
  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <h2 className={styles.title}>
          SUV30
          <span className={styles.subtitle}>Radar personal de compra</span>
        </h2>

        <nav className={styles.nav}>
          <NavLink className={getLinkClassName} to="/">
            Dashboard
          </NavLink>

          <NavLink className={getLinkClassName} to="/models">
            Modelos
          </NavLink>

          <NavLink className={getLinkClassName} to="/market">
            Mercado
          </NavLink>

          <NavLink className={getLinkClassName} to="/settings">
            Configuración
          </NavLink>
        </nav>
      </aside>

      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  );
}
