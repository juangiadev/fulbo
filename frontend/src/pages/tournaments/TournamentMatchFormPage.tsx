import { PlayerRole } from "@shared/enums";
import type {
  MatchContract,
  PlayerContract,
  TeamContract,
} from "@shared/contracts";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { sileo } from "sileo";
import {
  MatchPlayersTableBuilder,
  type MatchPlayersTableBuilderRef,
  type MatchPlayersTableTemplateConfig,
} from "../../components/MatchPlayersTableBuilder";
import { DateTimePicker } from "../../components/DateTimePicker";
import { apiClient } from "../../api/client";
import { useAppContext } from "../../state/AppContext";
import buttonStyles from "../../styles/Button.module.css";
import styles from "./TournamentMatchFormPage.module.css";

interface MatchCreationTemplate {
  sourceLabel: string;
  placeName: string;
  placeUrl: string;
  stage: string;
  teamConfig: MatchPlayersTableTemplateConfig;
}

const DEFAULT_PLAYERS_PER_TEAM = 5;

function splitTemplateTeams(teams: TeamContract[]): {
  teamA: TeamContract | null;
  teamB: TeamContract | null;
} {
  const byNameA = teams.find((team) => team.name === "Team A") ?? null;
  const byNameB = teams.find((team) => team.name === "Team B") ?? null;
  const fallbackA = byNameA ?? teams[0] ?? null;
  const fallbackB =
    byNameB ?? teams.find((team) => team.id !== fallbackA?.id) ?? null;

  return { teamA: fallbackA, teamB: fallbackB };
}

function buildTemplateFromMatch(
  match: MatchContract,
  teams: TeamContract[],
): MatchCreationTemplate {
  const { teamA, teamB } = splitTemplateTeams(teams);
  const playersPerTeam = Math.max(
    teamA?.playerTeams?.length ?? 0,
    teamB?.playerTeams?.length ?? 0,
    DEFAULT_PLAYERS_PER_TEAM,
  );

  return {
    sourceLabel: `Fecha ${match.matchday} · ${match.stage}`,
    placeName: match.placeName,
    placeUrl: match.placeUrl ?? "",
    stage: match.stage,
    teamConfig: {
      playersPerTeam,
      teamAName: teamA?.name ?? "Team A",
      teamBName: teamB?.name ?? "Team B",
      teamAColor: teamA?.color ?? "#0b2818",
      teamBColor: teamB?.color ?? "#f2f2f2",
    },
  };
}

export function TournamentMatchFormPage() {
  const { tournamentId } = useParams();
  const navigate = useNavigate();
  const { data, getMyRole, loadTournaments } = useAppContext();

  const [placeName, setPlaceName] = useState("");
  const [placeUrl, setPlaceUrl] = useState("");
  const [kickoffAt, setKickoffAt] = useState("");
  const [matchday, setMatchday] = useState("");
  const [stage, setStage] = useState("");
  const [players, setPlayers] = useState<PlayerContract[]>([]);
  const [lastMatchTemplate, setLastMatchTemplate] =
    useState<MatchCreationTemplate | null>(null);
  const [appliedTemplateConfig, setAppliedTemplateConfig] =
    useState<MatchPlayersTableTemplateConfig | null>(null);
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const tableRef = useRef<MatchPlayersTableBuilderRef | null>(null);

  useEffect(() => {
    void loadTournaments();
  }, [loadTournaments]);

  useEffect(() => {
    if (!tournamentId) {
      return;
    }

    let isActive = true;
    setIsLoadingTemplate(true);
    setAppliedTemplateConfig(null);
    setLastMatchTemplate(null);

    void (async () => {
      try {
        const [nextPlayers, matches] = await Promise.all([
          apiClient.getPlayers(tournamentId),
          apiClient.getMatches(tournamentId),
        ]);

        if (!isActive) {
          return;
        }

        setPlayers(nextPlayers);

        const lastCreatedMatch = [...matches].sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )[0];

        if (!lastCreatedMatch) {
          setLastMatchTemplate(null);
          return;
        }

        const teams = await apiClient
          .getTeamsByMatch(lastCreatedMatch.id)
          .catch(() => [] as TeamContract[]);

        if (!isActive) {
          return;
        }

        setLastMatchTemplate(buildTemplateFromMatch(lastCreatedMatch, teams));
      } catch {
        if (!isActive) {
          return;
        }

        setPlayers([]);
        setLastMatchTemplate(null);
      } finally {
        if (isActive) {
          setIsLoadingTemplate(false);
        }
      }
    })();

    return () => {
      isActive = false;
    };
  }, [tournamentId]);

  const tournament = useMemo(
    () => data.tournaments.find((item) => item.id === tournamentId),
    [data.tournaments, tournamentId],
  );

  const role = tournamentId ? getMyRole(tournamentId) : null;
  const canCreate = [PlayerRole.OWNER, PlayerRole.ADMIN].includes(
    role ?? PlayerRole.USER,
  );

  const hasAppliedTemplate = Boolean(appliedTemplateConfig);

  if (
    !tournamentId ||
    !tournament ||
    tournament.membershipStatus === "PENDING"
  ) {
    return (
      <Navigate
        replace
        to={
          tournamentId
            ? `/tournaments/${tournamentId}/partidos`
            : "/tournaments"
        }
      />
    );
  }

  return (
    <section className={styles.section}>
      <div className={styles.headerRow}>
        <h2>Crear partido</h2>
        <Link
          className={buttonStyles.ghost}
          to={`/tournaments/${tournamentId}/partidos`}
        >
          Volver
        </Link>
      </div>

      {lastMatchTemplate ? (
        <article className={styles.card}>
          <div className={styles.templateHeader}>
            <div>
              <h3>Usar último partido como plantilla</h3>
              <p className={styles.templateMeta}>
                {lastMatchTemplate.sourceLabel} · {lastMatchTemplate.placeName}
              </p>
            </div>
            <div className={styles.templateActions}>
              <button
                className={buttonStyles.primary}
                onClick={() => {
                  setStage(lastMatchTemplate.stage);
                  setPlaceName(lastMatchTemplate.placeName);
                  setPlaceUrl(lastMatchTemplate.placeUrl);
                  setAppliedTemplateConfig({ ...lastMatchTemplate.teamConfig });
                }}
                type="button"
              >
                Usar plantilla
              </button>
              <button
                className={buttonStyles.ghost}
                disabled={!hasAppliedTemplate}
                onClick={() => {
                  setStage("");
                  setPlaceName("");
                  setPlaceUrl("");
                  setAppliedTemplateConfig(null);
                }}
                type="button"
              >
                Limpiar plantilla
              </button>
            </div>
          </div>
          <p className={styles.templateMeta}>
            Copia cancha, lugar, URL, nombres y colores de equipos, y cantidad
            de jugadores por equipo. La fecha, la hora, la fecha del torneo y
            los jugadores quedan vacíos.
          </p>
        </article>
      ) : null}

      {!lastMatchTemplate && !isLoadingTemplate ? (
        <article className={styles.card}>
          <p className={styles.templateMeta}>
            Todavía no hay un partido anterior para usar como plantilla.
          </p>
        </article>
      ) : null}

      <article className={styles.form}>
        <label>
          Fecha
          <input
            inputMode="numeric"
            min={1}
            onChange={(event) => setMatchday(event.target.value)}
            placeholder="Se autocalcula si lo dejás vacío"
            type="number"
            value={matchday}
          />
        </label>

        <label>
          Cancha
          <input
            onChange={(event) => setStage(event.target.value)}
            required
            value={stage}
          />
        </label>

        <label>
          Lugar
          <input
            onChange={(event) => setPlaceName(event.target.value)}
            required
            value={placeName}
          />
        </label>

        <label>
          URL del lugar
          <input
            onChange={(event) => setPlaceUrl(event.target.value)}
            placeholder="https://maps.google.com/..."
            value={placeUrl}
          />
        </label>

        <DateTimePicker
          label="Fecha y hora"
          onChange={setKickoffAt}
          value={kickoffAt}
        />
      </article>

      <article className={styles.card}>
        <h3>Jugadores y goles</h3>
        <MatchPlayersTableBuilder
          canEdit={canCreate}
          players={players}
          ref={tableRef}
          showSaveButton={false}
          templateConfig={appliedTemplateConfig}
        />
      </article>

      <button
        className={buttonStyles.primary}
        disabled={isSubmitting || !canCreate}
        onClick={async () => {
          if (!canCreate) {
            sileo.warning({ title: "No tienes permisos para crear partidos" });
            return;
          }

          const kickoffDate = new Date(kickoffAt);

          if (Number.isNaN(kickoffDate.getTime())) {
            sileo.warning({ title: "La fecha del partido no es valida" });
            return;
          }

          if (matchday.trim()) {
            const parsedMatchday = Number(matchday);
            if (!Number.isInteger(parsedMatchday) || parsedMatchday < 1) {
              sileo.warning({ title: "La fecha del torneo debe ser un número mayor a 0" });
              return;
            }
          }

          const payload = {
            ...(matchday.trim() ? { matchday: Number(matchday) } : {}),
            placeName: placeName.trim(),
            kickoffAt: kickoffDate.toISOString(),
            stage: stage.trim(),
            ...(placeUrl.trim() ? { placeUrl: placeUrl.trim() } : {}),
          };

          setIsSubmitting(true);
          try {
            await sileo.promise(
              (async () => {
                const createdMatch = await apiClient.createMatch(
                  tournamentId,
                  payload,
                );
                await tableRef.current?.saveLineupForMatch(createdMatch.id);
              })(),
              {
                loading: { title: "Guardando partido..." },
                success: { title: "Partido creado" },
                error: { title: "No se pudo crear el partido" },
              },
            );
            navigate(`/tournaments/${tournamentId}/partidos`, {
              replace: true,
            });
          } catch (error) {
            void error;
          } finally {
            setIsSubmitting(false);
          }
        }}
        type="button"
      >
        Guardar cambios
      </button>
    </section>
  );
}
