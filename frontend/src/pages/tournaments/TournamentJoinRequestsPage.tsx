import type { PlayerContract } from '@shared/contracts';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  LoaderCircle,
  Mail,
  Search,
  Trash2,
  UserRoundPlus,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { sileo } from 'sileo';
import { apiClient } from '../../api/client';
import { PlayerAvatar } from '../../components/PlayerAvatar';
import { useTournamentPermissions } from '../../hooks/useTournamentPermissions';
import { useAppContext } from '../../state/AppContext';
import styles from './TournamentJoinRequestsPage.module.css';

interface JoinRequestUser {
  id: string;
  name: string;
  email: string;
}

interface JoinRequestItem {
  id: string;
  userId: string;
  user: JoinRequestUser;
  createdAt: string;
}

interface JoinRequestsData {
  requests: JoinRequestItem[];
  players: PlayerContract[];
}

const PLAYER_AVATAR_CLASS_NAMES = {
  avatar: styles.playerAvatar,
  avatarFallback: styles.playerAvatarFallback,
  avatarTeam: styles.playerAvatarTeam,
};

async function loadJoinRequestsData(tournamentId: string): Promise<JoinRequestsData> {
  const [requests, tournamentPlayers] = await Promise.all([
    apiClient.getTournamentJoinRequests(tournamentId),
    apiClient.getPlayers(tournamentId),
  ]);

  return {
    requests,
    players: tournamentPlayers.filter((player) => !player.userId),
  };
}

export function TournamentJoinRequestsPage() {
  const { tournamentId } = useParams();
  const { data } = useAppContext();
  const [requests, setRequests] = useState<JoinRequestItem[]>([]);
  const [players, setPlayers] = useState<PlayerContract[]>([]);
  const [selectedPlayerByRequestId, setSelectedPlayerByRequestId] = useState<Record<string, string>>({});
  const [playerQueryByRequestId, setPlayerQueryByRequestId] = useState<Record<string, string>>({});
  const [linkingRequestId, setLinkingRequestId] = useState<string | null>(null);
  const [deletingRequestId, setDeletingRequestId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadError, setHasLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const tournament = data.tournaments.find((item) => item.id === tournamentId);
  const permissions = useTournamentPermissions(tournamentId);
  const isBusy = Boolean(linkingRequestId || deletingRequestId);

  useEffect(() => {
    if (!tournamentId || !permissions.canManageJoinRequests) {
      return;
    }

    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        setIsLoading(true);
        setHasLoadError(false);
      }
    });

    void loadJoinRequestsData(tournamentId)
      .then((result) => {
        if (!cancelled) {
          setRequests(result.requests);
          setPlayers(result.players);
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
  }, [permissions.canManageJoinRequests, reloadKey, tournamentId]);

  if (!tournamentId || !tournament) {
    return <Navigate replace to="/tournaments" />;
  }

  if (!permissions.canManageJoinRequests) {
    return <Navigate replace to={`/tournaments/${tournamentId}/players`} />;
  }

  return (
    <section className={styles.page}>
      <div aria-hidden="true" className={styles.pitchDecoration} />

      <Link className={styles.backLink} to={`/tournaments/${tournamentId}/players`}>
        <ArrowLeft aria-hidden="true" size={18} />
        Volver al plantel
      </Link>

      <header className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>Puerta del vestuario</p>
          <h1>
            Decidí quién entra a
            <span>{tournament.name}.</span>
          </h1>
          <p>Vinculá cada solicitud con el jugador invitado que le corresponde.</p>
        </div>

        <dl className={styles.requestStats}>
          <div>
            <dt>Solicitudes</dt>
            <dd>{isLoading ? '–' : requests.length.toString().padStart(2, '0')}</dd>
          </div>
          <div>
            <dt>Invitados libres</dt>
            <dd>{isLoading ? '–' : players.length.toString().padStart(2, '0')}</dd>
          </div>
        </dl>
      </header>

      <section aria-labelledby="requests-title" className={styles.requestsSection}>
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>En revisión</p>
            <h2 id="requests-title">Solicitudes pendientes</h2>
          </div>
          <Link className={styles.addGuestLink} to={`/tournaments/${tournamentId}/invite-guest`}>
            <UserRoundPlus aria-hidden="true" size={18} />
            Crear invitado
          </Link>
        </div>

        {isLoading ? (
          <div aria-busy="true" className={styles.requestsList}>
            {[0, 1].map((item) => (
              <article className={`${styles.requestCard} ${styles.loadingCard}`} key={item}>
                <span aria-hidden="true" className={styles.loadingAvatar} />
                <span aria-hidden="true" className={styles.loadingLine} />
              </article>
            ))}
            <span className={styles.srOnly} role="status">
              Cargando solicitudes...
            </span>
          </div>
        ) : hasLoadError ? (
          <div className={styles.stateCard}>
            <Users aria-hidden="true" size={31} strokeWidth={1.6} />
            <h3>No pudimos cargar las solicitudes</h3>
            <p>Revisá tu conexión e intentá nuevamente.</p>
            <button onClick={() => setReloadKey((value) => value + 1)} type="button">
              Reintentar
            </button>
          </div>
        ) : requests.length === 0 ? (
          <div className={styles.stateCard}>
            <CheckCircle2 aria-hidden="true" size={31} strokeWidth={1.6} />
            <h3>El vestuario está al día</h3>
            <p>No hay solicitudes esperando aprobación.</p>
          </div>
        ) : (
          <div className={styles.requestsList}>
            {requests.map((request) => {
              const query = playerQueryByRequestId[request.id] ?? '';
              const selectedPlayer = players.find(
                (player) => player.id === selectedPlayerByRequestId[request.id],
              );
              const filteredPlayers = players
                .filter((player) => {
                  const label = `${player.nickname ?? ''} ${player.name}`.toLowerCase().trim();
                  return label.includes(query.toLowerCase().trim());
                })
                .slice(0, 8);

              return (
                <article className={styles.requestCard} key={request.id}>
                  <div className={styles.requester}>
                    <span aria-hidden="true" className={styles.requesterAvatar}>
                      {request.user.name.slice(0, 1).toUpperCase()}
                    </span>
                    <div>
                      <span className={styles.pendingBadge}>Solicitud pendiente</span>
                      <h3>{request.user.name}</h3>
                      <p>
                        <Mail aria-hidden="true" size={14} />
                        {request.user.email}
                      </p>
                      <time dateTime={request.createdAt}>
                        Recibida el {new Date(request.createdAt).toLocaleDateString('es-AR')}
                      </time>
                    </div>
                  </div>

                  <div className={styles.matchingPanel}>
                    <div className={styles.matchingHeading}>
                      <div>
                        <p className={styles.eyebrow}>Asignación</p>
                        <h4>Vincular con un invitado</h4>
                      </div>
                      <span>{players.length} disponibles</span>
                    </div>

                    {selectedPlayer ? (
                      <div className={styles.selectedPlayer}>
                        <span className={styles.playerAvatarWrap}>
                          <PlayerAvatar classNames={PLAYER_AVATAR_CLASS_NAMES} player={selectedPlayer} />
                        </span>
                        <div>
                          <span>Jugador seleccionado</span>
                          <strong>{selectedPlayer.nickname || selectedPlayer.name}</strong>
                        </div>
                        <button
                          aria-label="Cambiar jugador seleccionado"
                          disabled={isBusy}
                          onClick={() => {
                            setSelectedPlayerByRequestId((previous) => ({
                              ...previous,
                              [request.id]: '',
                            }));
                          }}
                          type="button"
                        >
                          <X aria-hidden="true" size={17} />
                        </button>
                      </div>
                    ) : players.length > 0 ? (
                      <div className={styles.playerSearch}>
                        <label>
                          <Search aria-hidden="true" size={18} />
                          <span className={styles.srOnly}>Buscar invitado para vincular</span>
                          <input
                            disabled={isBusy}
                            onChange={(event) => {
                              const nextQuery = event.target.value;
                              setPlayerQueryByRequestId((previous) => ({
                                ...previous,
                                [request.id]: nextQuery,
                              }));
                            }}
                            placeholder="Buscar por nombre o apodo"
                            type="search"
                            value={query}
                          />
                        </label>

                        {query.trim() ? (
                          <div className={styles.playerMatches}>
                            {filteredPlayers.length > 0 ? (
                              filteredPlayers.map((player) => (
                                <button
                                  className={styles.playerMatchOption}
                                  disabled={isBusy}
                                  key={player.id}
                                  onClick={() => {
                                    setSelectedPlayerByRequestId((previous) => ({
                                      ...previous,
                                      [request.id]: player.id,
                                    }));
                                    setPlayerQueryByRequestId((previous) => ({
                                      ...previous,
                                      [request.id]: '',
                                    }));
                                  }}
                                  type="button"
                                >
                                  <span className={styles.optionAvatar}>
                                    <PlayerAvatar classNames={PLAYER_AVATAR_CLASS_NAMES} player={player} />
                                  </span>
                                  <span>
                                    <strong>{player.nickname || player.name}</strong>
                                    {player.nickname ? <small>{player.name}</small> : null}
                                  </span>
                                  <ArrowRight aria-hidden="true" size={17} />
                                </button>
                              ))
                            ) : (
                              <p className={styles.searchHint}>No hay invitados que coincidan.</p>
                            )}
                          </div>
                        ) : (
                          <p className={styles.searchHint}>Escribí para buscar entre los invitados sin vincular.</p>
                        )}
                      </div>
                    ) : (
                      <div className={styles.noPlayersState}>
                        <UserRoundPlus aria-hidden="true" size={20} />
                        <span>Primero necesitás crear un jugador invitado.</span>
                      </div>
                    )}

                    <div className={styles.actionButtons}>
                      <button
                        className={styles.linkButton}
                        disabled={isBusy || !selectedPlayer}
                        onClick={async () => {
                          const playerId = selectedPlayerByRequestId[request.id];
                          if (!playerId) {
                            return;
                          }

                          setLinkingRequestId(request.id);
                          try {
                            await sileo.promise(
                              apiClient.linkJoinRequest(tournamentId, request.id, { playerId }),
                              {
                                loading: { title: 'Vinculando solicitud...' },
                                success: { title: 'Solicitud vinculada con éxito' },
                                error: { title: 'No se pudo vincular la solicitud' },
                              },
                            );
                            const result = await loadJoinRequestsData(tournamentId);
                            setRequests(result.requests);
                            setPlayers(result.players);
                          } finally {
                            setLinkingRequestId(null);
                          }
                        }}
                        type="button"
                      >
                        <span>{linkingRequestId === request.id ? 'Vinculando...' : 'Vincular jugador'}</span>
                        {linkingRequestId === request.id ? (
                          <LoaderCircle aria-hidden="true" className={styles.spinner} size={19} />
                        ) : (
                          <ArrowRight aria-hidden="true" size={19} />
                        )}
                      </button>

                      {permissions.canDeleteJoinRequests ? (
                        <button
                          aria-label={`Eliminar solicitud de ${request.user.name}`}
                          className={styles.deleteButton}
                          disabled={isBusy}
                          onClick={async () => {
                            setDeletingRequestId(request.id);
                            try {
                              await sileo.promise(apiClient.removeJoinRequest(tournamentId, request.id), {
                                loading: { title: 'Eliminando solicitud...' },
                                success: { title: 'Solicitud eliminada' },
                                error: { title: 'No se pudo eliminar la solicitud' },
                              });
                              const result = await loadJoinRequestsData(tournamentId);
                              setRequests(result.requests);
                              setPlayers(result.players);
                            } finally {
                              setDeletingRequestId(null);
                            }
                          }}
                          type="button"
                        >
                          {deletingRequestId === request.id ? (
                            <LoaderCircle aria-hidden="true" className={styles.spinner} size={18} />
                          ) : (
                            <Trash2 aria-hidden="true" size={18} />
                          )}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </section>
  );
}
