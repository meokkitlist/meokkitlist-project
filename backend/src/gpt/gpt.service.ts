// src/gpt/gpt.service.ts

import { Inject, Injectable, Logger } from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";
import OpenAI from "openai";
import * as dotenv from "dotenv";
import { KeywordMapService } from "../services/keyword-map.service";

dotenv.config();

@Injectable()
export class GptService {
  private readonly logger = new Logger(GptService.name);
  private readonly openai: OpenAI;

  private readonly MODEL = process.env.GPT_MODEL?.trim() || "gpt-3.5-turbo";
  private readonly MAX_RETURN = Number(process.env.GPT_KEYWORD_MAX_RETURN ?? 5);
  private readonly CACHE_TTL_SEC = Number(
    process.env.GPT_KEYWORD_CACHE_TTL_SEC ?? 3600,
  ); // 기본 1시간

  constructor(
    private readonly keywordMapService: KeywordMapService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async extractKeywords(sentence: string): Promise<string[]> {
    const normalized = sentence.trim();
    const cacheKey = `gpt:keywords:${normalized}`;

    // 1. 캐시 확인
    try {
      const cached = await this.cacheManager.get<string[]>(cacheKey);
      if (cached) {
        this.logger.log(`🧠 [HIT] Cache 사용: "${cacheKey}"`);
        return cached;
      }
    } catch (err) {
      this.logger.warn(`⚠️ Cache 조회 실패: ${err}`);
    }

    // 2. GPT 프롬프트 구성
    let prompt = "";
    let candidateList: string[] = [];
    const fullKeyList = Array.from(this.keywordMapService.getMap().keys());

    try {
      candidateList = this.keywordMapService.searchKeywords(normalized, 50);
      this.logger.log(`🔑 후보 KEY목록 ${candidateList.length}개 선택`);

      prompt = [
        "너는 음식/식당 키워드 매퍼다.",
        "아래 KEY목록 중에서 사용자가 입력한 단어와 가장 연관된 키워드 1~5개를 JSON 배열로 출력하라.",
        "⚠️ 입력 단어가 KEY목록에 있으면 그대로 선택해도 된다.",
        "⚠️ 입력 단어가 목록에 없으면 가장 가까운 의미의 키워드를 골라야 한다.",
        "⚠️ KEY목록에 전혀 없으면, 새로운 연관 키워드를 직접 만들어도 된다.",
        "⚠️ 반드시 JSON 배열만 반환해야 한다. 예: [\"삼겹살\", \"고기\"]",
        `KEY목록: ${JSON.stringify(candidateList)}`,
        `사용자 입력: "${normalized}"`,
      ].join("\n");
    } catch (err) {
      this.logger.error("❌ KEY목록 구성 실패", err as any);
      throw new Error("KEY목록 구성 실패");
    }

    let keywords: string[] = [];

    // 3. GPT 호출
    try {
      this.logger.log(`🤖 GPT 호출 시작 (model: ${this.MODEL})`);
      const response = await this.openai.chat.completions.create({
        model: this.MODEL,
        messages: [
          { role: "system", content: "너는 음식/식당 키워드 매퍼다." },
          { role: "user", content: prompt },
        ],
        temperature: 0,
        max_tokens: 150,
      });

      const raw = response.choices[0]?.message?.content?.trim() ?? "[]";
      this.logger.debug(`📥 GPT raw=${raw}`);
      keywords = this.parseKeywordsFromResponse(raw);

      // ✅ 더 이상 DB 교차 필터링 안 함
      if (!Array.isArray(keywords) || keywords.length === 0) {
        this.logger.warn(`⚠️ GPT 응답 무효, fallback 사용. raw="${raw}"`);
        keywords = this.keywordMapService.searchKeywords(
          normalized,
          this.MAX_RETURN,
        );
      }
    } catch (err) {
      this.logger.error("❌ GPT 호출 실패, fallback 사용", err as any);
      keywords = this.keywordMapService.searchKeywords(
        normalized,
        this.MAX_RETURN,
      );
    }

    // 4. 정규화 + 중복 제거
    keywords = this.normalizeKeywordList(keywords).slice(0, this.MAX_RETURN);

    // 5. 캐시에 저장
    try {
      await this.cacheManager.set(cacheKey, keywords, this.CACHE_TTL_SEC);
      this.logger.log(`✅ [SET] Cache 저장 완료: "${cacheKey}"`);
    } catch (err) {
      this.logger.warn(`⚠️ Cache 저장 실패: ${err}`);
    }

    return keywords;
  }

  // -------------------- 내부 유틸 --------------------

  private parseKeywordsFromResponse(raw: string): string[] {
    try {
      const match = raw.match(/\[.*\]/s);
      if (match) {
        const arr = JSON.parse(match[0]);
        if (Array.isArray(arr)) {
          const parsed = arr.map(String);
          this.logger.debug(`✅ GPT 파싱 결과: ${JSON.stringify(parsed)}`);
          return parsed;
        }
      }
    } catch (err) {
      this.logger.warn(`⚠️ GPT 응답 JSON 파싱 실패: ${err}`);
    }

    if (raw.includes(",")) {
      const fallbackParsed = raw
        .split(",")
        .map((s) => s.trim().replace(/^"|"$/g, ""))
        .filter(Boolean);
      this.logger.debug(
        `🔁 쉼표 기반 fallback 파싱 결과: ${JSON.stringify(fallbackParsed)}`,
      );
      return fallbackParsed;
    }

    const only = raw.replace(/^\[|\]$/g, "").trim().replace(/^"|"$/g, "");
    return only ? [only] : [];
  }

  private normalizeKeywordList(arr: unknown[]): string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const v of arr) {
      if (v == null) continue;
      const s = String(v).trim();
      if (!s || seen.has(s)) continue;
      seen.add(s);
      out.push(s);
    }
    return out;
  }
}
