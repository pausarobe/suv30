import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import styles from "./MainLayout.module.css";
import { MdOutlineMenu } from "react-icons/md";
import { IoMdClose } from "react-icons/io";

const getLinkClassName = ({ isActive }: { isActive: boolean }) =>
  isActive ? `${styles.link} ${styles.active}` : styles.link;

export default function MainLayout() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.header}>
          <img src="/suv30-logo.png" alt="" className={styles.logo} />

          <button
            className={styles.menuButton}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Abrir menú"
          >
             {menuOpen ? <IoMdClose size={28} /> : <MdOutlineMenu size={28} />}
          </button>
        </div>

        <nav
          className={`${styles.nav} ${
            menuOpen ? styles.navOpen : ""
          }`}
        >
          <NavLink
            className={getLinkClassName}
            to="/"
            onClick={() => setMenuOpen(false)}
          >
            Dashboard
          </NavLink>

          <NavLink
            className={getLinkClassName}
            to="/models"
            onClick={() => setMenuOpen(false)}
          >
            Modelos
          </NavLink>

          <NavLink
            className={getLinkClassName}
            to="/market"
            onClick={() => setMenuOpen(false)}
          >
            Mercado
          </NavLink>

          <NavLink
            className={getLinkClassName}
            to="/settings"
            onClick={() => setMenuOpen(false)}
          >
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