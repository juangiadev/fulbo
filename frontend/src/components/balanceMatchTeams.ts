import type { PlayerContract } from "@shared/contracts";

const DEFAULT_ABILITY = 5;
const MIN_ABILITY = 1;
const MAX_ABILITY = 10;

type BalanceablePlayer = Pick<PlayerContract, "id" | "ability">;

export interface BalancedMatchTeams {
  teamAPlayerIds: string[];
  teamBPlayerIds: string[];
}

export function getEffectivePlayerAbility(
  ability: number | null | undefined,
): number {
  return typeof ability === "number" &&
    Number.isInteger(ability) &&
    ability >= MIN_ABILITY &&
    ability <= MAX_ABILITY
    ? ability
    : DEFAULT_ABILITY;
}

function shufflePlayers(
  players: BalanceablePlayer[],
  random: () => number,
): BalanceablePlayer[] {
  const shuffled = [...players];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex],
      shuffled[index],
    ];
  }

  return shuffled;
}

export function balanceMatchTeams(
  selectedPlayerIds: readonly string[],
  players: readonly BalanceablePlayer[],
  random: () => number = Math.random,
): BalancedMatchTeams {
  const playersById = new Map(players.map((player) => [player.id, player]));
  const selectedPlayers = Array.from(new Set(selectedPlayerIds))
    .map((playerId) => playersById.get(playerId))
    .filter((player): player is BalanceablePlayer => Boolean(player));

  if (selectedPlayers.length === 0) {
    return { teamAPlayerIds: [], teamBPlayerIds: [] };
  }

  const shuffledPlayers = shufflePlayers(selectedPlayers, random);
  const largerTeamSize = Math.ceil(shuffledPlayers.length / 2);
  const smallerTeamSize = Math.floor(shuffledPlayers.length / 2);
  const teamASize =
    shuffledPlayers.length % 2 === 1 && random() < 0.5
      ? largerTeamSize
      : smallerTeamSize;
  const abilities = shuffledPlayers.map((player) =>
    getEffectivePlayerAbility(player.ability),
  );
  const totalAbility = abilities.reduce((sum, ability) => sum + ability, 0);
  const layers: Array<Array<Set<number>>> = [
    Array.from({ length: teamASize + 1 }, () => new Set<number>()),
  ];
  layers[0][0].add(0);

  for (let playerIndex = 0; playerIndex < abilities.length; playerIndex += 1) {
    const previousLayer = layers[playerIndex];
    const nextLayer = Array.from(
      { length: teamASize + 1 },
      () => new Set<number>(),
    );

    for (
      let playerCount = 0;
      playerCount <= Math.min(playerIndex, teamASize);
      playerCount += 1
    ) {
      for (const abilitySum of previousLayer[playerCount]) {
        nextLayer[playerCount].add(abilitySum);
        if (playerCount < teamASize) {
          nextLayer[playerCount + 1].add(
            abilitySum + abilities[playerIndex],
          );
        }
      }
    }

    layers.push(nextLayer);
  }

  const possibleSums = Array.from(
    layers[shuffledPlayers.length][teamASize],
  );
  const minimumDifference = Math.min(
    ...possibleSums.map((sum) => Math.abs(totalAbility - 2 * sum)),
  );
  const optimalSums = possibleSums.filter(
    (sum) => Math.abs(totalAbility - 2 * sum) === minimumDifference,
  );
  let remainingSum =
    optimalSums[Math.floor(random() * optimalSums.length)];
  let remainingCount = teamASize;
  const teamAPlayerIds: string[] = [];

  for (
    let playerIndex = shuffledPlayers.length;
    playerIndex > 0;
    playerIndex -= 1
  ) {
    const ability = abilities[playerIndex - 1];
    const previousLayer = layers[playerIndex - 1];
    const canExclude = previousLayer[remainingCount].has(remainingSum);
    const canInclude =
      remainingCount > 0 &&
      previousLayer[remainingCount - 1].has(remainingSum - ability);
    const shouldInclude = canInclude && (!canExclude || random() < 0.5);

    if (shouldInclude) {
      teamAPlayerIds.push(shuffledPlayers[playerIndex - 1].id);
      remainingCount -= 1;
      remainingSum -= ability;
    }
  }

  teamAPlayerIds.reverse();
  const teamAIdSet = new Set(teamAPlayerIds);
  const teamBPlayerIds = shuffledPlayers
    .filter((player) => !teamAIdSet.has(player.id))
    .map((player) => player.id);

  if (teamAPlayerIds.length === teamBPlayerIds.length && random() < 0.5) {
    return {
      teamAPlayerIds: teamBPlayerIds,
      teamBPlayerIds: teamAPlayerIds,
    };
  }

  return { teamAPlayerIds, teamBPlayerIds };
}
