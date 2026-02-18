import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { MatchStatus } from '../../../../shared/src/enums';
import { Player } from './player.entity';
import { Team } from './team.entity';
import { Tournament } from './tournament.entity';

@Entity({ name: 'matches' })
export class Match {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tournamentId: string;

  @Column()
  placeName: string;

  @Column({ type: 'varchar', nullable: true })
  placeUrl: string | null;

  @Column({ type: 'timestamptz' })
  kickoffAt: Date;

  @Column()
  stage: string;

  @Column({ type: 'varchar', default: MatchStatus.PENDING })
  status: MatchStatus;

  @Column('uuid', { nullable: true })
  mvpPlayerId: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => Tournament, (tournament) => tournament.matches, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'tournamentId' })
  tournament: Tournament;

  @ManyToOne(() => Player, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'mvpPlayerId' })
  mvpPlayer: Player | null;

  @OneToMany(() => Team, (team) => team.match)
  teams: Team[];
}
