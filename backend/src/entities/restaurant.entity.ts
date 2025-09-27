import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  Index,
} from "typeorm";
import { Review } from "./review.entity";

@Entity("restaurant")
@Index("idx_restaurant_name", ["name"])
@Index("idx_restaurant_review_count", ["review_count"])
export class Restaurant {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "text" })
  name: string;

  // ✅ 주소 없을 수 있으니 nullable 허용
  @Column("text", { nullable: true })
  address: string | null;

  // ✅ 위도/경도도 nullable 허용
  @Column("float", { nullable: true })
  lat: number | null;

  @Column("float", { nullable: true })
  lon: number | null;

  // ✅ 키워드 JSON 배열 (nullable 허용)
  @Column("simple-json", { nullable: true })
  keywords: string[] | null;

  @Column("int", { default: 0 })
  review_count: number;

  @Column({ type: "float", default: 0, nullable: false })
  total_score: number;

  @Column("float", { default: 0 })
  naver_score: number;

  @Column("text", { nullable: true })
  preview: string | null;

  @Column("text", { nullable: true })
  url: string | null;

  @Column("text", { nullable: true })
  review: string | null;

  @Column({ type: "float", default: 0, nullable: false })
  sentiment_score: number;

  @OneToMany(() => Review, (review) => review.restaurant, { cascade: false })
  reviews: Review[];
}
