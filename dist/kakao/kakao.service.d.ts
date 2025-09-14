export declare class KakaoService {
    private readonly kakaoKey;
    searchPlaces(query: string, lat: number, lng: number, radius: number): Promise<any>;
    analyzeSentiment(text: string): Promise<{
        sentiment: string;
        score: number;
    }>;
}
