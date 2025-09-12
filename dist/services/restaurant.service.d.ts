import { Repository } from 'typeorm';
import { Restaurant } from '../entities/restaurant.entity';
import { CreateRestaurantDto } from '../dto/create-restaurant.dto';
export declare class RestaurantService {
    private readonly restaurantRepo;
    private readonly logger;
    constructor(restaurantRepo: Repository<Restaurant>);
    create(data: CreateRestaurantDto): Promise<Restaurant>;
    uploadCsv(filePath: string): Promise<{
        inserted: number;
    }>;
}
