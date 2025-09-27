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
    try {
      // 🔑 후보 KEY목록 줄여서 전달 (연관성 높은 50개만)
      candidateList = this.keywordMapService.searchKeywords(normalized, 50);
      this.logger.log(
        `🔑 후보 KEY목록 ${candidateList.length}개 선택 (검색 기반)`
      );

      prompt = [
        "너는 음식/식당 키워드 매퍼다.",
        "다음 KEY목록 중에서 사용자가 입력한 단어와 가장 연관된 키워드 1~5개를 선택하라.",
        "⚠️ 입력 단어가 KEY목록에 있으면 그대로 선택해도 된다.",
        "⚠️ 입력 단어가 목록에 없으면 반드시 가장 가까운 의미의 키워드를 골라야 한다.",
        "⚠️ 반드시 KEY목록 안에서만 골라라.",
        "⚠️ 반드시 JSON 배열 형식으로만 출력하라. 예시: [\"짜장면\", \"중화요리\"]",
        "⚠️ 설명, 문장, 불필요한 글자는 출력하지 마라.",
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
          { role: "system", content: "너는 키워드 추출기다." },
          { role: "user", content: prompt },
        ],
        temperature: 0,
        max_tokens: 150,
      });

      const raw = response.choices[0]?.message?.content?.trim() ?? "[]";
      this.logger.debug(`📥 GPT raw=${raw}`);
      keywords = this.parseKeywordsFromResponse(raw);

      // ⚠️ KEY목록 교차 검증 (GPT가 엉뚱한 거 줄 수 있음)
      keywords = keywords.filter((k) => candidateList.includes(k));

      if (!Array.isArray(keywords) || keywords.length === 0) {
        this.logger.warn(`⚠️ GPT 응답 파싱 실패/무효, fallback 사용. raw="${raw}"`);
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
      // JSON 배열만 추출
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

    // 쉼표 기반 파싱
    if (raw.includes(",")) {
      const fallbackParsed = raw
        .split(",")
        .map((s) => s.trim().replace(/^"|"$/g, ""))
        .filter(Boolean);
      this.logger.debug(
        `🔁 쉼표 기반 fallback 파싱 결과: ${JSON.stringify(fallbackParsed)}`
      );
      return fallbackParsed;
    }

    // 단일 키워드
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
