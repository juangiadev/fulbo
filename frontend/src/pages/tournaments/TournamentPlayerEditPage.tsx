import { DisplayPreference, PlayerRole } from '@shared/enums';
import type { PlayerContract } from '@shared/contracts';
import { FAVORITE_TEAMS } from '@shared/favorite-teams';
import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { sileo } from 'sileo';
import { apiClient } from '../../api/client';
import { useAppContext } from '../../state/AppContext';
import buttonStyles from '../../styles/Button.module.css';
import styles from './TournamentPlayerEditPage.module.css';

export function TournamentPlayerEditPage() {
  const navigate = useNavigate();
  const { tournamentId, playerId } = useParams();
  const { currentUser, getMyRole, loadTournaments } = useAppContext();
  const [players, setPlayers] = useState<PlayerContract[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [favoriteTeamSlug, setFavoriteTeamSlug] = useState('');
  const [displayPreference, setDisplayPreference] = useState<DisplayPreference>(DisplayPreference.IMAGE);
  const [playerRole, setPlayerRole] = useState<PlayerRole>(PlayerRole.USER);
  const [ability, setAbility] = useState('');
  const [injury, setInjury] = useState('');
  const [misses, setMisses] = useState<number>(0);

  const role = tournamentId ? getMyRole(tournamentId) : null;
  const isAdmin = [PlayerRole.OWNER, PlayerRole.ADMIN].includes(role ?? PlayerRole.USER);

  useEffect(() => {
    if (!tournamentId) {
      return;
    }

    void apiClient.getPlayers(tournamentId).then(setPlayers);
  }, [tournamentId]);

  const player = useMemo(() => players.find((item) => item.id === playerId), [players, playerId]);
  const myPlayer = useMemo(
    () => players.find((item) => item.userId === currentUser.id) ?? null,
    [players, currentUser.id],
  );

  useEffect(() => {
    if (!player) {
      return;
    }

    setName(player.name);
    setNickname(player.nickname ?? '');
    setFavoriteTeamSlug(player.favoriteTeamSlug ?? '');
    setDisplayPreference(player.displayPreference);
    setPlayerRole(player.role);
    setAbility(player.ability?.toString() ?? '');
    setInjury(player.injury ?? '');
    setMisses(player.misses);
  }, [player]);

  if (!tournamentId || !playerId) {
    return <Navigate replace to="/tournaments" />;
  }

  if (players.length > 0 && !player) {
    return <Navigate replace to={`/tournaments/${tournamentId}/players`} />;
  }

  if (!player) {
    return null;
  }

  const canEditThisPlayer = isAdmin || player.userId === currentUser.id;
  const canAssignOwner = role === PlayerRole.OWNER && myPlayer?.id !== player.id;
  if (!canEditThisPlayer) {
    return <Navigate replace to={`/tournaments/${tournamentId}/players`} />;
  }

  return (
    <section className={styles.section}>
      <div className={styles.headerRow}>
        <h2>Editar jugador</h2>
        <Link className={buttonStyles.ghost} to={`/tournaments/${tournamentId}/players`}>
          Volver
        </Link>
      </div>

      <form
        className={styles.form}
        onSubmit={async (event) => {
          event.preventDefault();
          setIsSubmitting(true);
          try {
            const payload: Partial<PlayerContract> = {
              name: name.trim(),
              nickname: nickname.trim() || null,
              favoriteTeamSlug: favoriteTeamSlug || null,
              displayPreference,
            };

            if (isAdmin) {
              payload.ability = ability.trim() ? Number(ability) : null;
              payload.injury = injury.trim() || null;
              payload.misses = misses;
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
        <label>
          Nombre
          <input onChange={(event) => setName(event.target.value)} required value={name} />
        </label>

        <label>
          Apodo
          <input onChange={(event) => setNickname(event.target.value)} value={nickname} />
        </label>

        <label>
          Equipo favorito
          <select onChange={(event) => setFavoriteTeamSlug(event.target.value)} value={favoriteTeamSlug}>
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

        {isAdmin ? (
          <>
            <label>
              Rol
              <select onChange={(event) => setPlayerRole(event.target.value as PlayerRole)} value={playerRole}>
                <option value={PlayerRole.USER}>Usuario</option>
                <option value={PlayerRole.ADMIN}>Admin</option>
                {canAssignOwner ? <option value={PlayerRole.OWNER}>Owner</option> : null}
              </select>
            </label>

            <label>
              Habilidad
                <input
                  max={10}
                  min={1}
                  onChange={(event) => setAbility(event.target.value)}
                  type="number"
                  value={ability}
                />
            </label>

            <label>
              Lesion
              <input onChange={(event) => setInjury(event.target.value)} value={injury} />
            </label>

            <label>
              Faltas
              <input
                min={0}
                onChange={(event) => setMisses(Number(event.target.value))}
                required
                type="number"
                value={misses}
              />
            </label>
          </>
        ) : null}

        <div className={styles.actions}>
          <button
            className={buttonStyles.ghost}
            disabled={isSubmitting}
            onClick={() => navigate(`/tournaments/${tournamentId}/players`)}
            type="button"
          >
            Cancelar
          </button>
          <button className={buttonStyles.primary} disabled={isSubmitting} type="submit">
            Guardar
          </button>
        </div>
      </form>
    </section>
  );
}
