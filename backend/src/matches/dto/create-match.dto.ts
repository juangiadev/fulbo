import {
  IsInt,
  IsDateString,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class CreateMatchDto {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === '' || value === null ? undefined : value,
  )
  @Type(() => Number)
  @IsInt()
  @Min(1)
  matchday?: number;

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
}
