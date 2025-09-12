"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisController = void 0;
const common_1 = require("@nestjs/common");
const ioredis_1 = require("@nestjs-modules/ioredis");
const ioredis_2 = require("ioredis");
let RedisController = class RedisController {
    redis;
    constructor(redis) {
        this.redis = redis;
    }
    async ping() {
        return await this.redis.ping();
    }
    async get(key) {
        const value = await this.redis.get(key);
        try {
            return JSON.parse(value ?? 'null');
        }
        catch {
            return value;
        }
    }
    async ttl(key) {
        return await this.redis.ttl(key);
    }
};
exports.RedisController = RedisController;
__decorate([
    (0, common_1.Get)('ping'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], RedisController.prototype, "ping", null);
__decorate([
    (0, common_1.Get)('get'),
    __param(0, (0, common_1.Query)('key')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], RedisController.prototype, "get", null);
__decorate([
    (0, common_1.Get)('ttl'),
    __param(0, (0, common_1.Query)('key')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], RedisController.prototype, "ttl", null);
exports.RedisController = RedisController = __decorate([
    (0, common_1.Controller)('redis'),
    __param(0, (0, ioredis_1.InjectRedis)()),
    __metadata("design:paramtypes", [ioredis_2.Redis])
], RedisController);
//# sourceMappingURL=redis.controller.js.map