"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const config_1 = require("@nestjs/config");
const cookieParser = require("cookie-parser");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const config = app.get(config_1.ConfigService);
    const frontendUrl = config.get('FRONTEND_URL') ?? 'http://localhost:3100';
    app.use(cookieParser());
    app.enableCors({ origin: frontendUrl, credentials: true });
    const port = config.get('PORT') ?? 3101;
    await app.listen(port);
    console.log(`Grapifly ID running on port ${port}`);
}
void bootstrap();
//# sourceMappingURL=main.js.map