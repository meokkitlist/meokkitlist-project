// src/entities/restaurant.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Review } from './review.entity';

@Entity('restaurant')
@Index('idx_restaurant_name', ['name'])
@Index('idx_restaurant_review_count', ['review_count'])
export class Restaurant {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text' })
  name: string;

  @Column('text')
  address: string;

  // lat/lon → nullable 허용
  @Column('float', { nullable: true })
  lat: number | null;

  @Column('float', { nullable: true })
  lon: number | null;

  @Column('simple-json', { nullable: true })
  keywords: string[] | null;

  @Column('int', { default: 0 })
  review_count: number;

  @Column('float', { default: 0 })
  total_score: number;

  @Column('float', { default: 0 })
  naver_score: number;

  @Column('text', { nullable: true })
  preview: string | null;

  @OneToMany(() => Review, (review) => review.restaurant, { cascade: false })
  reviews: Review[];
}
