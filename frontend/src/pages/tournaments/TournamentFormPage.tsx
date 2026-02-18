import { useEffect, useMemo, useState } from "react";
import { TournamentVisibility } from "@shared/enums";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { sileo } from "sileo";
import { useAppContext } from "../../state/AppContext";
import buttonStyles from "../../styles/Button.module.css";
import styles from "./TournamentFormPage.module.css";

export function TournamentFormPage() {
  const navigate = useNavigate();
  const { tournamentId } = useParams();
  const { createTournament, data, loadTournaments, updateTournament } =
    useAppContext();
  const isEdit = Boolean(tournamentId);

  const tournament = useMemo(
    () => data.tournaments.find((item) => item.id === tournamentId),
    [data.tournaments, tournamentId],
  );

  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [visibilityDraft, setVisibilityDraft] =
    useState<TournamentVisibility | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    void loadTournaments();
  }, [loadTournaments]);

  const name = nameDraft ?? tournament?.name ?? "";
  const visibility =
    visibilityDraft ?? tournament?.visibility ?? TournamentVisibility.PRIVATE;

  if (isEdit && data.tournaments.length > 0 && !tournament) {
    return <Navigate replace to="/tournaments" />;
  }

  return (
    <section className={styles.section}>
      <div className={styles.formHeader}>
        <h2>{isEdit ? "Editar torneo" : "Crear torneo"}</h2>
      </div>

      <form
        className={styles.tournamentForm}
        onSubmit={async (event) => {
          event.preventDefault();
          setIsSubmitting(true);
          try {
            if (isEdit && tournamentId) {
              await sileo.promise(
                updateTournament(tournamentId, {
                  name: name.trim(),
                  visibility,
                }),
                {
                  loading: { title: "Actualizando torneo..." },
                  success: { title: "Torneo actualizado" },
                  error: { title: "No se pudo guardar el torneo" },
                },
              );
            } else {
              await sileo.promise(
                createTournament({ name: name.trim(), visibility }),
                {
                  loading: { title: "Creando torneo..." },
                  success: { title: "Torneo creado" },
                  error: { title: "No se pudo guardar el torneo" },
                },
              );
            }
            navigate("/tournaments", { replace: true });
          } finally {
            setIsSubmitting(false);
          }
        }}
      >
        <label>
          Nombre
          <input
            onChange={(event) => setNameDraft(event.target.value)}
            required
            value={name}
          />
        </label>

        <label>
          Visibilidad
          <select
            onChange={(event) =>
              setVisibilityDraft(event.target.value as TournamentVisibility)
            }
            value={visibility}
          >
            <option value={TournamentVisibility.PRIVATE}>Privado</option>
            <option value={TournamentVisibility.PUBLIC}>Publico</option>
          </select>
        </label>

        <div className={styles.formActions}>
          <button
            className={buttonStyles.ghost}
            disabled={isSubmitting}
            onClick={() => navigate("/tournaments")}
            type="button"
          >
            Cancelar
          </button>
          <button className={buttonStyles.primary} disabled={isSubmitting} type="submit">
            {isEdit ? "Guardar cambios" : "Crear torneo"}
          </button>
        </div>
      </form>
    </section>
  );
}
