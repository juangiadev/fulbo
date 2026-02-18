import { DisplayPreference } from '@shared/enums';
import { useEffect, useRef, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { FAVORITE_TEAMS } from '@shared/favorite-teams';
import { sileo } from 'sileo';
import { useAppContext } from '../state/AppContext';
import buttonStyles from '../styles/Button.module.css';
import styles from './AppShell.module.css';

function FulboLogo() {
  return (
    <div aria-label="Fulbo">
      <img alt="Balon" className={styles.logoBall} src="/fulbo_logo.png" />
    </div>
  );
}

export function AppShell() {
  const { currentUser, logout, updateProfile } = useAppContext();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [name, setName] = useState(currentUser.name);
  const [nickname, setNickname] = useState(currentUser.nickname ?? '');
  const [favoriteTeamSlug, setFavoriteTeamSlug] = useState<string | null>(currentUser.favoriteTeamSlug ?? null);
  const [favoriteTeamQuery, setFavoriteTeamQuery] = useState(
    FAVORITE_TEAMS.find((team) => team.slug === currentUser.favoriteTeamSlug)?.name ?? '',
  );
  const [favoriteTeamOpen, setFavoriteTeamOpen] = useState(false);
  const [displayPreference, setDisplayPreference] = useState<DisplayPreference>(currentUser.displayPreference);
  const [imageUrl, setImageUrl] = useState(currentUser.imageUrl ?? '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const initials = (currentUser.nickname ?? currentUser.name ?? 'U').slice(0, 1).toUpperCase();
  const filteredTeams = FAVORITE_TEAMS.filter((team) =>
    team.name.toLowerCase().includes(favoriteTeamQuery.toLowerCase()),
  );

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
              <button
                className={buttonStyles.ghost}
                onClick={() => {
                  setName(currentUser.name);
                  setNickname(currentUser.nickname ?? '');
                  setImageUrl(currentUser.imageUrl ?? '');
                  setDisplayPreference(currentUser.displayPreference);
                  setFavoriteTeamSlug(currentUser.favoriteTeamSlug ?? null);
                  setFavoriteTeamQuery(
                    FAVORITE_TEAMS.find((team) => team.slug === currentUser.favoriteTeamSlug)?.name ?? '',
                  );
                  setProfileOpen(true);
                  setMenuOpen(false);
                }}
                type="button"
              >
                Perfil
              </button>
              <button className={buttonStyles.ghost} onClick={logout} type="button">
                Cerrar sesion
              </button>
            </div>
          ) : null}
        </div>
      </header>

      {profileOpen ? (
        <div className={styles.modalBackdrop} role="presentation">
          <div className={styles.profileModal}>
            <h3>Perfil</h3>
            <p className={styles.profileHint}>
              Estos datos se usan como perfil por defecto para tus jugadores en nuevos torneos.
            </p>
            <form
              className={styles.profileForm}
              onSubmit={async (event) => {
                event.preventDefault();
                setIsSavingProfile(true);
                try {
                  await sileo.promise(
                    updateProfile({
                      name,
                      nickname: nickname || null,
                      imageUrl: imageUrl || null,
                      favoriteTeamSlug,
                      displayPreference,
                    }),
                    {
                      loading: { title: 'Guardando perfil...' },
                      success: { title: 'Perfil actualizado' },
                      error: { title: 'No se pudo actualizar el perfil' },
                    },
                  );
                  setProfileOpen(false);
                } finally {
                  setIsSavingProfile(false);
                }
              }}
            >
              <label>
                Nombre
                <input onChange={(event) => setName(event.target.value)} required value={name} />
              </label>
              <label>
                Apodo
                <input onChange={(event) => setNickname(event.target.value)} value={nickname} />
              </label>
              <label>
                Foto de perfil (URL)
                <input onChange={(event) => setImageUrl(event.target.value)} placeholder="https://..." value={imageUrl} />
              </label>
              <label>
                Equipo favorito
                <div className={styles.teamSelectWrap}>
                  <input
                    onBlur={() => setTimeout(() => setFavoriteTeamOpen(false), 120)}
                    onChange={(event) => {
                      setFavoriteTeamQuery(event.target.value);
                      setFavoriteTeamSlug(null);
                    }}
                    onFocus={() => setFavoriteTeamOpen(true)}
                    placeholder="Escribe para filtrar"
                    value={favoriteTeamQuery}
                  />
                  {favoriteTeamOpen ? (
                    <div className={styles.teamSelectList}>
                      {filteredTeams.map((team) => (
                        <button
                          className={styles.teamOption}
                          key={team.slug}
                          onClick={() => {
                            setFavoriteTeamSlug(team.slug);
                            setFavoriteTeamQuery(team.name);
                            setFavoriteTeamOpen(false);
                          }}
                          type="button"
                        >
                          <img alt="Escudo" className={styles.teamOptionImage} src={team.imageUrl} />
                          <span>{team.name}</span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </label>
              <label>
                Preferencia por defecto
                <select
                  onChange={(event) => setDisplayPreference(event.target.value as DisplayPreference)}
                  value={displayPreference}
                >
                  <option value={DisplayPreference.IMAGE}>Imagen</option>
                  <option value={DisplayPreference.FAVORITE_TEAM}>Equipo favorito</option>
                </select>
              </label>
              <div className={styles.profileActions}>
                <button
                  className={buttonStyles.ghost}
                  disabled={isSavingProfile}
                  onClick={() => setProfileOpen(false)}
                  type="button"
                >
                  Cancelar
                </button>
                <button className={buttonStyles.primary} disabled={isSavingProfile} type="submit">
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <main className={styles.pageWrap}>
        <Outlet />
      </main>
    </div>
  );
}
