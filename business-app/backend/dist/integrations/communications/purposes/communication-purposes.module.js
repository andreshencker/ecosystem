"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommunicationPurposesModule = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const communications_module_1 = require("../communications.module");
const communication_purposes_service_1 = require("./communication-purposes.service");
const communication_purposes_controller_1 = require("./communication-purposes.controller");
let CommunicationPurposesModule = class CommunicationPurposesModule {
};
exports.CommunicationPurposesModule = CommunicationPurposesModule;
exports.CommunicationPurposesModule = CommunicationPurposesModule = __decorate([
    (0, common_1.Module)({
        imports: [
            axios_1.HttpModule,
            communications_module_1.CommunicationsModule,
        ],
        controllers: [communication_purposes_controller_1.CommunicationPurposesController],
        providers: [communication_purposes_service_1.CommunicationPurposesService],
    })
], CommunicationPurposesModule);
//# sourceMappingURL=communication-purposes.module.js.map