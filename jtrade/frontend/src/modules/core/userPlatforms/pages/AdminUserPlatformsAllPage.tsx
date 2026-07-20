import * as React from "react";
import { Box } from "@mui/material";

import AdminUserPlatformsFilters from "@/modules/core/userPlatforms/components/AdminUserPlatformsFilters";
import AdminUserPlatformsTable from "@/modules/core/userPlatforms/components/AdminUserPlatformsTable";

import {
    useAdminUserPlatforms,
    type ListAllUserPlatformsParams,
} from "@/modules/core/userPlatforms/hooks/useUserPlatforms";

const DEFAULT_FILTERS: ListAllUserPlatformsParams = {
    userId: undefined,
    platformId: undefined,
    isActive: undefined,
    role: undefined,
};

export default function AdminUserPlatformsAllPage() {
    const [filters, setFilters] = React.useState<ListAllUserPlatformsParams>(DEFAULT_FILTERS);
    const [applied, setApplied] = React.useState<ListAllUserPlatformsParams>(DEFAULT_FILTERS);

    const q = useAdminUserPlatforms(applied);

    const handleApply = () => setApplied(filters);

    const handleReset = () => {
        setFilters(DEFAULT_FILTERS);
        setApplied(DEFAULT_FILTERS);
    };

    return (
        <Box sx={{ maxWidth: 1080, mx: "auto", mt: 3 }}>
            <AdminUserPlatformsFilters
                value={filters}
                onChange={setFilters}
                onApply={handleApply}
                onReset={handleReset}
                showUserId
            />

            <AdminUserPlatformsTable
                rows={q.data ?? []}
                loading={q.isFetching}
                onRefresh={() => q.refetch()}
            />
        </Box>
    );
}