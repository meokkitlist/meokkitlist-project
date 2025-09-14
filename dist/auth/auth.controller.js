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
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const auth_service_1 = require("./auth.service");
const dto_1 = require("./dto");
const jwt_cookie_guard_1 = require("./jwt-cookie.guard");
const config_1 = require("@nestjs/config");
let AuthController = class AuthController {
    auth;
    cfg;
    constructor(auth, cfg) {
        this.auth = auth;
        this.cfg = cfg;
    }
    async signup(dto) {
        await this.auth.signup(dto.email, dto.password);
        return '회원가입 완료';
    }
    async login(dto, res) {
        const { token } = await this.auth.login(dto.email, dto.password);
        res.cookie('token', token, {
            httpOnly: true,
            sameSite: 'lax',
            secure: this.cfg.get('NODE_ENV') === 'production',
            domain: this.cfg.get('COOKIE_DOMAIN') || undefined,
            maxAge: 1000 * 60 * 15,
            path: '/',
        });
        return '로그인 성공';
    }
    me(res) {
        const req = res.req;
        return { email: req.user.email };
    }
    logout(res) {
        res.clearCookie('token', {
            httpOnly: true,
            sameSite: 'lax',
            secure: this.cfg.get('NODE_ENV') === 'production',
            domain: this.cfg.get('COOKIE_DOMAIN') || undefined,
            path: '/',
        });
        return '로그아웃 완료';
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Post)('signup'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.SignupDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "signup", null);
__decorate([
    (0, common_1.HttpCode)(200),
    (0, common_1.Post)('login'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.LoginDto, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, common_1.UseGuards)(jwt_cookie_guard_1.JwtCookieGuard),
    (0, common_1.Get)('me'),
    __param(0, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "me", null);
__decorate([
    (0, common_1.HttpCode)(200),
    (0, common_1.Post)('logout'),
    __param(0, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "logout", null);
exports.AuthController = AuthController = __decorate([
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService, config_1.ConfigService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map