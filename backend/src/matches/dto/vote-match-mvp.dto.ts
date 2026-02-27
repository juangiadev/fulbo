import { IsDefined, IsUUID, ValidateIf } from 'class-validator';

export class VoteMatchMvpDto {
  @IsDefined()
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  votedPlayerId: string | null;
}
