import { IsString } from 'class-validator';

export class LinkPlayerDto {
  @IsString()
  userId: string;
}
