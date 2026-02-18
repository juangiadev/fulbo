import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { DisplayPreference, PlayerRole } from '../../../../shared/src/enums';
import { PlayerTeam } from './player-team.entity';
import { Tournament } from './tournament.entity';
import { User } from './user.entity';

@Entity({ name: 'players' })
@Unique('uq_players_user_tournament', ['userId', 'tournamentId'])
@Check('"ability" >= 1 AND "ability" <= 10')
@Check('"misses" >= 0')
export class Player {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { nullable: true })
  userId: string | null;

  @Column('uuid')
  tournamentId: string;

  @Column()
  name: string;

  @Column({ type: 'varchar', nullable: true })
  nickname: string | null;

  @Column({ type: 'varchar', nullable: true })
  imageUrl: string | null;

  @Column({ type: 'varchar', nullable: true })
  favoriteTeamSlug: string | null;

  @Column({
    type: 'enum',
    enum: DisplayPreference,
    default: DisplayPreference.IMAGE,
  })
  displayPreference: DisplayPreference;

  @Column({
    type: 'enum',
    enum: PlayerRole,
    default: PlayerRole.USER,
  })
  role: PlayerRole;

  @Column({ type: 'smallint', default: 10 })
  ability: number;

  @Column({ type: 'text', nullable: true })
  injury: string | null;

  @Column({ type: 'int', default: 0 })
  misses: number;

  @Column({ type: 'varchar', nullable: true })
  claimCodeHash: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  claimCodeExpiresAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.players, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'userId' })
  user: User | null;

  @ManyToOne(() => Tournament, (tournament) => tournament.players, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'tournamentId' })
  tournament: Tournament;

  @OneToMany(() => PlayerTeam, (playerTeam) => playerTeam.player)
  playerTeams: PlayerTeam[];
}
