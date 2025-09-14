import { RestaurantService } from '../services/restaurant.service';
export declare class RestaurantController {
    private readonly restaurantService;
    constructor(restaurantService: RestaurantService);
    uploadCsv(file: Express.Multer.File): Promise<{
        inserted: number;
    }>;
}
