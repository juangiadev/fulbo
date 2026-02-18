import { IsString } from 'class-validator';

export class JoinTournamentDto {
  @IsString()
  code: string;
}
