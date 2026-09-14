import type {
  MatchContract,
  PlayerContract,
  TeamContract,
} from "@shared/contracts";
import {
  ArrowLeft,
  CalendarClock,
  ClipboardCopy,
  Link2,
  LoaderCircle,
  MapPin,
  Plus,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
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
import { useTournamentPermissions } from "../../hooks/useTournamentPermissions";
import { useAppContext } from "../../state/AppContext";
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
  const { data, loadTournaments } = useAppContext();

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

  const permissions = useTournamentPermissions(tournamentId);

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

  if (!permissions.canCreateMatches) {
    return <Navigate replace to={`/tournaments/${tournamentId}/partidos`} />;
  }

  return (
    <section className={styles.page}>
      <div aria-hidden="true" className={styles.pitchDecoration} />

      <Link
        className={styles.backLink}
        to={`/tournaments/${tournamentId}/partidos`}
      >
        <ArrowLeft aria-hidden="true" size={18} />
        Volver a partidos
      </Link>

      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Preparación del encuentro</p>
          <h1>Crear partido</h1>
          <p className={styles.heroDescription}>
            Definí la fecha, la sede y los equipos del próximo encuentro de{" "}
            <strong>{tournament.name}</strong>.
          </p>
        </div>

        <dl aria-label="Resumen del nuevo partido" className={styles.heroSummary}>
          <div>
            <dt>Torneo</dt>
            <dd>{tournament.name}</dd>
          </div>
          <div>
            <dt>Fecha</dt>
            <dd>{matchday.trim() ? `Fecha ${matchday}` : "Próxima fecha"}</dd>
          </div>
          <div>
            <dt>Estado</dt>
            <dd>
              <span className={styles.pendingBadge}>Pendiente</span>
            </dd>
          </div>
        </dl>
      </header>

      <div className={styles.formLayout}>
        <section aria-labelledby="template-title" className={styles.surface}>
          <div className={styles.sectionHeader}>
            <span aria-hidden="true" className={styles.sectionIcon}>
              <ClipboardCopy size={22} strokeWidth={1.8} />
            </span>
            <div>
              <p className={styles.sectionNumber}>01 · Plantilla</p>
              <h2 id="template-title">Empezá desde el último partido</h2>
              <p>Reutilizá la configuración anterior o empezá desde cero.</p>
            </div>
          </div>

          {isLoadingTemplate ? (
            <div aria-live="polite" className={styles.templateState} role="status">
              <LoaderCircle
                aria-hidden="true"
                className={styles.spinner}
                size={24}
              />
              <div>
                <strong>Buscando la última plantilla...</strong>
                <p>Estamos cargando la configuración del partido anterior.</p>
              </div>
            </div>
          ) : lastMatchTemplate ? (
            <div className={styles.templateReady}>
              <div className={styles.templateDetails}>
                <div className={styles.templateSourceRow}>
                  <div>
                    <span>Partido de origen</span>
                    <strong>
                      {lastMatchTemplate.sourceLabel} · {lastMatchTemplate.placeName}
                    </strong>
                  </div>
                  <span aria-live="polite" className={styles.templateBadge}>
                    {hasAppliedTemplate ? "Plantilla aplicada" : "Disponible"}
                  </span>
                </div>
                <p className={styles.templateMeta}>
                  Copia cancha, lugar, URL, nombres y colores de equipos, y
                  cantidad de jugadores por equipo. La fecha, la hora, la fecha
                  del torneo y los jugadores quedan vacíos.
                </p>
              </div>

              <div className={styles.templateActions}>
                <button
                  className={styles.applyTemplateButton}
                  onClick={() => {
                    setStage(lastMatchTemplate.stage);
                    setPlaceName(lastMatchTemplate.placeName);
                    setPlaceUrl(lastMatchTemplate.placeUrl);
                    setAppliedTemplateConfig({
                      ...lastMatchTemplate.teamConfig,
                    });
                  }}
                  type="button"
                >
                  <ClipboardCopy aria-hidden="true" size={17} />
                  Usar plantilla
                </button>
                <button
                  className={styles.clearTemplateButton}
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
          ) : (
            <div aria-live="polite" className={styles.templateEmpty}>
              <p>Todavía no hay un partido anterior para usar como plantilla.</p>
              <span>Podés completar los datos del encuentro manualmente.</span>
            </div>
          )}
        </section>

        <section
          aria-labelledby="match-details-title"
          className={`${styles.surface} ${styles.popoverSurface}`}
        >
          <div className={styles.sectionHeader}>
            <span aria-hidden="true" className={styles.sectionIcon}>
              <CalendarClock size={22} strokeWidth={1.8} />
            </span>
            <div>
              <p className={styles.sectionNumber}>02 · Datos del partido</p>
              <h2 id="match-details-title">Cuándo y dónde se juega</h2>
              <p>Completá la información principal que verá todo el torneo.</p>
            </div>
          </div>

          <div className={styles.formGrid}>
            <label>
              <span>Fecha del torneo</span>
              <input
                aria-describedby="matchday-help"
                inputMode="numeric"
                min={1}
                onChange={(event) => setMatchday(event.target.value)}
                placeholder="Se autocalcula si lo dejás vacío"
                type="number"
                value={matchday}
              />
              <small id="matchday-help">Opcional. Se asigna automáticamente si queda vacío.</small>
            </label>

            <label>
              <span>Cancha</span>
              <input
                onChange={(event) => setStage(event.target.value)}
                required
                value={stage}
              />
            </label>

            <label>
              <span>
                <MapPin aria-hidden="true" size={15} />
                Lugar
              </span>
              <input
                onChange={(event) => setPlaceName(event.target.value)}
                required
                value={placeName}
              />
            </label>

            <label className={styles.urlField}>
              <span>
                <Link2 aria-hidden="true" size={15} />
                URL del lugar
              </span>
              <input
                aria-describedby="place-url-help"
                onChange={(event) => setPlaceUrl(event.target.value)}
                placeholder="https://maps.google.com/..."
                value={placeUrl}
              />
              <small id="place-url-help">Opcional. Podés agregar el enlace al mapa.</small>
            </label>

            <div className={styles.dateField}>
              <DateTimePicker
                label="Fecha y hora"
                onChange={setKickoffAt}
                value={kickoffAt}
              />
            </div>
          </div>
        </section>

        <section aria-labelledby="lineup-title" className={styles.surface}>
          <div className={styles.sectionHeader}>
            <span aria-hidden="true" className={styles.sectionIcon}>
              <UsersRound size={22} strokeWidth={1.8} />
            </span>
            <div>
              <p className={styles.sectionNumber}>03 · Equipos</p>
              <h2 id="lineup-title">Jugadores y goles</h2>
              <p>Armá los equipos, elegí sus colores y prepará la formación.</p>
            </div>
          </div>

          <MatchPlayersTableBuilder
            canEdit={permissions.canCreateMatches}
            players={players}
            ref={tableRef}
            showSaveButton={false}
            templateConfig={appliedTemplateConfig}
            variant="panel"
          />
        </section>

        <footer className={styles.actionBar}>
          <div className={styles.saveNote}>
            <ShieldCheck aria-hidden="true" size={20} strokeWidth={1.7} />
            <p>Primero se crea el partido y después se guarda la formación.</p>
          </div>
          <div className={styles.actions}>
            <Link
              className={styles.cancelButton}
              to={`/tournaments/${tournamentId}/partidos`}
            >
              Cancelar
            </Link>
            <button
              aria-busy={isSubmitting}
              className={styles.createButton}
              disabled={isSubmitting || !permissions.canCreateMatches}
              onClick={async () => {
                if (!permissions.canCreateMatches) {
                  sileo.warning({
                    title: "No tienes permisos para crear partidos",
                  });
                  return;
                }

                const kickoffDate = new Date(kickoffAt);

                if (Number.isNaN(kickoffDate.getTime())) {
                  sileo.warning({
                    title: "La fecha del partido no es valida",
                  });
                  return;
                }

                if (matchday.trim()) {
                  const parsedMatchday = Number(matchday);
                  if (!Number.isInteger(parsedMatchday) || parsedMatchday < 1) {
                    sileo.warning({
                      title:
                        "La fecha del torneo debe ser un número mayor a 0",
                    });
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
                      await tableRef.current?.saveLineupForMatch(
                        createdMatch.id,
                      );
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
              <Plus aria-hidden="true" size={19} />
              <span aria-live="polite">
                {isSubmitting ? "Creando..." : "Crear partido"}
              </span>
            </button>
          </div>
        </footer>
      </div>
    </section>
  );
}
