import type { PlayerContract } from '@shared/contracts';
import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { sileo } from 'sileo';
import { apiClient } from '../../api/client';
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
  const { data } = useAppContext();
  const [requests, setRequests] = useState<JoinRequestItem[]>([]);
  const [players, setPlayers] = useState<PlayerContract[]>([]);
  const [selectedPlayerByRequestId, setSelectedPlayerByRequestId] = useState<Record<string, string>>({});
  const [linkingRequestId, setLinkingRequestId] = useState<string | null>(null);

  const tournament = data.tournaments.find((item) => item.id === tournamentId);

  useEffect(() => {
    if (!tournamentId) {
      return;
    }

    void Promise.all([
      apiClient.getTournamentJoinRequests(tournamentId),
      apiClient.getPlayers(tournamentId),
    ]).then(([joinRequests, tournamentPlayers]) => {
      setRequests(joinRequests);
      setPlayers(tournamentPlayers.filter((player) => !player.userId));
    });
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

      {requests.length === 0 ? <p className={styles.meta}>No hay solicitudes pendientes.</p> : null}

      <div className={styles.requestsList}>
        {requests.map((request) => (
          <article className={styles.requestCard} key={request.id}>
            <div>
              <h3>{request.user.name}</h3>
              <p className={styles.meta}>{request.user.email}</p>
            </div>

            <div className={styles.actions}>
              <select
                onChange={(event) =>
                  setSelectedPlayerByRequestId((prev) => ({
                    ...prev,
                    [request.id]: event.target.value,
                  }))
                }
                value={selectedPlayerByRequestId[request.id] ?? ''}
              >
                <option value="">Seleccionar invitado</option>
                {players.map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.nickname ?? player.name}
                  </option>
                ))}
              </select>

              <button
                className={buttonStyles.primary}
                disabled={linkingRequestId === request.id}
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
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
