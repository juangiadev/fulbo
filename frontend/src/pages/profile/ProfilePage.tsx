import type {
  MyPlayerProfileContract,
  UpdateUserProfileInput,
} from '@shared/contracts';
import { DisplayPreference } from '@shared/enums';
import { FAVORITE_TEAMS } from '@shared/favorite-teams';
import {
  ArrowLeft,
  ArrowUpRight,
  Camera,
  Eye,
  Heart,
  Mail,
  Save,
  ShieldCheck,
  UserRound,
  Users,
} from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { sileo } from 'sileo';
import { apiClient } from '../../api/client';
import { PlayerAvatar } from '../../components/PlayerAvatar';
import { useAppContext } from '../../state/AppContext';
import styles from './ProfilePage.module.css';

const AVATAR_CLASS_NAMES = {
  avatar: styles.avatarImage,
  avatarFallback: styles.avatarFallback,
  avatarTeam: styles.avatarTeam,
};

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
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (!cancelled) {
        setIsLoadingPlayers(true);
        setPlayersError(false);
      }
    });

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
  }, [reloadKey]);

  const displayName = nickname || name || 'Jugador';
  const favoriteTeam = FAVORITE_TEAMS.find((team) => team.slug === favoriteTeamSlug);
  const profilePreview = {
    name,
    nickname: nickname || null,
    imageUrl: imageUrl || null,
    favoriteTeamSlug: favoriteTeamSlug || null,
    displayPreference,
  };

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
    <section className={styles.page}>
      <div aria-hidden="true" className={styles.pitchDecoration} />

      <Link className={styles.backLink} to="/tournaments">
        <ArrowLeft aria-hidden="true" size={18} />
        Volver a torneos
      </Link>

      <header className={styles.hero}>
        <div className={styles.heroIdentity}>
          <div className={styles.heroAvatar}>
            <PlayerAvatar classNames={AVATAR_CLASS_NAMES} player={profilePreview} />
          </div>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>Mi vestuario</p>
            <h1>
              Tu identidad,
              <span>{displayName}.</span>
            </h1>
            <p>Definí cómo te presentás y administrá cada versión tuya dentro de la cancha.</p>
          </div>
        </div>

        <dl className={styles.profileSummary}>
          <div>
            <dt>Perfiles</dt>
            <dd>{isLoadingPlayers ? '–' : players.length.toString().padStart(2, '0')}</dd>
          </div>
          <div>
            <dt>Equipo</dt>
            <dd className={styles.teamName}>{favoriteTeam?.name ?? 'Sin elegir'}</dd>
          </div>
        </dl>
      </header>

      <div className={styles.grid}>
        <section aria-labelledby="account-profile-title" className={styles.accountCard}>
          <div className={styles.cardHeading}>
            <div>
              <p className={styles.eyebrow}>Datos predeterminados</p>
              <h2 id="account-profile-title">Perfil de cuenta</h2>
            </div>
            <div aria-hidden="true" className={styles.sectionIcon}>
              <UserRound size={23} strokeWidth={1.7} />
            </div>
          </div>

          <p className={styles.description}>
            Se usan como punto de partida al crear un jugador nuevo. Tus jugadores actuales mantienen su propia identidad.
          </p>

          <form className={styles.form} onSubmit={handleSubmit}>
            <label className={styles.field}>
              <span>Nombre de cuenta</span>
              <span className={styles.inputWrap}>
                <UserRound aria-hidden="true" size={18} />
                <input
                  autoComplete="name"
                  onChange={(event) => setName(event.target.value)}
                  required
                  value={name}
                />
              </span>
            </label>

            <label className={styles.field}>
              <span>Apodo</span>
              <span className={styles.inputWrap}>
                <ShieldCheck aria-hidden="true" size={18} />
                <input
                  onChange={(event) => setNickname(event.target.value)}
                  placeholder="Cómo te dicen en la cancha"
                  value={nickname}
                />
              </span>
            </label>

            <label className={`${styles.field} ${styles.fullField}`}>
              <span>Foto de perfil</span>
              <span className={styles.inputWrap}>
                <Camera aria-hidden="true" size={18} />
                <input
                  inputMode="url"
                  onChange={(event) => setImageUrl(event.target.value)}
                  placeholder="https://..."
                  type="url"
                  value={imageUrl}
                />
              </span>
            </label>

            <label className={styles.field}>
              <span>Equipo favorito</span>
              <span className={styles.inputWrap}>
                <Heart aria-hidden="true" size={18} />
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
              </span>
            </label>

            <label className={styles.field}>
              <span>Mostrar en mi avatar</span>
              <span className={styles.inputWrap}>
                <Eye aria-hidden="true" size={18} />
                <select
                  onChange={(event) => setDisplayPreference(event.target.value as DisplayPreference)}
                  value={displayPreference}
                >
                  <option value={DisplayPreference.IMAGE}>Mi foto</option>
                  <option value={DisplayPreference.FAVORITE_TEAM}>Mi equipo favorito</option>
                </select>
              </span>
            </label>

            <div className={`${styles.accountInfo} ${styles.fullField}`}>
              <Mail aria-hidden="true" size={18} />
              <div>
                <span>Email de la cuenta</span>
                <strong>{currentUser.email}</strong>
              </div>
            </div>

            <div className={`${styles.actions} ${styles.fullField}`}>
              <p>Los cambios se aplican a tu cuenta, no a jugadores ya creados.</p>
              <button className={styles.saveButton} disabled={isSaving} type="submit">
                <Save aria-hidden="true" size={18} />
                {isSaving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        </section>

        <section aria-labelledby="players-profile-title" className={styles.playersSection}>
          <div className={styles.playersHeading}>
            <div>
              <p className={styles.eyebrow}>Identidad por torneo</p>
              <h2 id="players-profile-title">Mis jugadores</h2>
            </div>
            <span>{isLoadingPlayers ? '–' : players.length}</span>
          </div>
          <p className={styles.description}>
            Cada competencia guarda tu nombre, apodo e imagen de manera independiente.
          </p>

          {isLoadingPlayers ? (
            <div aria-busy="true" className={styles.playersList}>
              {[0, 1, 2].map((item) => (
                <article className={`${styles.playerCard} ${styles.loadingCard}`} key={item}>
                  <span aria-hidden="true" className={styles.loadingAvatar} />
                  <span aria-hidden="true" className={styles.loadingLines} />
                </article>
              ))}
              <span className={styles.srOnly} role="status">
                Cargando tus jugadores...
              </span>
            </div>
          ) : null}
          {playersError ? (
            <div className={styles.stateCard}>
              <Users aria-hidden="true" size={30} strokeWidth={1.6} />
              <h3>No pudimos cargar tus jugadores</h3>
              <p>Revisá tu conexión e intentá nuevamente.</p>
              <button onClick={() => setReloadKey((value) => value + 1)} type="button">
                Reintentar
              </button>
            </div>
          ) : null}
          {!isLoadingPlayers && !playersError && players.length === 0 ? (
            <div className={styles.stateCard}>
              <Users aria-hidden="true" size={30} strokeWidth={1.6} />
              <h3>Tu vestuario está vacío</h3>
              <p>Cuando te sumes a un torneo, tu jugador aparecerá acá.</p>
              <Link to="/tournaments">Explorar torneos</Link>
            </div>
          ) : null}
          {!isLoadingPlayers && !playersError ? (
            <div className={styles.playersList}>
              {players.map((player) => (
                <article className={styles.playerCard} key={player.playerId}>
                  <div className={styles.playerAvatar}>
                    <PlayerAvatar classNames={AVATAR_CLASS_NAMES} player={player} />
                  </div>
                  <div className={styles.playerIdentity}>
                    <span>{player.tournamentName}</span>
                    <h3>{player.nickname ?? player.name}</h3>
                    {player.nickname && player.nickname !== player.name ? <small>{player.name}</small> : null}
                  </div>
                  <Link
                    aria-label={`Editar jugador ${player.nickname ?? player.name}`}
                    className={styles.editPlayerLink}
                    to={`/tournaments/${player.tournamentId}/players/${player.playerId}/edit`}
                  >
                    <span>Editar jugador</span>
                    <ArrowUpRight aria-hidden="true" size={18} />
                  </Link>
                </article>
              ))}
            </div>
          ) : null}
        </section>
      </div>
    </section>
  );
}
