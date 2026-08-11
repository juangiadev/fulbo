import type { PlayerContract } from '@shared/contracts';
import { DisplayPreference } from '@shared/enums';
import { FAVORITE_TEAMS } from '@shared/favorite-teams';
import { useState } from 'react';

export type PlayerAvatarPlayer = Pick<
  PlayerContract,
  'name' | 'nickname' | 'imageUrl' | 'favoriteTeamSlug' | 'displayPreference'
>;

export interface PlayerAvatarClassNames {
  avatar: string;
  avatarFallback: string;
  avatarTeam: string;
}

interface PlayerAvatarProps {
  classNames: PlayerAvatarClassNames;
  player: PlayerAvatarPlayer | undefined;
}

export function PlayerAvatar({ classNames, player }: PlayerAvatarProps) {
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  const fallback = player ? (player.nickname ?? player.name).slice(0, 1) : '?';
  const favoriteTeam = FAVORITE_TEAMS.find((item) => item.slug === player?.favoriteTeamSlug);
  const useFavoriteTeam =
    player?.displayPreference === DisplayPreference.FAVORITE_TEAM && Boolean(favoriteTeam?.imageUrl);
  const imageUrl = useFavoriteTeam
    ? favoriteTeam?.imageUrl ?? null
    : player?.imageUrl ?? null;

  if (!imageUrl || failedImageUrl === imageUrl) {
    return <span className={classNames.avatarFallback}>{fallback}</span>;
  }

  return (
    <img
      alt={useFavoriteTeam ? 'Equipo' : 'Jugador'}
      className={useFavoriteTeam ? classNames.avatarTeam : classNames.avatar}
      onError={() => setFailedImageUrl(imageUrl)}
      referrerPolicy={useFavoriteTeam ? undefined : 'no-referrer'}
      src={imageUrl}
    />
  );
}
