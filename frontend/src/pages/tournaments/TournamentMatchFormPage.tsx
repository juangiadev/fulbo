import { PlayerRole } from "@shared/enums";
import type { PlayerContract } from "@shared/contracts";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { sileo } from "sileo";
import {
  MatchPlayersTableBuilder,
  type MatchPlayersTableBuilderRef,
} from "../../components/MatchPlayersTableBuilder";
import { apiClient } from "../../api/client";
import { useAppContext } from "../../state/AppContext";
import buttonStyles from "../../styles/Button.module.css";
import styles from "./TournamentMatchFormPage.module.css";

export function TournamentMatchFormPage() {
  const { tournamentId } = useParams();
  const navigate = useNavigate();
  const { data, getMyRole, loadTournaments } = useAppContext();

  const [placeName, setPlaceName] = useState("");
  const [placeUrl, setPlaceUrl] = useState("");
  const [kickoffAt, setKickoffAt] = useState("");
  const [stage, setStage] = useState("");
  const [players, setPlayers] = useState<PlayerContract[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const tableRef = useRef<MatchPlayersTableBuilderRef | null>(null);

  useEffect(() => {
    void loadTournaments();
  }, [loadTournaments]);

  useEffect(() => {
    if (!tournamentId) {
      return;
    }

    void apiClient
      .getPlayers(tournamentId)
      .then(setPlayers)
      .catch(() => setPlayers([]));
  }, [tournamentId]);

  const tournament = useMemo(
    () => data.tournaments.find((item) => item.id === tournamentId),
    [data.tournaments, tournamentId],
  );

  const role = tournamentId ? getMyRole(tournamentId) : null;
  const canCreate = [PlayerRole.OWNER, PlayerRole.ADMIN].includes(
    role ?? PlayerRole.USER,
  );

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

      <article className={styles.form}>
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

        <label>
          Fecha y hora
          <input
            onChange={(event) => setKickoffAt(event.target.value)}
            required
            type="datetime-local"
            value={kickoffAt}
          />
        </label>
      </article>

      <article className={styles.card}>
        <h3>Jugadores y goles</h3>
        <MatchPlayersTableBuilder
          canEdit={canCreate}
          players={players}
          ref={tableRef}
          showSaveButton={false}
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

          const payload = {
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
            sileo.success({ title: "Partido creado" });
            navigate(`/tournaments/${tournamentId}/partidos`, {
              replace: true,
            });
          } catch {
            sileo.error({ title: "No se pudo crear el partido" });
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
