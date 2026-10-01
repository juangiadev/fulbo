import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  TournamentFormat,
  TournamentType,
  TournamentVisibility,
} from '../../../../shared/src/enums';
import { Match } from './match.entity';
import { Player } from './player.entity';
import { TournamentTeam } from './tournament-team.entity';

@Entity({ name: 'tournaments' })
export class Tournament {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({
    type: 'enum',
    enum: TournamentVisibility,
    default: TournamentVisibility.PRIVATE,
  })
  visibility: TournamentVisibility;

  @Column({
    type: 'enum',
    enum: TournamentType,
    default: TournamentType.USER,
  })
  type: TournamentType;

  @Column({
    type: 'enum',
    enum: TournamentFormat,
    default: TournamentFormat.LIGA,
  })
  format: TournamentFormat;

  @Column({ type: 'varchar', nullable: true })
  imageUrl: string | null;

  @Column({ type: 'varchar', nullable: true })
  leaderBannerImageUrl: string | null;

  @Column({ type: 'varchar', nullable: true })
  scorerBannerImageUrl: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  finishedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => Player, (player) => player.tournament)
  players: Player[];

  @OneToMany(() => Match, (match) => match.tournament)
  matches: Match[];

  @OneToMany(() => TournamentTeam, (team) => team.tournament)
  tournamentTeams: TournamentTeam[];
}
