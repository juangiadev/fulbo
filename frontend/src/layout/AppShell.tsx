import { useEffect, useRef, useState } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { useAppContext } from '../state/AppContext';
import buttonStyles from '../styles/Button.module.css';
import styles from './AppShell.module.css';

function FulboLogo() {
  return (
    <Link aria-label="Ir a torneos" to="/tournaments">
      <img alt="Balon" className={styles.logoBall} src="/fulbo_logo.png" />
    </Link>
  );
}

export function AppShell() {
  const { currentUser, logout } = useAppContext();
  const [menuOpen, setMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const initials = (currentUser.nickname ?? currentUser.name ?? 'U').slice(0, 1).toUpperCase();

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const handleOutsideClick = (event: MouseEvent) => {
      if (!dropdownRef.current) {
        return;
      }

      if (!dropdownRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    window.addEventListener('mousedown', handleOutsideClick);
    return () => window.removeEventListener('mousedown', handleOutsideClick);
  }, [menuOpen]);

  return (
    <div className={styles.appShell}>
      <header className={styles.topbar}>
        <div className={styles.brandWrap}>
          <FulboLogo />
        </div>
        <div className={styles.topbarUser} ref={dropdownRef}>
          <button className={styles.avatarBtn} onClick={() => setMenuOpen((value) => !value)} type="button">
            {currentUser.imageUrl ? (
              <img alt="Usuario" className={styles.avatarImage} src={currentUser.imageUrl} />
            ) : (
              <span>{initials}</span>
            )}
          </button>
          {menuOpen ? (
            <div className={styles.userDropdown}>
              <Link className={buttonStyles.ghost} onClick={() => setMenuOpen(false)} to="/profile">
                Mi perfil
              </Link>
              <button className={buttonStyles.ghost} onClick={logout} type="button">
                Cerrar sesion
              </button>
            </div>
          ) : null}
        </div>
      </header>

      <main className={styles.pageWrap}>
        <Outlet />
      </main>
    </div>
  );
}
