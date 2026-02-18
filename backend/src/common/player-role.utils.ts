import { ForbiddenException } from '@nestjs/common';
import { PlayerRole } from '../../../shared/src/enums';
import { Player } from '../database/entities';

export const assertTournamentEditor = (actor: Player): void => {
  if (![PlayerRole.OWNER, PlayerRole.ADMIN].includes(actor.role)) {
    throw new ForbiddenException(
      'Only owners or admins can manage this resource',
    );
  }
};

export const assertTournamentOwner = (actor: Player): void => {
  if (actor.role !== PlayerRole.OWNER) {
    throw new ForbiddenException('Only owners can perform this action');
  }
};

export const canEditPlayer = (actor: Player, target: Player): boolean => {
  if (actor.id === target.id) {
    return true;
  }

  if (actor.role === PlayerRole.OWNER) {
    return true;
  }

  if (actor.role === PlayerRole.ADMIN && target.role === PlayerRole.USER) {
    return true;
  }

  return false;
};
