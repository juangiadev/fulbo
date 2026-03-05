import { PlayerRole } from '@shared/enums';
import type { PlayerContract } from '@shared/contracts';
import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { sileo } from 'sileo';
import { apiClient } from '../../api/client';
import { ContentSpinner } from '../../components/ContentSpinner';
import { useAppContext } from '../../state/AppContext';
import buttonStyles from '../../styles/Button.module.css';
import styles from './TournamentJoinRequestsPage.module.css';

interface JoinRequestItem {
  id: string;
  userId: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
}

export function TournamentJoinRequestsPage() {
  const { tournamentId } = useParams();
  const { data, getMyRole } = useAppContext();
  const [requests, setRequests] = useState<JoinRequestItem[]>([]);
  const [players, setPlayers] = useState<PlayerContract[]>([]);
  const [selectedPlayerByRequestId, setSelectedPlayerByRequestId] = useState<Record<string, string>>({});
  const [playerQueryByRequestId, setPlayerQueryByRequestId] = useState<Record<string, string>>({});
  const [linkingRequestId, setLinkingRequestId] = useState<string | null>(null);
  const [deletingRequestId, setDeletingRequestId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const tournament = data.tournaments.find((item) => item.id === tournamentId);
  const role = tournamentId ? getMyRole(tournamentId) : null;
  const isOwner = role === PlayerRole.OWNER;

  useEffect(() => {
    if (!tournamentId) {
      return;
    }

    let isActive = true;
    setIsLoading(true);
    void Promise.all([
      apiClient.getTournamentJoinRequests(tournamentId),
      apiClient.getPlayers(tournamentId),
    ])
      .then(([joinRequests, tournamentPlayers]) => {
        if (!isActive) {
          return;
        }
        setRequests(joinRequests);
        setPlayers(tournamentPlayers.filter((player) => !player.userId));
      })
      .catch(() => {
        if (!isActive) {
          return;
        }
        sileo.error({ title: 'No se pudieron cargar las solicitudes' });
      })
      .finally(() => {
        if (!isActive) {
          return;
        }
        setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [tournamentId]);

  if (!tournamentId || !tournament) {
    return <Navigate replace to="/tournaments" />;
  }

  return (
    <section className={styles.section}>
      <div className={styles.headerRow}>
        <h2>Solicitudes pendientes</h2>
        <Link className={buttonStyles.ghost} to={`/tournaments/${tournamentId}/players`}>
          Volver
        </Link>
      </div>

      {!isLoading && requests.length === 0 ? (
        <p className={styles.meta}>No hay solicitudes pendientes.</p>
      ) : null}

      <div className={styles.requestsList}>
        {isLoading ? (
          <ContentSpinner />
        ) : (
          requests.map((request) => (
            <article className={styles.requestCard} key={request.id}>
              <div>
                <h3>{request.user.name}</h3>
                <p className={styles.meta}>{request.user.email}</p>
              </div>

              <div className={styles.actions}>
                {(() => {
                  const query = playerQueryByRequestId[request.id] ?? '';
                  const filteredPlayers = players
                    .filter((player) => {
                      if (!query.trim()) {
                        return true;
                      }

                      const label = `${player.nickname ?? ''} ${player.name}`
                        .toLowerCase()
                        .trim();
                      return label.includes(query.toLowerCase().trim());
                    })
                    .slice(0, 8);

                  const selectedPlayer = players.find(
                    (player) => player.id === selectedPlayerByRequestId[request.id],
                  );

                  return (
                    <>
                      <input
                        className={styles.playerSearchInput}
                        onChange={(event) => {
                          const nextQuery = event.target.value;
                          setPlayerQueryByRequestId((prev) => ({
                            ...prev,
                            [request.id]: nextQuery,
                          }));
                          setSelectedPlayerByRequestId((prev) => ({
                            ...prev,
                            [request.id]: '',
                          }));
                        }}
                        placeholder="Buscar invitado para vincular"
                        value={query}
                      />

                      {query.trim() ? (
                        <div className={styles.playerMatches}>
                          {filteredPlayers.length > 0 ? (
                            filteredPlayers.map((player) => {
                              const label = player.nickname ?? player.name;
                              return (
                                <button
                                  className={styles.playerMatchOption}
                                  key={player.id}
                                  onClick={() => {
                                    setSelectedPlayerByRequestId((prev) => ({
                                      ...prev,
                                      [request.id]: player.id,
                                    }));
                                    setPlayerQueryByRequestId((prev) => ({
                                      ...prev,
                                      [request.id]: label,
                                    }));
                                  }}
                                  type="button"
                                >
                                  {label}
                                </button>
                              );
                            })
                          ) : (
                            <p className={styles.playerSearchHint}>No hay invitados que coincidan.</p>
                          )}
                        </div>
                      ) : null}

                      {selectedPlayer && !query.trim() ? (
                        <p className={styles.playerSearchHint}>
                          Seleccionado: {selectedPlayer.nickname ?? selectedPlayer.name}
                        </p>
                      ) : null}
                    </>
                  );
                })()}

                <div className={styles.actionButtons}>
                  <button
                    className={buttonStyles.primary}
                    disabled={linkingRequestId === request.id || deletingRequestId === request.id}
                    onClick={async () => {
                      const playerId = selectedPlayerByRequestId[request.id];
                      if (!playerId) {
                        sileo.warning({ title: 'Selecciona un invitado para vincular' });
                        return;
                      }

                      setLinkingRequestId(request.id);
                      try {
                        await sileo.promise(apiClient.linkJoinRequest(tournamentId, request.id, { playerId }), {
                          loading: { title: 'Vinculando solicitud...' },
                          success: { title: 'Solicitud vinculada con exito' },
                          error: { title: 'No se pudo vincular la solicitud' },
                        });

                        const [joinRequests, tournamentPlayers] = await Promise.all([
                          apiClient.getTournamentJoinRequests(tournamentId),
                          apiClient.getPlayers(tournamentId),
                        ]);
                        setRequests(joinRequests);
                        setPlayers(tournamentPlayers.filter((player) => !player.userId));
                      } finally {
                        setLinkingRequestId(null);
                      }
                    }}
                    type="button"
                  >
                    Vincular
                  </button>

                  {isOwner ? (
                    <button
                      className={buttonStyles.ghost}
                      disabled={deletingRequestId === request.id || linkingRequestId === request.id}
                      onClick={async () => {
                        setDeletingRequestId(request.id);
                        try {
                          await sileo.promise(apiClient.removeJoinRequest(tournamentId, request.id), {
                            loading: { title: 'Eliminando solicitud...' },
                            success: { title: 'Solicitud eliminada' },
                            error: { title: 'No se pudo eliminar la solicitud' },
                          });

                          const [joinRequests, tournamentPlayers] = await Promise.all([
                            apiClient.getTournamentJoinRequests(tournamentId),
                            apiClient.getPlayers(tournamentId),
                          ]);
                          setRequests(joinRequests);
                          setPlayers(tournamentPlayers.filter((player) => !player.userId));
                        } finally {
                          setDeletingRequestId(null);
                        }
                      }}
                      type="button"
                    >
                      Eliminar
                    </button>
                  ) : null}
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
