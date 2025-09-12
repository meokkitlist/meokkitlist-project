import { KakaoService } from './kakao.service';
import { SearchKakaoDto } from './dto/search.dto';
export declare class KakaoController {
    private readonly kakaoService;
    constructor(kakaoService: KakaoService);
    searchPlaces(query: SearchKakaoDto): Promise<any>;
    analyzeReview(text: string): Promise<{
        sentiment: string;
        score: number;
    }>;
}
