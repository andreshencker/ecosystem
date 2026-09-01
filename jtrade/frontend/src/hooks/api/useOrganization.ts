// src/hooks/api/useOrganization.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api } from "@/lib/http";
import { errorToMessage } from "@/lib/utils";
import type { Organization, OrganizationPatch } from "@/types/organization";

type Envelope<T> = { status: string; data: T };

const KEY = ["organization", "current"];

export function useCurrentOrganization() {
    return useQuery<Organization | null>({
        queryKey: KEY,
        queryFn: () =>
            api.get<Envelope<{ organization: Organization }>>("/organizations/current").then((r) => r.data.data.organization),
        refetchOnWindowFocus: false,
        retry: 1,
        staleTime: 0,
    });
}

export function useUpdateOrganizationMutation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (patch: OrganizationPatch) =>
            api.patch<Envelope<{ organization: Organization }>>("/organizations/current", patch).then((r) => r.data.data.organization),
        onSuccess: (organization) => {
            qc.setQueryData(KEY, organization);
            qc.invalidateQueries({ queryKey: KEY });
            toast.success("Organization updated.");
        },
        onError: (err) => toast.error(errorToMessage(err, "Could not update the organization.")),
    });
}
