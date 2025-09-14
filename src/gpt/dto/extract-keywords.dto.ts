// src/gpt/dto/extract-keywords.dto.ts
import { IsNotEmpty, IsString } from 'class-validator';

export class ExtractKeywordsDto {
  @IsString()
  @IsNotEmpty()
  sentence: string;
}
