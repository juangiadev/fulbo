import { IsString } from 'class-validator';

export class LinkJoinRequestDto {
  @IsString()
  playerId: string;
}
