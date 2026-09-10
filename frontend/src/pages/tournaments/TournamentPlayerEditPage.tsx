import type { PlayerContract } from '@shared/contracts';
import { DisplayPreference, PlayerRole } from '@shared/enums';
import { FAVORITE_TEAMS } from '@shared/favorite-teams';
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Clock3,
  Eye,
  HeartPulse,
  Image,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
  Shirt,
  SlidersHorizontal,
  UserRound,
  Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { sileo } from 'sileo';
import { apiClient } from '../../api/client';
import { PlayerAvatar, type PlayerAvatarPlayer } from '../../components/PlayerAvatar';
import { useTournamentPermissions } from '../../hooks/useTournamentPermissions';
import { canEditTournamentPlayer } from '../../permissions/tournamentPermissions';
import { useAppContext } from '../../state/AppContext';
import styles from './TournamentPlayerEditPage.module.css';

const PLAYER_NAME_MAX_LENGTH = 120;

const ROLE_LABELS: Record<PlayerRole, string> = {
  [PlayerRole.OWNER]: 'Organizador',
  [PlayerRole.ADMIN]: 'Administrador',
  [PlayerRole.USER]: 'Jugador',
};

const PREVIEW_AVATAR_CLASS_NAMES = {
  avatar: styles.previewAvatar,
  avatarFallback: styles.previewAvatarFallback,
  avatarTeam: styles.previewAvatarTeam,
};

export function TournamentPlayerEditPage() {
  const navigate = useNavigate();
  const { tournamentId, playerId } = useParams();
  const { currentUser, data, loadTournaments } = useAppContext();
  const [players, setPlayers] = useState<PlayerContract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadError, setHasLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [favoriteTeamSlug, setFavoriteTeamSlug] = useState('');
  const [displayPreference, setDisplayPreference] = useState<DisplayPreference>(DisplayPreference.IMAGE);
  const [playerRole, setPlayerRole] = useState<PlayerRole>(PlayerRole.USER);
  const [ability, setAbility] = useState('');
  const [injury, setInjury] = useState('');
  const [misses, setMisses] = useState(0);

  const tournament = data.tournaments.find((item) => item.id === tournamentId);
  const permissions = useTournamentPermissions(tournamentId);

  useEffect(() => {
    if (!tournamentId) {
      return;
    }

    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        setIsLoading(true);
        setHasLoadError(false);
      }
    });

    void apiClient
      .getPlayers(tournamentId)
      .then((nextPlayers) => {
        if (!cancelled) {
          setPlayers(nextPlayers);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHasLoadError(true);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey, tournamentId]);

  const player = players.find((item) => item.id === playerId);
  const isSelf = player?.userId === currentUser.id;
  const canEditThisPlayer = player
    ? canEditTournamentPlayer({
        actorRole: permissions.role,
        actorUserId: currentUser.id,
        targetRole: player.role,
        targetUserId: player.userId,
      })
    : false;
  const canEditPrivateFields = permissions.canViewPlayerPrivateDetails && canEditThisPlayer;
  const canChangeRole = Boolean(
    player?.userId && canEditPrivateFields && !(permissions.isOwner && isSelf),
  );
  const canAssignOwner = Boolean(permissions.isOwner && !isSelf && player?.userId);

  useEffect(() => {
    if (!player) {
      return;
    }

    setName(player.name);
    setNickname(player.nickname ?? '');
    setImageUrl(player.imageUrl ?? '');
    setFavoriteTeamSlug(player.favoriteTeamSlug ?? '');
    setDisplayPreference(player.displayPreference);
    setPlayerRole(player.role);
    setAbility(player.ability?.toString() ?? '');
    setInjury(player.injury ?? '');
    setMisses(player.misses);
  }, [player]);

  if (!tournamentId || !playerId || !tournament || tournament.membershipStatus === 'PENDING') {
    return <Navigate replace to="/tournaments" />;
  }

  if (isLoading) {
    return (
      <section className={styles.page}>
        <Link className={styles.backLink} to={`/tournaments/${tournamentId}/players`}>
          <ArrowLeft aria-hidden="true" size={18} />
          Volver al plantel
        </Link>
        <div aria-live="polite" className={styles.loadingState} role="status">
          <span aria-hidden="true" className={styles.loadingAvatar} />
          <span>Cargando editor del jugador...</span>
        </div>
      </section>
    );
  }

  if (hasLoadError) {
    return (
      <section className={styles.page}>
        <Link className={styles.backLink} to={`/tournaments/${tournamentId}/players`}>
          <ArrowLeft aria-hidden="true" size={18} />
          Volver al plantel
        </Link>
        <div className={styles.stateCard}>
          <Users aria-hidden="true" size={31} strokeWidth={1.6} />
          <h1>No pudimos cargar el editor</h1>
          <p>Revisá tu conexión e intentá nuevamente.</p>
          <button onClick={() => setReloadKey((value) => value + 1)} type="button">
            Reintentar
          </button>
        </div>
      </section>
    );
  }

  if (!player || !canEditThisPlayer) {
    return <Navigate replace to={`/tournaments/${tournamentId}/players`} />;
  }

  const trimmedName = name.trim();
  const previewPlayer: PlayerAvatarPlayer = {
    name: trimmedName || 'Jugador',
    nickname: nickname.trim() || null,
    imageUrl: imageUrl.trim() || null,
    favoriteTeamSlug: favoriteTeamSlug || null,
    displayPreference,
  };
  const selectedTeam = FAVORITE_TEAMS.find((team) => team.slug === favoriteTeamSlug);
  const displayName = previewPlayer.nickname || previewPlayer.name;
  const imageDescription = imageUrl.trim()
    ? 'Se usa cuando elegís foto de perfil. Si no carga, se muestra la inicial.'
    : 'Si elegís foto sin una URL, se muestra la inicial del jugador.';
  const teamDescription = selectedTeam
    ? `Escudo seleccionado: ${selectedTeam.name}.`
    : 'Elegí un equipo para usar su escudo como presentación.';
  const displayPreferenceDescription =
    displayPreference === DisplayPreference.FAVORITE_TEAM
      ? selectedTeam
        ? `Las pantallas mostrarán el escudo de ${selectedTeam.name}.`
        : 'Sin equipo favorito, se usará la foto o la inicial.'
      : imageUrl.trim()
        ? 'Las pantallas mostrarán la foto de perfil.'
        : 'Sin foto de perfil, las pantallas mostrarán la inicial.';

  return (
    <section className={styles.page}>
      <div aria-hidden="true" className={styles.pitchDecoration} />

      <Link className={styles.backLink} to={`/tournaments/${tournamentId}/players`}>
        <ArrowLeft aria-hidden="true" size={18} />
        Volver al plantel
      </Link>

      <header className={styles.hero}>
        <p className={styles.eyebrow}>{isSelf ? 'Tu perfil en el torneo' : 'Edición de jugador'}</p>
        <h1>
          Definí cómo se ve
          <span>{player.nickname || player.name}.</span>
        </h1>
        <p>{tournament.name}</p>
      </header>

      <form
        className={styles.formLayout}
        onSubmit={async (event) => {
          event.preventDefault();

          if (!trimmedName) {
            return;
          }

          setIsSubmitting(true);
          try {
            const payload: Partial<PlayerContract> = {
              name: trimmedName,
              nickname: nickname.trim() || null,
              imageUrl: imageUrl.trim() || null,
              favoriteTeamSlug: favoriteTeamSlug || null,
              displayPreference,
            };

            if (canEditPrivateFields) {
              payload.ability = ability.trim() ? Number(ability) : null;
              payload.injury = injury.trim() || null;
              payload.misses = misses;
            }

            if (canChangeRole) {
              payload.role = playerRole;
            }

            await sileo.promise(apiClient.updatePlayer(tournamentId, player.id, payload), {
              loading: { title: 'Guardando jugador...' },
              success: { title: 'Jugador actualizado' },
              error: { title: 'No se pudo actualizar el jugador' },
            });

            await loadTournaments();
            navigate(`/tournaments/${tournamentId}/players`, { replace: true });
          } finally {
            setIsSubmitting(false);
          }
        }}
      >
        <div className={styles.formSections}>
          <section aria-labelledby="identity-title" className={styles.formCard}>
            <div className={styles.cardHeading}>
              <span aria-hidden="true" className={styles.cardIcon}>
                <UserRound size={22} />
              </span>
              <div>
                <p className={styles.eyebrow}>Perfil público</p>
                <h2 id="identity-title">Identidad del jugador</h2>
                <p>Estos datos son visibles dentro del torneo.</p>
              </div>
            </div>

            <div className={styles.fieldsGrid}>
              <label>
                Nombre
                <input
                  disabled={isSubmitting}
                  maxLength={PLAYER_NAME_MAX_LENGTH}
                  onChange={(event) => setName(event.target.value)}
                  required
                  value={name}
                />
              </label>
              <label>
                Apodo
                <input
                  disabled={isSubmitting}
                  maxLength={PLAYER_NAME_MAX_LENGTH}
                  onChange={(event) => setNickname(event.target.value)}
                  value={nickname}
                />
              </label>
            </div>
          </section>

          <section aria-labelledby="presentation-title" className={styles.formCard}>
            <div className={styles.cardHeading}>
              <span aria-hidden="true" className={styles.cardIcon}>
                <Image size={22} />
              </span>
              <div>
                <p className={styles.eyebrow}>Presentación visual</p>
                <h2 id="presentation-title">Foto o escudo</h2>
                <p>Elegí cómo aparece el jugador en tablas y tarjetas.</p>
              </div>
            </div>

            <div className={styles.fieldsGrid}>
              <label className={styles.fullField}>
                Foto de perfil
                <input
                  aria-describedby="player-image-help"
                  disabled={isSubmitting}
                  onChange={(event) => setImageUrl(event.target.value)}
                  placeholder="https://..."
                  type="url"
                  value={imageUrl}
                />
                <span className={styles.fieldHint} id="player-image-help">
                  {imageDescription}
                </span>
              </label>

              <label>
                Equipo favorito
                <select
                  aria-describedby="player-team-help"
                  disabled={isSubmitting}
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
                <span className={styles.fieldHint} id="player-team-help">
                  {teamDescription}
                </span>
              </label>

              <label>
                Preferencia de visualización
                <select
                  aria-describedby="player-display-preference-help"
                  disabled={isSubmitting}
                  onChange={(event) => setDisplayPreference(event.target.value as DisplayPreference)}
                  value={displayPreference}
                >
                  <option value={DisplayPreference.IMAGE}>Foto de perfil</option>
                  <option value={DisplayPreference.FAVORITE_TEAM}>Equipo favorito</option>
                </select>
                <span
                  aria-live="polite"
                  className={styles.fieldHint}
                  id="player-display-preference-help"
                >
                  {displayPreferenceDescription}
                </span>
              </label>
            </div>
          </section>

          {canEditPrivateFields ? (
            <section aria-labelledby="private-fields-title" className={styles.privateCard}>
              <div className={styles.cardHeading}>
                <span aria-hidden="true" className={`${styles.cardIcon} ${styles.privateIcon}`}>
                  <ShieldCheck size={22} />
                </span>
                <div>
                  <p className={styles.privateEyebrow}>
                    <LockKeyhole aria-hidden="true" size={14} />
                    Solo gestión
                  </p>
                  <h2 id="private-fields-title">Información interna</h2>
                  <p>Solo administradores y organizadores pueden ver y editar estos campos.</p>
                </div>
              </div>

              <div className={styles.fieldsGrid}>
                <label>
                  Rol
                  {canChangeRole ? (
                    <select
                      disabled={isSubmitting}
                      onChange={(event) => setPlayerRole(event.target.value as PlayerRole)}
                      value={playerRole}
                    >
                      <option value={PlayerRole.USER}>Jugador</option>
                      <option value={PlayerRole.ADMIN}>Administrador</option>
                      {canAssignOwner ? <option value={PlayerRole.OWNER}>Organizador</option> : null}
                    </select>
                  ) : (
                    <span className={styles.readOnlyField}>{ROLE_LABELS[player.role]}</span>
                  )}
                  <span className={styles.fieldHint}>
                    {!player.userId
                      ? 'Los invitados sin vincular mantienen el rol de jugador.'
                      : permissions.isOwner && isSelf
                        ? 'La propiedad se transfiere desde el perfil de otro jugador vinculado.'
                        : 'El rol define qué puede administrar dentro del torneo.'}
                  </span>
                </label>

                <label>
                  Habilidad
                  <span className={styles.inputWithIcon}>
                    <Activity aria-hidden="true" size={17} />
                    <input
                      disabled={isSubmitting}
                      max={10}
                      min={1}
                      onChange={(event) => setAbility(event.target.value)}
                      type="number"
                      value={ability}
                    />
                  </span>
                  <span className={styles.fieldHint}>Valor interno entre 1 y 10.</span>
                </label>

                <label>
                  Lesión
                  <span className={styles.inputWithIcon}>
                    <HeartPulse aria-hidden="true" size={17} />
                    <input
                      disabled={isSubmitting}
                      onChange={(event) => setInjury(event.target.value)}
                      placeholder="Sin lesión"
                      value={injury}
                    />
                  </span>
                </label>

                <label>
                  Faltas
                  <span className={styles.inputWithIcon}>
                    <Clock3 aria-hidden="true" size={17} />
                    <input
                      disabled={isSubmitting}
                      min={0}
                      onChange={(event) => setMisses(Number(event.target.value))}
                      required
                      type="number"
                      value={misses}
                    />
                  </span>
                </label>
              </div>
            </section>
          ) : null}
        </div>

        <aside className={styles.previewColumn}>
          <div className={styles.previewCard}>
            <div className={styles.previewTopline}>
              <span>Vista previa</span>
              <Eye aria-hidden="true" size={17} />
            </div>
            <div className={styles.previewBody}>
              <span className={styles.previewAvatarWrap}>
                <PlayerAvatar classNames={PREVIEW_AVATAR_CLASS_NAMES} player={previewPlayer} />
              </span>
              <p>{ROLE_LABELS[playerRole]}</p>
              <h2>{displayName}</h2>
              {nickname.trim() ? <span>{trimmedName}</span> : null}
              <small>
                <Shirt aria-hidden="true" size={14} />
                {displayPreference === DisplayPreference.FAVORITE_TEAM
                  ? selectedTeam?.name ?? 'Sin equipo favorito'
                  : 'Foto de perfil'}
              </small>
            </div>
          </div>

          <div className={styles.formActions}>
            <button
              className={styles.cancelButton}
              disabled={isSubmitting}
              onClick={() => navigate(`/tournaments/${tournamentId}/players`)}
              type="button"
            >
              Cancelar
            </button>
            <button
              className={styles.saveButton}
              disabled={isSubmitting || !trimmedName}
              type="submit"
            >
              <span>{isSubmitting ? 'Guardando...' : 'Guardar cambios'}</span>
              {isSubmitting ? (
                <LoaderCircle aria-hidden="true" className={styles.spinner} size={20} />
              ) : (
                <ArrowRight aria-hidden="true" size={20} />
              )}
            </button>
          </div>

          <p className={styles.saveHint}>
            <SlidersHorizontal aria-hidden="true" size={15} />
            Los cambios se aplicarán en todas las pantallas del torneo.
          </p>
        </aside>
      </form>
    </section>
  );
}
