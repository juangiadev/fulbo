import type {
  MyPlayerProfileContract,
  UpdateUserProfileInput,
} from '@shared/contracts';
import { DisplayPreference } from '@shared/enums';
import { FAVORITE_TEAMS } from '@shared/favorite-teams';
import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { sileo } from 'sileo';
import { ContentSpinner } from '../../components/ContentSpinner';
import { apiClient } from '../../api/client';
import { useAppContext } from '../../state/AppContext';
import buttonStyles from '../../styles/Button.module.css';
import styles from './ProfilePage.module.css';

export function ProfilePage() {
  const { currentUser, updateProfile } = useAppContext();
  const [name, setName] = useState(currentUser.name);
  const [nickname, setNickname] = useState(currentUser.nickname ?? '');
  const [imageUrl, setImageUrl] = useState(currentUser.imageUrl ?? '');
  const [favoriteTeamSlug, setFavoriteTeamSlug] = useState(currentUser.favoriteTeamSlug ?? '');
  const [displayPreference, setDisplayPreference] = useState<DisplayPreference>(
    currentUser.displayPreference,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [players, setPlayers] = useState<MyPlayerProfileContract[]>([]);
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(true);
  const [playersError, setPlayersError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void apiClient
      .getMyPlayers()
      .then((loadedPlayers) => {
        if (!cancelled) {
          setPlayers(loadedPlayers);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPlayersError(true);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingPlayers(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);

    const input: UpdateUserProfileInput = {
      name: name.trim(),
      nickname: nickname.trim() || null,
      imageUrl: imageUrl.trim() || null,
      favoriteTeamSlug: favoriteTeamSlug || null,
      displayPreference,
    };

    try {
      await sileo.promise(updateProfile(input), {
        loading: { title: 'Guardando perfil...' },
        success: { title: 'Perfil actualizado' },
        error: { title: 'No se pudo actualizar el perfil' },
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className={styles.section}>
      <div className={styles.headerRow}>
        <div>
          <p className={styles.eyebrow}>Cuenta</p>
          <h2>Mi perfil</h2>
          <p className={styles.subtle}>Configura tu identidad y revisa tus perfiles de torneo.</p>
        </div>
        <Link className={buttonStyles.ghost} to="/tournaments">
          Volver a torneos
        </Link>
      </div>

      <div className={styles.grid}>
        <article className={styles.card}>
          <div className={styles.cardHeading}>
            <div>
              <p className={styles.eyebrow}>Predeterminado</p>
              <h3>Perfil de cuenta</h3>
            </div>
            <div className={styles.avatarPreview}>
              {imageUrl ? (
                <img alt="Vista previa del perfil" src={imageUrl} />
              ) : (
                <span>{(nickname || name || 'U').slice(0, 1).toUpperCase()}</span>
              )}
            </div>
          </div>

          <p className={styles.description}>
            Estos datos se usan como valores iniciales cuando se crea tu jugador. No modifican jugadores que ya existen en un torneo.
          </p>

          <form className={styles.form} onSubmit={handleSubmit}>
            <label>
              Nombre de cuenta
              <input onChange={(event) => setName(event.target.value)} required value={name} />
            </label>

            <label>
              Apodo
              <input onChange={(event) => setNickname(event.target.value)} value={nickname} />
            </label>

            <label>
              Foto de perfil (URL)
              <input
                onChange={(event) => setImageUrl(event.target.value)}
                placeholder="https://..."
                value={imageUrl}
              />
            </label>

            <label>
              Equipo favorito
              <select
                onChange={(event) => setFavoriteTeamSlug(event.target.value)}
                value={favoriteTeamSlug}
              >
                <option value="">Sin equipo favorito</option>
                {FAVORITE_TEAMS.map((team) => (
                  <option key={team.slug} value={team.slug}>
                    {team.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Preferencia de visualizacion
              <select
                onChange={(event) => setDisplayPreference(event.target.value as DisplayPreference)}
                value={displayPreference}
              >
                <option value={DisplayPreference.IMAGE}>Imagen</option>
                <option value={DisplayPreference.FAVORITE_TEAM}>Equipo favorito</option>
              </select>
            </label>

            <div className={styles.accountInfo}>
              <span>Email</span>
              <strong>{currentUser.email}</strong>
            </div>

            <div className={styles.actions}>
              <button className={buttonStyles.primary} disabled={isSaving} type="submit">
                {isSaving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        </article>

        <article className={styles.card}>
          <div>
            <p className={styles.eyebrow}>Por torneo</p>
            <h3>Mis jugadores</h3>
          </div>
          <p className={styles.description}>
            Cada jugador tiene su propia informacion dentro del torneo. Edita un jugador para cambiar su nombre o sus datos deportivos.
          </p>

          {isLoadingPlayers ? <ContentSpinner /> : null}
          {playersError ? <p className={styles.error}>No se pudieron cargar tus jugadores.</p> : null}
          {!isLoadingPlayers && !playersError && players.length === 0 ? (
            <p className={styles.emptyState}>Todavia no tenes jugadores vinculados a un torneo.</p>
          ) : null}
          {!isLoadingPlayers && !playersError ? (
            <div className={styles.playersList}>
              {players.map((player) => (
                <article className={styles.playerCard} key={player.playerId}>
                  <div className={styles.playerIdentity}>
                    <strong>{player.nickname ?? player.name}</strong>
                    <span>{player.tournamentName}</span>
                    <small>Nombre del jugador: {player.name}</small>
                  </div>
                  <Link
                    className={buttonStyles.ghost}
                    to={`/tournaments/${player.tournamentId}/players/${player.playerId}/edit`}
                  >
                    Editar jugador
                  </Link>
                </article>
              ))}
            </div>
          ) : null}
        </article>
      </div>
    </section>
  );
}
