import { FAVORITE_TEAMS } from '@shared/favorite-teams';
import { ChevronDown, Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './FavoriteTeamSelect.module.css';

interface FavoriteTeamSelectProps {
  describedBy?: string;
  disabled?: boolean;
  onChange: (slug: string) => void;
  value: string;
}

function normalizeSearchValue(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('es-AR')
    .trim();
}

export function FavoriteTeamSelect({
  describedBy,
  disabled = false,
  onChange,
  value,
}: FavoriteTeamSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const selectedTeam = FAVORITE_TEAMS.find((team) => team.slug === value);
  const matchingTeams = useMemo(() => {
    const normalizedQuery = normalizeSearchValue(query);

    if (!normalizedQuery) {
      return FAVORITE_TEAMS;
    }

    return FAVORITE_TEAMS.filter((team) =>
      normalizeSearchValue(team.name).includes(normalizedQuery),
    );
  }, [query]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    searchInputRef.current?.focus();

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [isOpen]);

  const selectTeam = (slug: string) => {
    onChange(slug);
    setIsOpen(false);
    setQuery('');
  };

  return (
    <div className={styles.selector}>
      <button
        aria-describedby={describedBy}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className={styles.trigger}
        disabled={disabled}
        onClick={() => setIsOpen(true)}
        type="button"
      >
        {selectedTeam ? (
          <img alt="" className={styles.badge} src={selectedTeam.imageUrl} />
        ) : (
          <span aria-hidden="true" className={styles.emptyBadge} />
        )}
        <span>{selectedTeam?.name ?? 'Sin equipo favorito'}</span>
        <ChevronDown aria-hidden="true" className={styles.triggerIcon} size={18} />
      </button>

      {isOpen
        ? createPortal(
            <div className={styles.backdrop} onMouseDown={() => setIsOpen(false)} role="presentation">
          <section
            aria-labelledby="favorite-team-modal-title"
            aria-modal="true"
            className={styles.modal}
            onMouseDown={(event) => event.stopPropagation()}
            role="dialog"
          >
            <header className={styles.header}>
              <div>
                <p className={styles.eyebrow}>Equipo favorito</p>
                <h3 id="favorite-team-modal-title">Elegí tu equipo</h3>
              </div>
              <button
                aria-label="Cerrar selector de equipo favorito"
                className={styles.closeButton}
                onClick={() => setIsOpen(false)}
                type="button"
              >
                <X aria-hidden="true" size={20} />
              </button>
            </header>

            <label className={styles.searchField}>
              <Search aria-hidden="true" size={18} />
              <input
                aria-label="Buscar equipo favorito"
                className={styles.searchInput}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar equipo..."
                ref={searchInputRef}
                type="search"
                value={query}
              />
            </label>

            <div aria-label="Equipos favoritos" className={styles.teamList}>
              <button
                aria-pressed={value === ''}
                className={`${styles.teamOption} ${value === '' ? styles.selected : ''}`}
                onClick={() => selectTeam('')}
                type="button"
              >
                <span className={styles.emptyBadge} aria-hidden="true" />
                <span>Sin equipo favorito</span>
              </button>

              {matchingTeams.map((team) => (
                <button
                  aria-pressed={value === team.slug}
                  className={`${styles.teamOption} ${value === team.slug ? styles.selected : ''}`}
                  key={team.slug}
                  onClick={() => selectTeam(team.slug)}
                  type="button"
                >
                  <img alt="" className={styles.badge} src={team.imageUrl} />
                  <span>{team.name}</span>
                </button>
              ))}

              {matchingTeams.length === 0 ? (
                <p className={styles.emptyState}>No encontramos equipos con ese nombre.</p>
              ) : null}
            </div>
            </section>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
