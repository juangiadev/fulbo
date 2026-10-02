import { IsBoolean } from 'class-validator';

export class UpdateRosterTeamAdminDto {
  @IsBoolean()
  isTeamAdmin: boolean;
}
