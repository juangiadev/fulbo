import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateMatchdayFixtureDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  matchday: number;

  @IsDateString()
  firstKickoffAt: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  intervalMinutes: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  placeName: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === '' || value === null ? undefined : value,
  )
  @IsUrl()
  placeUrl?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  stage: string;
}
