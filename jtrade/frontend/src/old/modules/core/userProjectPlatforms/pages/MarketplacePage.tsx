import * as React from "react";

import {
    Box,
    CircularProgress,
    Drawer,
    Typography,
    useMediaQuery,
    useTheme,
} from "@mui/material";

import UserProjectPlatformForm from "../components/UserProjectPlatformForm";

import {
    useCreateMyUserProjectPlatform,
    useMyUserProjectPlatforms,
} from "../hooks/useUserProjectPlatforms";

import { useAvailableProjectCodePlatforms } from "@/old/modules/core/projectCodePlatforms/hooks/useProjectCodePlatforms";

import type { CreateUserProjectPlatformDto } from "../types/userProjectPlatforms";

export default function MarketplacePage() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("md"));
    const HEADER_HEIGHT = 56;

    const [open, setOpen] = React.useState(true);

    const qProjectPlatforms = useAvailableProjectCodePlatforms();
    const qMySubscriptions = useMyUserProjectPlatforms();

    const create = useCreateMyUserProjectPlatform();

    const projectPlatforms = qProjectPlatforms.data ?? [];
    const mySubscriptions = qMySubscriptions.data ?? [];

    const subscribedProjectCodePlatformIds = React.useMemo(() => {
        return mySubscriptions.map((item) => item.projectCodePlatformId);
    }, [mySubscriptions]);

    const loading =
        qProjectPlatforms.isLoading ||
        qMySubscriptions.isLoading ||
        create.isPending;

    const handleSubscribe = async (dto: CreateUserProjectPlatformDto) => {
        await create.mutateAsync(dto);
        await Promise.all([
            qProjectPlatforms.refetch(),
            qMySubscriptions.refetch(),
        ]);
    };

    if (loading && projectPlatforms.length === 0) {
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
                    Marketplace
                </Typography>

                <Typography variant="body2" color="text.secondary">
                    Explore available trading projects and subscribe to the ones you want to use.
                </Typography>
            </Box>

            <Box
                sx={{
                    flex: 1,
                    minHeight: 0,
                    overflowY: "auto",
                    overflowX: "hidden",
                    pb: 2,
                }}
            >
                <UserProjectPlatformForm
                    loading={loading}
                    projectPlatforms={projectPlatforms}
                    subscribedProjectCodePlatformIds={subscribedProjectCodePlatformIds}
                    onSubmit={handleSubscribe}
                />
            </Box>

            <Drawer
                anchor={isMobile ? "bottom" : "right"}
                open={false}
                onClose={() => setOpen(false)}
                PaperProps={{
                    sx: {
                        width: isMobile ? "100%" : { md: 660, lg: 760 },
                        maxWidth: "100%",
                        top: isMobile ? "auto" : `${HEADER_HEIGHT}px`,
                        height: isMobile
                            ? "92dvh"
                            : `calc(100vh - ${HEADER_HEIGHT}px)`,
                    },
                }}
            />
        </Box>
    );
}