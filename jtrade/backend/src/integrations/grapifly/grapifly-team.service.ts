import { HttpService } from '@nestjs/axios';
import { BadGatewayException, BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

/**
 * Shape returned by Grapifly's getApplicationTeam(): one entry per active
 * membership that also holds jtrade app access. `membership.role` is the
 * org-level role (owner/admin/member) the Team page cares about; `access`
 * is the per-app grant whose `status` we can suspend/revoke.
 */
export interface GrapiflyTeamMember {
  membership: { role: 'owner' | 'admin' | 'member'; status: string; createdAt: string; updatedAt: string };
  access: { role: string; status: string; createdAt: string; updatedAt: string };
  user: { grapiflyUserId: string; email: string; displayName: string; avatarUrl: string | null };
}

export interface GrapiflyTeamInvitation {
  invitationId: string;
  email: string;
  role: 'owner' | 'admin' | 'member';
  status: string;
  expiresAt: string;
  createdAt: string;
}

/**
 * jtrade's Team page is a thin pass-through to Grapifly's own app-scoped team
 * endpoints (grapifly/backend/src/organizations/app-team.controller.ts) —
 * same server-to-server pattern as grapifly-organization.service.ts. Grapifly
 * owns all invite/member state; nothing is persisted locally in jtrade.
 */
@Injectable()
export class GrapiflyTeamService {
  constructor(private readonly http: HttpService, private readonly config: ConfigService) {}

  async list(organizationId: string, grapiflyUserId: string) {
    const response = await this.request<{ members?: GrapiflyTeamMember[]; invitations?: GrapiflyTeamInvitation[] }>(
      'get', organizationId, grapiflyUserId, '',
    );
    return {
      members: (response.members ?? []).map((item) => this.toMember(item)),
      invitations: response.invitations ?? [],
    };
  }

  async invite(organizationId: string, grapiflyUserId: string, body: { email: string; role: 'admin' | 'member' }) {
    const result = await this.request<{ invitation: GrapiflyTeamInvitation; accessGranted?: boolean; token?: string }>(
      'post', organizationId, grapiflyUserId, '/invitations', { email: body.email, role: body.role },
    );
    return this.invitationResult(result);
  }

  async regenerate(organizationId: string, grapiflyUserId: string, invitationId: string) {
    const result = await this.request<{ invitation: GrapiflyTeamInvitation; token?: string }>(
      'post', organizationId, grapiflyUserId, `/invitations/${encodeURIComponent(invitationId)}/regenerate`,
    );
    return this.invitationResult(result);
  }

  cancel(organizationId: string, grapiflyUserId: string, invitationId: string) {
    return this.request('post', organizationId, grapiflyUserId, `/invitations/${encodeURIComponent(invitationId)}/cancel`);
  }

  updateMember(organizationId: string, grapiflyUserId: string, targetGrapiflyUserId: string, body: { role?: 'admin' | 'member'; status?: string }) {
    return this.request('patch', organizationId, grapiflyUserId, `/members/${encodeURIComponent(targetGrapiflyUserId)}`, {
      ...(body.role ? { role: body.role } : {}),
      ...(body.status ? { status: body.status } : {}),
    });
  }

  private async request<T = any>(
    method: 'get' | 'post' | 'patch',
    organizationId: string,
    grapiflyUserId: string,
    path: string,
    data?: unknown,
  ): Promise<T> {
    const secret = this.config.get<string>('JTRADE_SERVICE_SECRET');
    if (!secret) throw new BadGatewayException('Grapifly integration is not configured');
    const base = (this.config.get<string>('GRAPIFLY_ID_API_URL') ?? 'http://localhost:3101').replace(/\/$/, '');
    const url = `${base}/internal/apps/jtrade/organizations/${encodeURIComponent(organizationId)}/team${path}`;
    try {
      const response = await firstValueFrom(this.http.request<T>({
        method,
        url,
        data,
        headers: {
          'x-ecosystem-app': 'jtrade',
          'x-ecosystem-secret': secret,
          'x-ecosystem-actor': grapiflyUserId,
        },
        timeout: 5000,
      }));
      return response.data;
    } catch (error: any) {
      const status = error?.response?.status;
      const message = error?.response?.data?.message;
      if (status && status < 500) throw new BadRequestException(message ?? 'Grapifly rejected the team request');
      throw new ServiceUnavailableException('Grapifly team service is unavailable');
    }
  }

  private toMember(item: GrapiflyTeamMember) {
    return {
      grapiflyUserId: item.user?.grapiflyUserId,
      email: item.user?.email,
      displayName: item.user?.displayName,
      avatarUrl: item.user?.avatarUrl ?? null,
      role: item.membership?.role ?? item.access?.role,
      status: item.access?.status ?? item.membership?.status,
      createdAt: item.membership?.createdAt ?? item.access?.createdAt,
      updatedAt: item.access?.updatedAt ?? item.membership?.updatedAt,
    };
  }

  private invitationResult(result: any) {
    const frontendUrl = (this.config.get<string>('GRAPIFLY_FRONTEND_URL') ?? 'http://localhost:3100').replace(/\/$/, '');
    return {
      ...result,
      inviteUrl: result.token ? `${frontendUrl}/invitations/${encodeURIComponent(result.token)}` : null,
    };
  }
}
