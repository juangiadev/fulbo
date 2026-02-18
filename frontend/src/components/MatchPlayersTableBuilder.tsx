import type {
  PlayerContract,
  PlayerTeamContract,
  TeamContract,
} from "@shared/contracts";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import { sileo } from "sileo";
import { apiClient } from "../api/client";
import buttonStyles from "../styles/Button.module.css";
import styles from "./MatchPlayersTableBuilder.module.css";

interface RowItem {
  id: string;
  teamAGoals: number;
  teamAPlayerId: string | null;
  teamBPlayerId: string | null;
  teamBGoals: number;
}

interface MatchPlayersTableBuilderProps {
  players: PlayerContract[];
  canEdit: boolean;
  matchId?: string;
  showSaveButton?: boolean;
  onSummaryChange?: (summary: {
    teamAColor: string;
    teamBColor: string;
    teamAGoals: number;
    teamBGoals: number;
  }) => void;
}

export interface MatchPlayersTableBuilderRef {
  saveLineup: () => Promise<void>;
  saveLineupForMatch: (targetMatchId: string) => Promise<void>;
}

const createRows = (playersPerTeam: number): RowItem[] =>
  Array.from({ length: playersPerTeam }, (_, index) => ({
    id: `row-${index + 1}`,
    teamAGoals: 0,
    teamAPlayerId: null,
    teamBPlayerId: null,
    teamBGoals: 0,
  }));

const withAlpha = (hex: string, alpha: string): string =>
  /^#[0-9a-fA-F]{6}$/.test(hex) ? `${hex}${alpha}` : hex;

function splitTeams(teams: TeamContract[]): {
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

export const MatchPlayersTableBuilder = forwardRef<
  MatchPlayersTableBuilderRef,
  MatchPlayersTableBuilderProps
>(function MatchPlayersTableBuilder(
  {
    players,
    canEdit,
    matchId,
    showSaveButton = true,
    onSummaryChange,
  }: MatchPlayersTableBuilderProps,
  ref,
) {
  const [playersPerTeam, setPlayersPerTeam] = useState<number>(5);
  const [rows, setRows] = useState<RowItem[]>(createRows(5));
  const [search, setSearch] = useState("");
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [availablePlayerIds, setAvailablePlayerIds] = useState<string[]>([]);
  const [teamAColor, setTeamAColor] = useState("#0b2818");
  const [teamBColor, setTeamBColor] = useState("#f2f2f2");
  const [isSaving, setIsSaving] = useState(false);

  const getPlayerLabel = (player: PlayerContract): string => {
    const baseName = player.nickname ?? player.name;
    return player.ability ? `${player.ability} · ${baseName}` : baseName;
  };

  const maxSelectedPlayers = playersPerTeam * 2;

  const filteredPlayers = useMemo(() => {
    const query = search.toLowerCase().trim();
    if (!query) {
      return [];
    }

    return players.filter((player) => {
      if (selectedPlayerIds.includes(player.id)) {
        return false;
      }
      return `${player.name} ${player.nickname ?? ""}`
        .toLowerCase()
        .includes(query);
    });
  }, [players, search, selectedPlayerIds]);

  const availablePlayers = availablePlayerIds
    .map((playerId) => players.find((player) => player.id === playerId))
    .filter((player): player is PlayerContract => Boolean(player));

  useEffect(() => {
    if (!matchId) {
      return;
    }

    void apiClient.getTeamsByMatch(matchId).then((teams) => {
      const { teamA, teamB } = splitTeams(teams);
      const teamARows = (
        (teamA?.playerTeams as PlayerTeamContract[] | undefined) ?? []
      ).map((item) => ({
        playerId: item.playerId,
        goals: item.goals,
      }));
      const teamBRows = (
        (teamB?.playerTeams as PlayerTeamContract[] | undefined) ?? []
      ).map((item) => ({
        playerId: item.playerId,
        goals: item.goals,
      }));

      const count = Math.max(teamARows.length, teamBRows.length, 5);
      const nextRows = createRows(count).map((row, index) => ({
        ...row,
        teamAPlayerId: teamARows[index]?.playerId ?? null,
        teamAGoals: teamARows[index]?.goals ?? 0,
        teamBPlayerId: teamBRows[index]?.playerId ?? null,
        teamBGoals: teamBRows[index]?.goals ?? 0,
      }));

      const assignedIds = nextRows
        .flatMap((row) => [row.teamAPlayerId, row.teamBPlayerId])
        .filter((id): id is string => Boolean(id));

      setRows(nextRows);
      setPlayersPerTeam(count);
      setSelectedPlayerIds(assignedIds);
      setAvailablePlayerIds([]);
      setTeamAColor(teamA?.color ?? "#0b2818");
      setTeamBColor(teamB?.color ?? "#f2f2f2");
    });
  }, [matchId]);

  const movePlayer = (playerId: string, rowId: string, side: "A" | "B") => {
    if (!selectedPlayerIds.includes(playerId)) {
      return;
    }

    let displacedPlayerId: string | null = null;

    setRows((previousRows) => {
      const nextRows = previousRows.map((item) => ({ ...item }));

      for (const row of nextRows) {
        if (row.teamAPlayerId === playerId) {
          row.teamAPlayerId = null;
        }
        if (row.teamBPlayerId === playerId) {
          row.teamBPlayerId = null;
        }
      }

      const targetRow = nextRows.find((item) => item.id === rowId);
      if (!targetRow) {
        return previousRows;
      }

      if (side === "A") {
        displacedPlayerId = targetRow.teamAPlayerId;
        targetRow.teamAPlayerId = playerId;
        if (targetRow.teamBPlayerId === playerId) {
          targetRow.teamBPlayerId = null;
        }
      } else {
        displacedPlayerId = targetRow.teamBPlayerId;
        targetRow.teamBPlayerId = playerId;
        if (targetRow.teamAPlayerId === playerId) {
          targetRow.teamAPlayerId = null;
        }
      }

      return nextRows;
    });

    setAvailablePlayerIds((previousAvailable) => {
      const nextAvailable = previousAvailable.filter((id) => id !== playerId);
      if (displacedPlayerId && !nextAvailable.includes(displacedPlayerId)) {
        nextAvailable.push(displacedPlayerId);
      }
      return nextAvailable;
    });
  };

  const removePlayer = (playerId: string) => {
    setSelectedPlayerIds((previous) =>
      previous.filter((id) => id !== playerId),
    );
    setAvailablePlayerIds((previous) =>
      previous.filter((id) => id !== playerId),
    );
    setRows((previousRows) =>
      previousRows.map((row) => ({
        ...row,
        teamAPlayerId:
          row.teamAPlayerId === playerId ? null : row.teamAPlayerId,
        teamBPlayerId:
          row.teamBPlayerId === playerId ? null : row.teamBPlayerId,
      })),
    );
  };

  const teamAGoalsSum = rows.reduce((total, row) => total + row.teamAGoals, 0);
  const teamBGoalsSum = rows.reduce((total, row) => total + row.teamBGoals, 0);

  useEffect(() => {
    onSummaryChange?.({
      teamAColor,
      teamBColor,
      teamAGoals: teamAGoalsSum,
      teamBGoals: teamBGoalsSum,
    });
  }, [onSummaryChange, teamAColor, teamAGoalsSum, teamBColor, teamBGoalsSum]);

  const saveLineup = useCallback(
    async (withToast = true, matchIdOverride?: string) => {
      const effectiveMatchId = matchIdOverride ?? matchId;

      if (!effectiveMatchId) {
        sileo.warning({
          title: "Primero crea el partido para guardar equipos y goles",
        });
        return;
      }

      const desiredA = rows
        .filter((row) => row.teamAPlayerId)
        .map((row) => ({
          playerId: row.teamAPlayerId as string,
          goals: row.teamAGoals,
        }));
      const desiredB = rows
        .filter((row) => row.teamBPlayerId)
        .map((row) => ({
          playerId: row.teamBPlayerId as string,
          goals: row.teamBGoals,
        }));

      const persistLineup = async () => {
        await apiClient.upsertMatchLineup(effectiveMatchId, {
          teamAColor,
          teamBColor,
          teamA: desiredA,
          teamB: desiredB,
        });
      };

      setIsSaving(true);
      try {
        if (withToast) {
          await sileo.promise(persistLineup(), {
            loading: { title: "Guardando jugadores y goles..." },
            success: { title: "Partido actualizado" },
            error: { title: "No se pudo guardar la tabla del partido" },
          });
        } else {
          await persistLineup();
        }
      } finally {
        setIsSaving(false);
      }
    },
    [matchId, rows, teamAColor, teamBColor],
  );

  useImperativeHandle(
    ref,
    () => ({
      saveLineup: async () => saveLineup(false),
      saveLineupForMatch: async (targetMatchId: string) =>
        saveLineup(false, targetMatchId),
    }),
    [saveLineup],
  );

  return (
    <section className={styles.editor}>
      <div className={styles.inlineControls}>
        <label>
          Jugadores por equipo
          <input
            disabled={!canEdit}
            min={1}
            onChange={(event) => {
              const value = Math.max(1, Number(event.target.value) || 1);
              setPlayersPerTeam(value);

              setRows((previousRows) => {
                const nextRows = createRows(value).map((row, index) => {
                  const previous = previousRows[index];
                  if (!previous) {
                    return row;
                  }
                  return {
                    ...row,
                    teamAGoals: previous.teamAGoals,
                    teamAPlayerId: previous.teamAPlayerId,
                    teamBPlayerId: previous.teamBPlayerId,
                    teamBGoals: previous.teamBGoals,
                  };
                });

                const nextAssignedIds = nextRows
                  .flatMap((row) => [row.teamAPlayerId, row.teamBPlayerId])
                  .filter((id): id is string => Boolean(id));

                const previousAssignedIds = previousRows
                  .flatMap((row) => [row.teamAPlayerId, row.teamBPlayerId])
                  .filter((id): id is string => Boolean(id));

                const droppedAssignedIds = previousAssignedIds.filter(
                  (id) => !nextAssignedIds.includes(id),
                );

                const maxSelected = value * 2;
                const nextAvailableIds = Array.from(
                  new Set([...availablePlayerIds, ...droppedAssignedIds]),
                ).filter((id) => !nextAssignedIds.includes(id));
                const cappedAvailableIds = nextAvailableIds.slice(
                  0,
                  Math.max(0, maxSelected - nextAssignedIds.length),
                );

                setAvailablePlayerIds(cappedAvailableIds);
                setSelectedPlayerIds([
                  ...nextAssignedIds,
                  ...cappedAvailableIds,
                ]);

                setSearch("");

                return nextRows;
              });
            }}
            type="number"
            value={playersPerTeam}
          />
        </label>
        <label>
          Color Team A
          <input
            disabled={!canEdit}
            onChange={(event) => {
              if (event.target.value === teamBColor) {
                sileo.warning({
                  title: "El color de Team A y Team B no puede ser igual",
                });
                return;
              }
              setTeamAColor(event.target.value);
            }}
            type="color"
            value={teamAColor}
          />
        </label>
        <label>
          Color Team B
          <input
            disabled={!canEdit}
            onChange={(event) => {
              if (event.target.value === teamAColor) {
                sileo.warning({
                  title: "El color de Team A y Team B no puede ser igual",
                });
                return;
              }
              setTeamBColor(event.target.value);
            }}
            type="color"
            value={teamBColor}
          />
        </label>
      </div>

      <div className={styles.inlineControls}>
        <label>
          Buscar jugador
          <input
            disabled={!canEdit}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Nombre o apodo"
            value={search}
          />
        </label>
      </div>

      {search.trim() ? (
        <div className={styles.searchResults}>
          {filteredPlayers.map((player) => (
            <button
              className={styles.searchResultButton}
              disabled={!canEdit}
              key={player.id}
              onClick={() => {
                if (!canEdit) {
                  return;
                }
                if (selectedPlayerIds.length >= maxSelectedPlayers) {
                  sileo.warning({
                    title: "No puedes agregar mas jugadores para este partido",
                  });
                  return;
                }
                setSelectedPlayerIds((previous) => [...previous, player.id]);
                setAvailablePlayerIds((previous) => [...previous, player.id]);
              }}
              type="button"
            >
              {getPlayerLabel(player)}
            </button>
          ))}
          {filteredPlayers.length === 0 ? (
            <p className={styles.muted}>No hay resultados para la busqueda.</p>
          ) : null}
        </div>
      ) : null}

      <div className={styles.draggablesRow}>
        {availablePlayers.map((player) => (
          <div
            className={styles.playerChip}
            draggable={canEdit}
            key={player.id}
            onDragStart={(event) => {
              event.dataTransfer.setData("text/player-id", player.id);
            }}
          >
            <span>{getPlayerLabel(player)}</span>
            {canEdit ? (
              <button
                aria-label="Quitar jugador"
                className={styles.removeChipButton}
                onClick={() => removePlayer(player.id)}
                onMouseDown={(event) => event.preventDefault()}
                type="button"
              >
                ×
              </button>
            ) : null}
          </div>
        ))}
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th style={{ backgroundColor: withAlpha(teamAColor, "26") }}>
                Goles
              </th>
              <th style={{ backgroundColor: withAlpha(teamAColor, "26") }}>
                Team A
              </th>
              <th style={{ backgroundColor: withAlpha(teamBColor, "26") }}>
                Team B
              </th>
              <th style={{ backgroundColor: withAlpha(teamBColor, "26") }}>
                Goles
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const teamAPlayer = players.find(
                (player) => player.id === row.teamAPlayerId,
              );
              const teamBPlayer = players.find(
                (player) => player.id === row.teamBPlayerId,
              );

              return (
                <tr key={row.id}>
                  <td style={{ backgroundColor: withAlpha(teamAColor, "12") }}>
                    <input
                      disabled={!canEdit}
                      min={0}
                      onChange={(event) => {
                        const goals = Number(event.target.value);
                        setRows((previousRows) =>
                          previousRows.map((item) =>
                            item.id === row.id
                              ? {
                                  ...item,
                                  teamAGoals: Number.isNaN(goals) ? 0 : goals,
                                }
                              : item,
                          ),
                        );
                      }}
                      type="number"
                      value={row.teamAGoals}
                    />
                  </td>
                  <td style={{ backgroundColor: withAlpha(teamAColor, "12") }}>
                    <div
                      className={styles.dropZone}
                      onDragOver={(event) => {
                        if (canEdit) {
                          event.preventDefault();
                        }
                      }}
                      onDrop={(event) => {
                        if (!canEdit) {
                          return;
                        }
                        event.preventDefault();
                        const playerId =
                          event.dataTransfer.getData("text/player-id");
                        movePlayer(playerId, row.id, "A");
                      }}
                    >
                      {teamAPlayer ? (
                        <div
                          className={styles.playerChip}
                          draggable={canEdit}
                          onDragStart={(event) => {
                            event.dataTransfer.setData(
                              "text/player-id",
                              teamAPlayer.id,
                            );
                          }}
                        >
                          <span>{getPlayerLabel(teamAPlayer)}</span>
                          {canEdit ? (
                            <button
                              aria-label="Quitar jugador"
                              className={styles.removeChipButton}
                              onClick={() => removePlayer(teamAPlayer.id)}
                              onMouseDown={(event) => event.preventDefault()}
                              type="button"
                            >
                              ×
                            </button>
                          ) : null}
                        </div>
                      ) : (
                        "Arrastra jugador"
                      )}
                    </div>
                  </td>
                  <td style={{ backgroundColor: withAlpha(teamBColor, "12") }}>
                    <div
                      className={styles.dropZone}
                      onDragOver={(event) => {
                        if (canEdit) {
                          event.preventDefault();
                        }
                      }}
                      onDrop={(event) => {
                        if (!canEdit) {
                          return;
                        }
                        event.preventDefault();
                        const playerId =
                          event.dataTransfer.getData("text/player-id");
                        movePlayer(playerId, row.id, "B");
                      }}
                    >
                      {teamBPlayer ? (
                        <div
                          className={styles.playerChip}
                          draggable={canEdit}
                          onDragStart={(event) => {
                            event.dataTransfer.setData(
                              "text/player-id",
                              teamBPlayer.id,
                            );
                          }}
                        >
                          <span>{getPlayerLabel(teamBPlayer)}</span>
                          {canEdit ? (
                            <button
                              aria-label="Quitar jugador"
                              className={styles.removeChipButton}
                              onClick={() => removePlayer(teamBPlayer.id)}
                              onMouseDown={(event) => event.preventDefault()}
                              type="button"
                            >
                              ×
                            </button>
                          ) : null}
                        </div>
                      ) : (
                        "Arrastra jugador"
                      )}
                    </div>
                  </td>
                  <td style={{ backgroundColor: withAlpha(teamBColor, "12") }}>
                    <input
                      disabled={!canEdit}
                      min={0}
                      onChange={(event) => {
                        const goals = Number(event.target.value);
                        setRows((previousRows) =>
                          previousRows.map((item) =>
                            item.id === row.id
                              ? {
                                  ...item,
                                  teamBGoals: Number.isNaN(goals) ? 0 : goals,
                                }
                              : item,
                          ),
                        );
                      }}
                      type="number"
                      value={row.teamBGoals}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {matchId && showSaveButton ? (
        <div className={styles.actions}>
          <button
            className={buttonStyles.primary}
            disabled={!canEdit || isSaving}
            onClick={() => {
              void saveLineup();
            }}
            type="button"
          >
            Guardar tabla
          </button>
        </div>
      ) : null}
    </section>
  );
});
