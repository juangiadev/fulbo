import { PartialType } from '@nestjs/mapped-types';
import { CreatePlayerTeamDto } from './create-player-team.dto';

export class UpdatePlayerTeamDto extends PartialType(CreatePlayerTeamDto) {}
