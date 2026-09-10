import { LogOut, UserRound } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { useAppContext } from '../state/AppContext';
import styles from './AppShell.module.css';

function FulboLogo() {
  return (
    <Link aria-label="Ir a torneos" to="/tournaments">
      <img alt="" className={styles.logoBall} src="/fulbo_logo.png" />
    </Link>
  );
}

export function AppShell() {
  const { currentUser, logout } = useAppContext();
  const [menuOpen, setMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const avatarButtonRef = useRef<HTMLButtonElement | null>(null);

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

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        avatarButtonRef.current?.focus();
      }
    };

    window.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  return (
    <div className={styles.appShell}>
      <header className={styles.topbar}>
        <div className={styles.brandWrap}>
          <FulboLogo />
        </div>
        <div className={styles.topbarUser} ref={dropdownRef}>
          <button
            aria-controls="user-menu"
            aria-expanded={menuOpen}
            aria-label="Abrir menú de usuario"
            className={styles.avatarBtn}
            onClick={() => setMenuOpen((value) => !value)}
            ref={avatarButtonRef}
            type="button"
          >
            {currentUser.imageUrl ? (
              <img alt="" className={styles.avatarImage} src={currentUser.imageUrl} />
            ) : (
              <span>{initials}</span>
            )}
          </button>
          {menuOpen ? (
            <div className={styles.userDropdown} id="user-menu">
              <div className={styles.menuIdentity}>
                <strong>{currentUser.nickname ?? currentUser.name}</strong>
                <span>{currentUser.email}</span>
              </div>
              <Link className={styles.menuItem} onClick={() => setMenuOpen(false)} to="/profile">
                <UserRound aria-hidden="true" size={17} />
                Mi perfil
              </Link>
              <button className={styles.menuItem} onClick={logout} type="button">
                <LogOut aria-hidden="true" size={17} />
                Cerrar sesión
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
