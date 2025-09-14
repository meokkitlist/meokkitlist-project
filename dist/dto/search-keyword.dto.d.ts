export declare class PositionDto {
    lat: number;
    lon: number;
}
export declare class SearchKeywordDto {
    keyword: string;
    userPosition?: PositionDto;
    range?: number;
}
