import { BadGatewayException, BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { EcosystemIdentityService } from '../identity/ecosystem-identity.service';
import type { AuthContext } from '../../infrastructure/security/types/auth-context.types';

@Injectable()
export class GrapiflyTeamService {
  constructor(private readonly http: HttpService, private readonly config: ConfigService, private readonly identity: EcosystemIdentityService) {}

  async list(ctx: AuthContext) {
    const response = await this.request(ctx, 'get', '');
    const items = (response.members ?? []).map((item: any) => this.toRelayUser(item, ctx));
    const invitations = (response.invitations ?? []).map((item: any) => this.toRelayInvitation(item));
    return { items, invitations, total: items.length };
  }

  async invite(ctx: AuthContext, body: { email: string; role: string }) {
    const result = await this.request(ctx, 'post', '/invitations', { email: body.email, role: this.toGrapiflyRole(body.role) });
    return this.invitationResult(result, 'Grapifly invitation created');
  }

  async regenerate(ctx: AuthContext, invitationId: string) {
    const result = await this.request(ctx, 'post', `/invitations/${encodeURIComponent(invitationId)}/regenerate`);
    return this.invitationResult(result, 'A new Grapifly invitation link was generated');
  }

  cancel(ctx: AuthContext, invitationId: string) {
    return this.request(ctx, 'post', `/invitations/${encodeURIComponent(invitationId)}/cancel`);
  }

  updateMember(ctx: AuthContext, grapiflyUserId: string, body: { role?: string; status?: string }) {
    return this.request(ctx, 'patch', `/members/${encodeURIComponent(grapiflyUserId)}`, {
      ...(body.role ? { role: this.toGrapiflyRole(body.role) } : {}),
      ...(body.status ? { status: body.status } : {}),
    });
  }

  private async request(ctx: AuthContext, method: 'get' | 'post' | 'patch', path: string, data?: unknown) {
    const actor = await this.identity.findByIdOrThrow(ctx.userId!);
    if (!actor.grapiflyUserId || !ctx.grapiflyOrganizationId) throw new UnauthorizedException('An active Grapifly organization session is required');
    // Relay's own service-to-service secret, falling back to the legacy shared
    // SSO secret for deployments that haven't set RELAY_SERVICE_SECRET yet —
    // must match whichever value Grapifly hashed for the 'relay' app entry
    // (grapifly/backend/src/applications/applications.service.ts).
    const secret =
      this.config.get<string>('RELAY_SERVICE_SECRET') ??
      this.config.get<string>('GRAPIFLY_SSO_CLIENT_SECRET');
    if (!secret) throw new BadGatewayException('Grapifly integration is not configured');
    const base = (this.config.get<string>('GRAPIFLY_ID_API_URL') ?? 'http://localhost:3101').replace(/\/$/, '');
    const url = `${base}/internal/apps/relay/organizations/${encodeURIComponent(ctx.grapiflyOrganizationId)}/team${path}`;
    try {
      const response = await firstValueFrom(this.http.request({ method, url, data, headers: { 'x-grapifly-sso-secret': secret, 'x-grapifly-user-id': actor.grapiflyUserId }, timeout: 5000 }));
      return response.data;
    } catch (error: any) {
      const status = error?.response?.status;
      const message = error?.response?.data?.message;
      if (status && status < 500) throw new BadRequestException(message ?? 'Grapifly rejected the team request');
      throw new BadGatewayException('Grapifly team service is unavailable');
    }
  }

  private toRelayUser(item: any, ctx: AuthContext) {
    const parts = String(item.user?.displayName ?? '').trim().split(/\s+/).filter(Boolean);
    const firstName = parts.shift() ?? 'Grapifly';
    return {
      id: item.user?.grapiflyUserId, grapiflyUserId: item.user?.grapiflyUserId, identityProvider: 'grapifly', email: item.user?.email,
      firstName, lastName: parts.join(' ') || 'User', avatarUrl: item.user?.avatarUrl ?? null, role: this.toRelayRole(item.access?.role),
      scope: 'company', companyId: ctx.companyId ?? null, companyKey: ctx.companyKey ?? null, isActive: item.access?.status === 'active',
      isEmailVerified: item.user?.emailVerified ?? true, mustChangePassword: false,
      createdAt: item.access?.createdAt ?? item.membership?.createdAt, updatedAt: item.access?.updatedAt ?? item.membership?.updatedAt,
    };
  }

  private toRelayInvitation(item: any) {
    const role = item.applicationRoles?.relay ?? (item.role === 'admin' ? 'admin' : 'viewer');
    return { id: item.invitationId, invitationId: item.invitationId, email: item.email, firstName: '', lastName: '', role: this.toRelayRole(role), companyKey: null, status: item.status, expiresAt: item.expiresAt, createdAt: item.createdAt };
  }

  private invitationResult(result: any, message: string) {
    const frontendUrl = (this.config.get<string>('GRAPIFLY_FRONTEND_URL') ?? 'http://localhost:3100').replace(/\/$/, '');
    return { ...result, invitationId: result.invitation?.invitationId ?? null, email: result.invitation?.email ?? result.email,
      role: this.toRelayRole(result.invitation?.applicationRoles?.relay ?? 'viewer'), emailDelivered: false,
      message: result.accessGranted ? 'Relay access granted to the existing Grapifly member' : message,
      inviteUrl: result.token ? `${frontendUrl}/invitations/${encodeURIComponent(result.token)}` : null };
  }

  private toRelayRole(role: string) { return role === 'owner' ? 'company_owner' : role === 'admin' ? 'company_admin' : role === 'viewer' ? 'viewer' : 'operator'; }
  private toGrapiflyRole(role: string) {
    const normalized = role === 'company_admin' ? 'admin' : role === 'company_owner' ? 'owner' : role;
    if (!['owner', 'admin', 'operator', 'viewer'].includes(normalized)) throw new BadRequestException('Invalid Relay role');
    if (normalized === 'owner') throw new BadRequestException('Organization ownership cannot be granted from Relay Team');
    return normalized;
  }
}
