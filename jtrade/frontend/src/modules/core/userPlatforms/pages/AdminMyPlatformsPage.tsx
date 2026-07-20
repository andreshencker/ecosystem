import * as React from "react";
import { Box, CircularProgress, Stack, Typography } from "@mui/material";

import MyUserPlatformsAddForm from "@/modules/core/userPlatforms/components/MyUserPlatformsAddForm";
import AdminUserPlatformsTable from "@/modules/core/userPlatforms/components/AdminUserPlatformsTable";

import { usePlatforms } from "@/modules/core/platforms/hooks/usePlatforms";
import {
    useMyUserPlatforms,
    useCreateMyUserPlatform,
    useSetDefaultMyUserPlatform,
    useUpdateMyUserPlatform,
    useRemoveMyUserPlatform,
} from "@/modules/core/userPlatforms/hooks/useUserPlatforms";

function getId(x: any) {
    return String(x?.id ?? x?._id ?? "");
}

export default function AdminMyPlatformsPage() {
    const qPlatforms = usePlatforms({ supported: true });
    const qMine = useMyUserPlatforms();

    const mCreate = useCreateMyUserPlatform();
    const mSetDefault = useSetDefaultMyUserPlatform();
    const mUpdate = useUpdateMyUserPlatform();
    const mRemove = useRemoveMyUserPlatform();

    const platforms = React.useMemo(() => {
        return ((qPlatforms.data ?? []) as any[])
            .map((p) => ({
                ...p,
                id: getId(p),
            }))
            .filter((p) => !!p.id && p.isActive === true && p.isSupported === true);
    }, [qPlatforms.data]);

    const loading =
        qMine.isLoading ||
        qPlatforms.isLoading ||
        mCreate.isPending ||
        mSetDefault.isPending ||
        mUpdate.isPending ||
        mRemove.isPending;

    const handleAdd = async (payload: { platformId: string; isDefault?: boolean }) => {
        await mCreate.mutateAsync(payload);
        await qMine.refetch();
    };

    const handleToggleActive = async (row: any, next: boolean) => {
        await mUpdate.mutateAsync({ id: row.id, data: { isActive: next } });
        await qMine.refetch();
    };

    const handleReload = async () => {
        await Promise.all([qPlatforms.refetch(), qMine.refetch()]);
    };

    if (qMine.isLoading && (qMine.data ?? []).length === 0) {
        return (
            <Box
                sx={{
                    height: "100%",
                    minHeight: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box
            sx={{
                width: "100%",
                height: "100%",
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                px: { xs: 1.5, sm: 2, lg: 3 },
                py: { xs: 2, sm: 3 },
                boxSizing: "border-box",
            }}
        >
            <Box sx={{ mb: 2.5, flexShrink: 0 }}>
                <Typography variant="h4" fontWeight={900} sx={{ mb: 0.5 }}>
                    Admin · My Platforms
                </Typography>

                <Typography variant="body2" color="text.secondary">
                    Manage the platform connections associated with your admin user.
                </Typography>
            </Box>

            <Stack spacing={2.5} sx={{ flex: 1, minHeight: 0 }}>
                <Box sx={{ flexShrink: 0 }}>
                    <MyUserPlatformsAddForm
                        platforms={platforms}
                        loading={loading}
                        onAdd={handleAdd}
                    />
                </Box>

                <Box
                    sx={{
                        flex: 1,
                        minHeight: 0,
                        overflow: "hidden",
                    }}
                >
                    <AdminUserPlatformsTable
                        rows={qMine.data ?? []}
                        loading={loading}
                        onRefresh={handleReload}
                        onToggleActive={handleToggleActive}
                    />
                </Box>
            </Stack>
        </Box>
    );
}