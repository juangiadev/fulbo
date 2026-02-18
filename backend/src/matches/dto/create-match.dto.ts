import {
  IsDateString,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

export class CreateMatchDto {
  @IsString()
  @MaxLength(150)
  placeName: string;

  @IsOptional()
  @IsUrl()
  placeUrl?: string;

  @IsDateString()
  kickoffAt: string;

  @IsString()
  @MaxLength(120)
  stage: string;

  @IsOptional()
  @IsString()
  mvpPlayerId?: string;
}
