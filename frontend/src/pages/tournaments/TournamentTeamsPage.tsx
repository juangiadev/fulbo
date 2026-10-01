import type { TournamentTeamContract } from '@shared/contracts';
import { TournamentType } from '@shared/enums';
import { ArrowLeft, Pencil, Plus, ShieldAlert, Trash2, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { sileo } from 'sileo';
import { apiClient } from '../../api/client';
import { ConfirmModal } from '../../components/ConfirmModal';
import { useTournamentPermissions } from '../../hooks/useTournamentPermissions';
import { useAppContext } from '../../state/AppContext';
import styles from './TournamentTeamsPage.module.css';

const TEAM_NAME_MAX_LENGTH = 120;

export function TournamentTeamsPage() {
  const { tournamentId } = useParams();
  const { data } = useAppContext();
  const [teams, setTeams] = useState<TournamentTeamContract[]>([]);
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasLoadError, setHasLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [deletingTeamId, setDeletingTeamId] = useState<string | null>(null);
  const [confirmingTeamId, setConfirmingTeamId] = useState<string | null>(null);

  const tournament = data.tournaments.find((item) => item.id === tournamentId);
  const permissions = useTournamentPermissions(tournamentId);
  const trimmedName = name.trim();

  useEffect(() => {
    if (!tournamentId || tournament?.type !== TournamentType.TEAMS) {
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
      .getTournamentTeams(tournamentId)
      .then((nextTeams) => {
        if (!cancelled) {
          setTeams(nextTeams);
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
  }, [reloadKey, tournament?.type, tournamentId]);

  if (!tournamentId || !tournament || tournament.type !== TournamentType.TEAMS) {
    return <Navigate replace to={tournamentId ? `/tournaments/${tournamentId}` : '/tournaments'} />;
  }

  const confirmingTeam = teams.find((team) => team.id === confirmingTeamId);

  return (
    <section className={styles.page}>
      <Link className={styles.backLink} to={`/tournaments/${tournamentId}`}>
        <ArrowLeft aria-hidden="true" size={18} />
        Volver al torneo
      </Link>

      <header className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>Equipos del torneo</p>
          <h1>
            Armá los equipos de
            <span>{tournament.name}</span>
          </h1>
          <p>Gestioná los nombres de los equipos que van a competir. Los planteles llegan más adelante.</p>
        </div>
      </header>

      {permissions.canManagePlayers ? (
        <section aria-labelledby="create-team-title" className={styles.managementPanel}>
          <div>
            <p className={styles.eyebrow}>Nuevo equipo</p>
            <h2 id="create-team-title">Sumá un equipo al torneo</h2>
          </div>
          <form
            className={styles.createForm}
            onSubmit={async (event) => {
              event.preventDefault();
              if (!trimmedName) {
                return;
              }

              setIsSaving(true);
              try {
                const created = await sileo.promise(
                  apiClient.createTournamentTeam(tournamentId, { name: trimmedName }),
                  {
                    loading: { title: 'Creando equipo...' },
                    success: { title: 'Equipo creado' },
                    error: { title: 'No se pudo crear el equipo' },
                  },
                );
                setTeams((current) => [...current, created]);
                setName('');
              } finally {
                setIsSaving(false);
              }
            }}
          >
            <label className={styles.srOnly} htmlFor="team-name">
              Nombre del equipo
            </label>
            <input
              disabled={isSaving}
              id="team-name"
              maxLength={TEAM_NAME_MAX_LENGTH}
              onChange={(event) => setName(event.target.value)}
              placeholder="Nombre del equipo"
              required
              value={name}
            />
            <button disabled={isSaving || !trimmedName} type="submit">
              <Plus aria-hidden="true" size={18} />
              Crear equipo
            </button>
          </form>
        </section>
      ) : null}

      <section aria-labelledby="team-list-title" className={styles.teamSection}>
        <div>
          <p className={styles.eyebrow}>Listado</p>
          <h2 id="team-list-title">Equipos registrados</h2>
        </div>

        {isLoading ? (
          <div aria-busy="true" className={styles.stateCard}>
            <Users aria-hidden="true" size={30} strokeWidth={1.6} />
            <p>Cargando equipos...</p>
          </div>
        ) : hasLoadError ? (
          <div className={styles.stateCard}>
            <ShieldAlert aria-hidden="true" size={30} strokeWidth={1.6} />
            <h3>No pudimos cargar los equipos</h3>
            <p>Revisá tu conexión e intentá nuevamente.</p>
            <button onClick={() => setReloadKey((value) => value + 1)} type="button">
              Reintentar
            </button>
          </div>
        ) : teams.length === 0 ? (
          <div className={styles.stateCard}>
            <Users aria-hidden="true" size={30} strokeWidth={1.6} />
            <h3>Todavía no hay equipos</h3>
            <p>Creá el primer equipo para empezar a preparar la competencia.</p>
          </div>
        ) : (
          <div className={styles.teamGrid}>
            {teams.map((team) => (
              <article className={styles.teamCard} key={team.id}>
                <div className={styles.teamIdentity}>
                  <span className={styles.badge}>
                    {team.imageUrl ? (
                      <img alt="" className={styles.teamImage} src={team.imageUrl} />
                    ) : (
                      team.name.slice(0, 1).toUpperCase()
                    )}
                  </span>
                  <div>
                    <h3>{team.name}</h3>
                    <p>Creado el {new Date(team.createdAt).toLocaleDateString('es-AR')}</p>
                  </div>
                </div>

                {permissions.canManagePlayers ? (
                  <div className={styles.teamActions}>
                    <Link to={`/tournaments/${tournamentId}/teams/${team.id}/edit`}>
                      <Pencil aria-hidden="true" size={16} />
                      Editar
                    </Link>
                    <button
                      className={styles.dangerButton}
                      disabled={deletingTeamId === team.id}
                      onClick={() => setConfirmingTeamId(team.id)}
                      type="button"
                    >
                      <Trash2 aria-hidden="true" size={16} />
                      Eliminar
                    </button>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>

      {confirmingTeam ? (
        <ConfirmModal
          confirmText="Eliminar"
          isConfirming={deletingTeamId === confirmingTeam.id}
          message={`Esta acción elimina a ${confirmingTeam.name} del torneo.`}
          onCancel={() => setConfirmingTeamId(null)}
          onConfirm={async () => {
            setDeletingTeamId(confirmingTeam.id);
            try {
              await sileo.promise(apiClient.removeTournamentTeam(confirmingTeam.id), {
                loading: { title: 'Eliminando equipo...' },
                success: { title: 'Equipo eliminado' },
                error: { title: 'No se pudo eliminar el equipo' },
              });
              setTeams((current) => current.filter((team) => team.id !== confirmingTeam.id));
              setConfirmingTeamId(null);
            } finally {
              setDeletingTeamId(null);
            }
          }}
          title="Confirmar eliminación"
        />
      ) : null}
    </section>
  );
}
