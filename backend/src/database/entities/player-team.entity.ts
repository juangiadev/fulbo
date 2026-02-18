import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Player } from './player.entity';
import { Team } from './team.entity';

@Entity({ name: 'player_teams' })
@Unique('uq_player_teams_player_team', ['playerId', 'teamId'])
@Check('"goals" >= 0')
export class PlayerTeam {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  playerId: string;

  @Column('uuid')
  teamId: string;

  @Column({ type: 'int', default: 0 })
  goals: number;

  @Column({ type: 'text', nullable: true })
  injury: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => Player, (player) => player.playerTeams, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'playerId' })
  player: Player;

  @ManyToOne(() => Team, (team) => team.playerTeams, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teamId' })
  team: Team;
}
