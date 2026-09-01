// src/hooks/api/useTeam.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/http";
import type { InviteResult, InviteTeamMemberPayload, TeamList, UpdateTeamMemberPayload } from "@/types/team";

type Envelope<T> = { status: string; data: T };

const BASE = "/team";
const KEY = ["team"];

export function useTeam() {
    return useQuery<TeamList>({
        queryKey: KEY,
        queryFn: () => api.get<Envelope<TeamList>>(BASE).then((r) => r.data.data),
        placeholderData: { members: [], invitations: [] },
        refetchOnMount: "always",
        refetchOnWindowFocus: false,
        retry: 1,
        staleTime: 0,
    });
}

export function useInviteTeamMember() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (payload: InviteTeamMemberPayload) =>
            api.post<Envelope<InviteResult>>(`${BASE}/invitations`, payload).then((r) => r.data.data),
        onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
    });
}

export function useRegenerateInvitation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (invitationId: string) =>
            api.post<Envelope<InviteResult>>(`${BASE}/invitations/${invitationId}/regenerate`).then((r) => r.data.data),
        onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
    });
}

export function useCancelInvitation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (invitationId: string) => api.post(`${BASE}/invitations/${invitationId}/cancel`),
        onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
    });
}

export function useUpdateTeamMember() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (args: { grapiflyUserId: string; data: UpdateTeamMemberPayload }) =>
            api.patch(`${BASE}/members/${args.grapiflyUserId}`, args.data),
        onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
    });
}
