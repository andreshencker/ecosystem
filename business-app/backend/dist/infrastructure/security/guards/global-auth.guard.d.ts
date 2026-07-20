import { CanActivate, ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../../../modules/users/users.service';
export declare class GlobalAuthGuard implements CanActivate {
    private readonly reflector;
    private readonly jwtService;
    private readonly config;
    private readonly users;
    constructor(reflector: Reflector, jwtService: JwtService, config: ConfigService, users: UsersService);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
