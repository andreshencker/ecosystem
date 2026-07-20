import { ConfigService } from '@nestjs/config';
import { Strategy } from 'passport-jwt';
import type { AuthContext } from '../types/auth-context.types';
declare const JwtStrategy_base: new (...args: [opt: import("passport-jwt").StrategyOptionsWithRequest] | [opt: import("passport-jwt").StrategyOptionsWithoutRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class JwtStrategy extends JwtStrategy_base {
    constructor(config: ConfigService);
    validate(payload: {
        sub: string;
        organizationId?: string;
        type?: string;
    }): Promise<AuthContext>;
}
export {};
