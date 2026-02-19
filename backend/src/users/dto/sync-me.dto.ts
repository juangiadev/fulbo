import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class SyncMeDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  nickname?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1024)
  picture?: string;
}
