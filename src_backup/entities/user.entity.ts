import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn() id: number;

  @Index({ unique: true })
  @Column({ length: 120 }) email: string;

  @Column() passwordHash: string;

  @CreateDateColumn() createdAt: Date;
}
