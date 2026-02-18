import { IsString } from 'class-validator';

export class ClaimPlayerDto {
  @IsString()
  claimCode: string;
}
