import { Injectable, Logger } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import { KeywordMapService } from './keyword-map.service'; // ✅ Map 재생성용

const execAsync = promisify(exec);

@Injectable()
export class KeywordExtractionService {
  private readonly logger = new Logger(KeywordExtractionService.name);

  constructor(
    private readonly keywordMapService: KeywordMapService,
  ) {}

  /**
   * ✅ Python 스크립트를 실행하여 키워드 추출
   * @param restaurantId 선택적으로 식당 ID만 처리
   */
  async runExtractorScript(restaurantId?: number): Promise<void> {
    const scriptPath = 'backend/scripts/keyword_extractor.py';
    const cmd = restaurantId
      ? `python ${scriptPath} ${restaurantId}`
      : `python ${scriptPath}`;

    this.logger.log(`🚀 키워드 추출 스크립트 실행: ${cmd}`);

    try {
      const { stdout, stderr } = await execAsync(cmd);
      if (stdout.trim()) this.logger.debug(`📤 Python stdout: ${stdout.trim()}`);
      if (stderr.trim()) this.logger.warn(`⚠️ Python stderr: ${stderr.trim()}`);
    } catch (err: any) {
      this.logger.error(`❌ 키워드 추출 스크립트 실패: ${err.message}`);
      throw err;
    }

    // ✅ 스크립트 성공 시 → Map 재빌드
    try {
      this.logger.log('🔁 키워드 Map 재생성 중...');
      await this.keywordMapService.buildKeywordMap();
      this.logger.log('✅ 키워드 Map 최신화 완료');
    } catch (err) {
      this.logger.warn('⚠️ Map 재생성 실패', err);
    }
  }
}
