import type { PlayerContract, TournamentTeamContract } from '@shared/contracts';
import { DisplayPreference, TournamentFormat, TournamentType } from '@shared/enums';
import { FAVORITE_TEAMS } from '@shared/favorite-teams';
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Clipboard,
  Clock3,
  Eye,
  HeartPulse,
  Image,
  LoaderCircle,
  Pencil,
  Shield,
  Trash2,
  UserRoundPlus,
  Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { sileo } from 'sileo';
import { apiClient } from '../../api/client';
import { ConfirmModal } from '../../components/ConfirmModal';
import { PlayerAvatar } from '../../components/PlayerAvatar';
import { useTournamentPermissions } from '../../hooks/useTournamentPermissions';
import { canEditTeamRosterPlayer, canViewTeamRoster } from '../../permissions/tournamentPermissions';
import { useAppContext } from '../../state/AppContext';
import styles from './TournamentTeamEditPage.module.css';

const TEAM_NAME_MAX_LENGTH = 120;
const PLAYER_NAME_MAX_LENGTH = 120;

const PREVIEW_AVATAR_CLASS_NAMES = {
  avatar: styles.previewImage,
  avatarFallback: styles.previewFallback,
  avatarTeam: styles.previewImage,
};

interface RosterPlayerFormState {
  name: string;
  nickname: string;
  imageUrl: string;
  favoriteTeamSlug: string;
  displayPreference: DisplayPreference;
  ability: string;
  injury: string;
  misses: number;
}

function emptyRosterPlayerForm(): RosterPlayerFormState {
  return {
    name: '',
    nickname: '',
    imageUrl: '',
    favoriteTeamSlug: '',
    displayPreference: DisplayPreference.IMAGE,
    ability: '',
    injury: '',
    misses: 0,
  };
}

function getTeamInitial(name: string): string {
  return name.trim().slice(0, 1).toUpperCase() || 'E';
}

export function TournamentTeamEditPage() {
  const navigate = useNavigate();
  const { tournamentId, teamId } = useParams();
  const { currentUser, data } = useAppContext();
  const [teams, setTeams] = useState<TournamentTeamContract[]>([]);
  const [roster, setRoster] = useState<PlayerContract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadError, setHasLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddingPlayer, setIsAddingPlayer] = useState(false);
  const [deletingPlayerId, setDeletingPlayerId] = useState<string | null>(null);
  const [confirmingPlayerId, setConfirmingPlayerId] = useState<string | null>(null);
  const [createdClaimCode, setCreatedClaimCode] = useState('');
  const [name, setName] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [newPlayer, setNewPlayer] = useState<RosterPlayerFormState>(() => emptyRosterPlayerForm());

  const tournament = data.tournaments.find((item) => item.id === tournamentId);
  const permissions = useTournamentPermissions(tournamentId);
  const isLigaTeamTournament =
    tournament?.type === TournamentType.TEAMS && tournament.format === TournamentFormat.LIGA;

  useEffect(() => {
    if (!tournamentId || !teamId || tournament?.type !== TournamentType.TEAMS) {
      return;
    }

    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        setIsLoading(true);
        setHasLoadError(false);
      }
    });

    void Promise.all([
      apiClient.getTournamentTeams(tournamentId),
      isLigaTeamTournament ? apiClient.getTournamentTeamRoster(teamId) : Promise.resolve([]),
    ])
      .then(([nextTeams, nextRoster]) => {
        if (!cancelled) {
          setTeams(nextTeams);
          setRoster(nextRoster);
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
  }, [isLigaTeamTournament, reloadKey, teamId, tournament?.type, tournamentId]);

  const team = teams.find((item) => item.id === teamId);
  const actorRosterPlayer = roster.find((player) => player.userId === currentUser.id) ?? null;
  const canViewOpenedRoster = isLigaTeamTournament
    ? canViewTeamRoster({
        actorRole: permissions.role,
        actorTournamentTeamId: actorRosterPlayer?.tournamentTeamId ?? null,
        targetTournamentTeamId: teamId ?? null,
      })
    : permissions.canManagePlayers;
  const canEditOpenedRoster = isLigaTeamTournament
    ? canEditTeamRosterPlayer({
        actorRole: permissions.role,
        actorTournamentTeamId: actorRosterPlayer?.tournamentTeamId ?? null,
        targetTournamentTeamId: teamId ?? null,
      })
    : permissions.canManagePlayers;
  const canManageTeamIdentity = isLigaTeamTournament ? canEditOpenedRoster : permissions.canManagePlayers;
  const canAddRosterPlayers = isLigaTeamTournament && permissions.isOwner;
  const canDeleteRosterPlayers = isLigaTeamTournament && permissions.canDeletePlayers;
  const canOpenTeam = canViewOpenedRoster || canEditOpenedRoster;

  useEffect(() => {
    if (!team) {
      return;
    }

    setName(team.name);
    setImageUrl(team.imageUrl ?? '');
  }, [team]);

  if (!tournamentId || !teamId || !tournament || tournament.type !== TournamentType.TEAMS || tournament.membershipStatus === 'PENDING') {
    return <Navigate replace to={tournamentId ? `/tournaments/${tournamentId}` : '/tournaments'} />;
  }

  if (!isLoading && !canOpenTeam) {
    return <Navigate replace to={`/tournaments/${tournamentId}/teams`} />;
  }

  if (isLoading) {
    return (
      <section className={styles.page}>
        <Link className={styles.backLink} to={`/tournaments/${tournamentId}/teams`}>
          <ArrowLeft aria-hidden="true" size={18} />
          Volver a equipos
        </Link>
        <div aria-live="polite" className={styles.loadingState} role="status">
          <span aria-hidden="true" className={styles.loadingBadge} />
          <span>Cargando editor del equipo...</span>
        </div>
      </section>
    );
  }

  if (hasLoadError) {
    return (
      <section className={styles.page}>
        <Link className={styles.backLink} to={`/tournaments/${tournamentId}/teams`}>
          <ArrowLeft aria-hidden="true" size={18} />
          Volver a equipos
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

  if (!team) {
    return <Navigate replace to={`/tournaments/${tournamentId}/teams`} />;
  }

  const trimmedName = name.trim();
  const trimmedImageUrl = imageUrl.trim();
  const previewName = trimmedName || 'Equipo';
  const newPlayerName = newPlayer.name.trim();
  const confirmingPlayer = roster.find((player) => player.id === confirmingPlayerId);

  return (
    <section className={styles.page}>
      <div aria-hidden="true" className={styles.pitchDecoration} />

      <Link className={styles.backLink} to={`/tournaments/${tournamentId}/teams`}>
        <ArrowLeft aria-hidden="true" size={18} />
        Volver a equipos
      </Link>

      <header className={styles.hero}>
        <p className={styles.eyebrow}>Edición de equipo</p>
        <h1>
          Definí cómo se ve
          <span>{team.name}.</span>
        </h1>
        <p>{tournament.name}</p>
      </header>

      {canManageTeamIdentity ? (
        <form
          className={styles.formLayout}
          onSubmit={async (event) => {
            event.preventDefault();

            if (!trimmedName) {
              return;
            }

            setIsSubmitting(true);
            try {
              await sileo.promise(
                apiClient.updateTournamentTeam(team.id, {
                  name: trimmedName,
                  imageUrl: trimmedImageUrl || null,
                }),
                {
                  loading: { title: 'Guardando equipo...' },
                  success: { title: 'Equipo actualizado' },
                  error: { title: 'No se pudo actualizar el equipo' },
                },
              );

              setTeams((current) =>
                current.map((item) =>
                  item.id === team.id
                    ? { ...item, name: trimmedName, imageUrl: trimmedImageUrl || null }
                    : item,
                ),
              );
            } finally {
              setIsSubmitting(false);
            }
          }}
        >
          <div className={styles.formSections}>
            <section aria-labelledby="team-identity-title" className={styles.formCard}>
              <div className={styles.cardHeading}>
                <span aria-hidden="true" className={styles.cardIcon}>
                  <Shield size={22} />
                </span>
                <div>
                  <p className={styles.eyebrow}>Datos públicos</p>
                  <h2 id="team-identity-title">Identidad del equipo</h2>
                  <p>Estos datos aparecen en partidos, tablas y tarjetas del torneo.</p>
                </div>
              </div>

              <div className={styles.fieldsGrid}>
                <label>
                  Nombre
                  <input
                    disabled={isSubmitting}
                    maxLength={TEAM_NAME_MAX_LENGTH}
                    onChange={(event) => setName(event.target.value)}
                    required
                    value={name}
                  />
                </label>
              </div>
            </section>

            <section aria-labelledby="team-image-title" className={styles.formCard}>
              <div className={styles.cardHeading}>
                <span aria-hidden="true" className={styles.cardIcon}>
                  <Image size={22} />
                </span>
                <div>
                  <p className={styles.eyebrow}>Presentación visual</p>
                  <h2 id="team-image-title">Escudo o imagen</h2>
                  <p>Usá una URL para identificar al equipo. Si no carga, mostramos la inicial.</p>
                </div>
              </div>

              <div className={styles.fieldsGrid}>
                <label className={styles.fullField}>
                  URL de imagen
                  <input
                    aria-describedby="team-image-help"
                    disabled={isSubmitting}
                    onChange={(event) => setImageUrl(event.target.value)}
                    placeholder="https://..."
                    type="url"
                    value={imageUrl}
                  />
                  <span className={styles.fieldHint} id="team-image-help">
                    Campo opcional. Pegá un enlace público al escudo o foto del equipo.
                  </span>
                </label>
              </div>
            </section>
          </div>

          <aside className={styles.previewColumn}>
            <div className={styles.previewCard}>
              <div className={styles.previewTopline}>
                <span>Vista previa</span>
                <Eye aria-hidden="true" size={17} />
              </div>
              <div className={styles.previewBody}>
                <span className={styles.previewBadgeWrap}>
                  {trimmedImageUrl ? (
                    <img alt="" className={styles.previewImage} src={trimmedImageUrl} />
                  ) : (
                    <span className={styles.previewFallback}>{getTeamInitial(previewName)}</span>
                  )}
                </span>
                <p>Equipo de Liga</p>
                <h2>{previewName}</h2>
                <small>{trimmedImageUrl ? 'Imagen personalizada' : 'Inicial automática'}</small>
              </div>
            </div>

            <div className={styles.formActions}>
              <button
                className={styles.cancelButton}
                disabled={isSubmitting}
                onClick={() => navigate(`/tournaments/${tournamentId}/teams`)}
                type="button"
              >
                Cancelar
              </button>
              <button className={styles.saveButton} disabled={isSubmitting || !trimmedName} type="submit">
                <span>{isSubmitting ? 'Guardando...' : 'Guardar cambios'}</span>
                {isSubmitting ? (
                  <LoaderCircle aria-hidden="true" className={styles.spinner} size={20} />
                ) : (
                  <ArrowRight aria-hidden="true" size={20} />
                )}
              </button>
            </div>
          </aside>
        </form>
      ) : null}

      {isLigaTeamTournament ? (
        <section aria-labelledby="team-roster-title" className={styles.formSections}>
          <section className={styles.formCard}>
            <div className={styles.cardHeading}>
              <span aria-hidden="true" className={styles.cardIcon}>
                <Users size={22} />
              </span>
              <div>
                <p className={styles.eyebrow}>Plantel de Liga</p>
                <h2 id="team-roster-title">Jugadores de {team.name}</h2>
                <p>Gestioná este plantel sin cambiar los equipos de otros clubes.</p>
              </div>
            </div>

            {roster.length === 0 ? (
              <div className={styles.stateCard}>
                <Users aria-hidden="true" size={31} strokeWidth={1.6} />
                <h3>Este equipo todavía no tiene jugadores</h3>
                <p>Creá el primer perfil para compartir su código personal.</p>
              </div>
            ) : (
              <div className={styles.rosterCardsGrid}>
                {roster.map((player) => {
                  const displayName = player.nickname || player.name;
                  const canViewPlayer = canViewTeamRoster({
                    actorRole: permissions.role,
                    actorTournamentTeamId: actorRosterPlayer?.tournamentTeamId ?? null,
                    targetTournamentTeamId: player.tournamentTeamId,
                  });
                  const canEditPlayer = canEditTeamRosterPlayer({
                    actorRole: permissions.role,
                    actorTournamentTeamId: actorRosterPlayer?.tournamentTeamId ?? null,
                    targetTournamentTeamId: player.tournamentTeamId,
                  });

                  return (
                    <article className={styles.rosterPlayerCard} key={player.id}>
                      <div className={styles.rosterPlayerIdentity}>
                        <span className={styles.rosterAvatarWrap}>
                          <PlayerAvatar classNames={PREVIEW_AVATAR_CLASS_NAMES} player={player} />
                        </span>
                        <h3>{displayName}</h3>
                      </div>

                      <div className={styles.rosterCardActions}>
                        {canViewPlayer ? (
                          <Link
                            className={styles.rosterInfoAction}
                            to={`/tournaments/${tournamentId}/players/${player.id}`}
                          >
                            <span>Ver</span>
                            <ArrowUpRight aria-hidden="true" size={18} />
                          </Link>
                        ) : null}

                        {canEditPlayer ? (
                          <Link
                            aria-label={`Editar a ${displayName}`}
                            className={styles.rosterIconAction}
                            to={`/tournaments/${tournamentId}/players/${player.id}/edit`}
                          >
                            <Pencil aria-hidden="true" size={17} />
                          </Link>
                        ) : null}

                        {canDeleteRosterPlayers ? (
                          <button
                            aria-label={`Eliminar a ${displayName}`}
                            className={`${styles.rosterIconAction} ${styles.rosterDeleteAction}`}
                            disabled={deletingPlayerId === player.id}
                            onClick={() => setConfirmingPlayerId(player.id)}
                            type="button"
                          >
                            <Trash2 aria-hidden="true" size={17} />
                          </button>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {canAddRosterPlayers ? (
            <section aria-labelledby="add-roster-player-title" className={styles.formCard}>
              <div className={styles.cardHeading}>
                <span aria-hidden="true" className={styles.cardIcon}>
                  <UserRoundPlus size={22} />
                </span>
                <div>
                  <p className={styles.eyebrow}>Nuevo jugador</p>
                  <h2 id="add-roster-player-title">Sumá un jugador a {team.name}</h2>
                  <p>Creá el perfil y compartí el código personal para que lo reclame.</p>
                </div>
              </div>

              <form
                className={styles.formSections}
                onSubmit={async (event) => {
                  event.preventDefault();
                  if (!newPlayerName) {
                    return;
                  }

                  setIsAddingPlayer(true);
                  try {
                    const response = await sileo.promise(
                      apiClient.createTournamentTeamRosterPlayer(team.id, {
                        name: newPlayerName,
                        nickname: newPlayer.nickname.trim() || undefined,
                        imageUrl: newPlayer.imageUrl.trim() || undefined,
                        favoriteTeamSlug: newPlayer.favoriteTeamSlug || undefined,
                        ability: newPlayer.ability.trim() ? Number(newPlayer.ability) : undefined,
                        injury: newPlayer.injury.trim() || undefined,
                        misses: newPlayer.misses,
                      }),
                      {
                        loading: { title: 'Creando jugador...' },
                        success: { title: 'Jugador creado' },
                        error: { title: 'No se pudo crear el jugador' },
                      },
                    );
                    setRoster((current) => [...current, response.player]);
                    setCreatedClaimCode(response.claimCode);
                    setNewPlayer(emptyRosterPlayerForm());
                  } finally {
                    setIsAddingPlayer(false);
                  }
                }}
              >
                <RosterPlayerFields
                  canEditPrivateFields
                  disabled={isAddingPlayer}
                  form={newPlayer}
                  onChange={setNewPlayer}
                />

                {createdClaimCode ? (
                  <div className={styles.formCard}>
                    <div className={styles.cardHeading}>
                      <span aria-hidden="true" className={styles.cardIcon}>
                        <CheckCircle2 size={22} />
                      </span>
                      <div>
                        <p className={styles.eyebrow}>Código personal</p>
                        <h3>{createdClaimCode}</h3>
                        <p>Compartilo con el jugador para que reclame su perfil.</p>
                      </div>
                    </div>
                    <button
                      className={styles.cancelButton}
                      onClick={async () => {
                        await navigator.clipboard.writeText(createdClaimCode);
                        sileo.info({ title: 'Código copiado' });
                      }}
                      type="button"
                    >
                      <Clipboard aria-hidden="true" size={18} />
                      Copiar código
                    </button>
                  </div>
                ) : null}

                <button className={styles.saveButton} disabled={isAddingPlayer || !newPlayerName} type="submit">
                  <span>{isAddingPlayer ? 'Creando jugador...' : 'Crear jugador'}</span>
                  {isAddingPlayer ? (
                    <LoaderCircle aria-hidden="true" className={styles.spinner} size={20} />
                  ) : (
                    <ArrowRight aria-hidden="true" size={20} />
                  )}
                </button>
              </form>
            </section>
          ) : null}
        </section>
      ) : null}

      {confirmingPlayer ? (
        <ConfirmModal
          confirmText="Eliminar"
          isConfirming={deletingPlayerId === confirmingPlayer.id}
          message={`Esta acción elimina a ${confirmingPlayer.nickname || confirmingPlayer.name} del plantel.`}
          onCancel={() => setConfirmingPlayerId(null)}
          onConfirm={async () => {
            setDeletingPlayerId(confirmingPlayer.id);
            try {
              await sileo.promise(apiClient.removeTournamentTeamRosterPlayer(team.id, confirmingPlayer.id), {
                loading: { title: 'Eliminando jugador...' },
                success: { title: 'Jugador eliminado' },
                error: { title: 'No se pudo eliminar el jugador' },
              });
              setRoster((current) => current.filter((player) => player.id !== confirmingPlayer.id));
              setConfirmingPlayerId(null);
            } finally {
              setDeletingPlayerId(null);
            }
          }}
          title="Confirmar eliminación"
        />
      ) : null}
    </section>
  );
}

function RosterPlayerFields({
  canEditPrivateFields,
  disabled,
  form,
  onChange,
}: {
  canEditPrivateFields: boolean;
  disabled: boolean;
  form: RosterPlayerFormState;
  onChange: (form: RosterPlayerFormState) => void;
}) {
  return (
    <>
      <div className={styles.fieldsGrid}>
        <label>
          Nombre
          <input
            disabled={disabled}
            maxLength={PLAYER_NAME_MAX_LENGTH}
            onChange={(event) => onChange({ ...form, name: event.target.value })}
            required
            value={form.name}
          />
        </label>
        <label>
          Apodo
          <input
            disabled={disabled}
            maxLength={PLAYER_NAME_MAX_LENGTH}
            onChange={(event) => onChange({ ...form, nickname: event.target.value })}
            value={form.nickname}
          />
        </label>
        <label className={styles.fullField}>
          Foto de perfil
          <input
            disabled={disabled}
            onChange={(event) => onChange({ ...form, imageUrl: event.target.value })}
            placeholder="https://..."
            type="url"
            value={form.imageUrl}
          />
        </label>
        <label>
          Equipo favorito
          <select
            disabled={disabled}
            onChange={(event) => onChange({ ...form, favoriteTeamSlug: event.target.value })}
            value={form.favoriteTeamSlug}
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
          Preferencia de visualización
          <select
            disabled={disabled}
            onChange={(event) =>
              onChange({ ...form, displayPreference: event.target.value as DisplayPreference })
            }
            value={form.displayPreference}
          >
            <option value={DisplayPreference.IMAGE}>Foto de perfil</option>
            <option value={DisplayPreference.FAVORITE_TEAM}>Equipo favorito</option>
          </select>
        </label>
      </div>

      {canEditPrivateFields ? (
        <div className={styles.fieldsGrid}>
          <label>
            Habilidad
            <span>
              <Activity aria-hidden="true" size={17} />
              <input
                disabled={disabled}
                max={10}
                min={1}
                onChange={(event) => onChange({ ...form, ability: event.target.value })}
                type="number"
                value={form.ability}
              />
            </span>
            <span className={styles.fieldHint}>Valor interno entre 1 y 10.</span>
          </label>
          <label>
            Lesión
            <span>
              <HeartPulse aria-hidden="true" size={17} />
              <input
                disabled={disabled}
                onChange={(event) => onChange({ ...form, injury: event.target.value })}
                placeholder="Sin lesión"
                value={form.injury}
              />
            </span>
          </label>
          <label>
            Faltas
            <span>
              <Clock3 aria-hidden="true" size={17} />
              <input
                disabled={disabled}
                min={0}
                onChange={(event) => onChange({ ...form, misses: Number(event.target.value) })}
                required
                type="number"
                value={form.misses}
              />
            </span>
          </label>
        </div>
      ) : null}
    </>
  );
}
