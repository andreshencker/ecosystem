import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
    Box,
    CircularProgress,
    Drawer,
    Typography,
    useMediaQuery,
    useTheme,
} from "@mui/material";

import { api } from "@/app/lib/http";

import IndicatorProjectForm from "../components/IndicatorProjectForm";
import IndicatorProjectsTable from "../components/IndicatorProjectsTable";

import {
    useCreateMyIndicatorProject,
    useMyIndicatorProjects,
    useRemoveMyIndicatorProject,
    useUpdateMyIndicatorProject,
} from "../hooks/useIndicatorProjects";

import { useIndicators } from "@/modules/core/indicators/hooks/useIndicators";
import { useMyCompanyProvider } from "@/modules/core/companyProviders/hooks/useCompanyProviders";

import type {
    CreateIndicatorProjectDto,
    IndicatorProject,
    UpdateIndicatorProjectDto,
} from "../types/indicatorProjects";

import type { ProjectCodePlatform } from "@/modules/core/projectCodePlatforms/types/projectCodePlatforms";

function unwrap<T>(resp: any): T {
    return (resp?.data?.data ?? resp?.data) as T;
}

function normalizeProjectCodePlatform(item: any): ProjectCodePlatform {
    return {
        ...item,
        id: item.id ?? item._id,
    };
}

async function listMyProjectCodePlatforms(): Promise<ProjectCodePlatform[]> {
    const resp = await api.get("/project-code-platforms/my", {
        params: { _t: Date.now() },
    });

    const raw = unwrap<ProjectCodePlatform[] | any[]>(resp) ?? [];
    return raw.map(normalizeProjectCodePlatform);
}

export default function ProviderIndicatorProjectsPage() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("md"));
    const HEADER_HEIGHT = 56;

    const qCompany = useMyCompanyProvider();
    const companyProviderId = qCompany.data?.id ?? "";

    const qProjectCodePlatforms = useQuery({
        queryKey: ["project-code-platforms", "my"],
        queryFn: listMyProjectCodePlatforms,
        enabled: !!companyProviderId,
        retry: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        staleTime: 0,
    });

    const qIndicators = useIndicators(
        companyProviderId ? { companyProviderId } : undefined,
        { enabled: !!companyProviderId },
    );

    const qRows = useMyIndicatorProjects();

    const mCreate = useCreateMyIndicatorProject();
    const mUpdate = useUpdateMyIndicatorProject();
    const mDelete = useRemoveMyIndicatorProject();

    const [editing, setEditing] = React.useState<IndicatorProject | null>(null);
    const [openForm, setOpenForm] = React.useState(false);

    const rows = qRows.data ?? [];

    const loading =
        qCompany.isFetching ||
        qProjectCodePlatforms.isFetching ||
        qIndicators.isFetching ||
        qRows.isFetching ||
        mCreate.isPending ||
        mUpdate.isPending ||
        mDelete.isPending;

    const refresh = async () => {
        await Promise.all([
            qCompany.refetch(),
            qProjectCodePlatforms.refetch(),
            qIndicators.refetch(),
            qRows.refetch(),
        ]);
    };

    const closeForm = () => {
        setEditing(null);
        setOpenForm(false);
    };

    const handleSubmit = async (
        values: CreateIndicatorProjectDto | UpdateIndicatorProjectDto,
    ) => {
        if (editing) {
            await mUpdate.mutateAsync({
                id: editing.id,
                data: values as UpdateIndicatorProjectDto,
            });
        } else {
            await mCreate.mutateAsync(values as CreateIndicatorProjectDto);
        }

        await refresh();
        closeForm();
    };

    const initialLoading =
        (qCompany.isFetching && !qCompany.data) ||
        (qProjectCodePlatforms.isFetching && !qProjectCodePlatforms.data) ||
        (qIndicators.isFetching && !qIndicators.data) ||
        (qRows.isFetching && !qRows.data);

    if (initialLoading) {
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
                <Typography
                    variant="h4"
                    fontWeight={900}
                    sx={{
                        fontSize: { xs: "2rem", md: "2.4rem" },
                        lineHeight: 1.1,
                    }}
                >
                    Indicator Projects
                </Typography>

                <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 0.6 }}
                >
                    Connect indicators with project platforms.
                </Typography>
            </Box>

            <Box
                sx={{
                    flex: 1,
                    minHeight: 0,
                    overflow: "hidden",
                }}
            >
                <IndicatorProjectsTable
                    rows={rows}
                    loading={loading}
                    adminMode={false}
                    onRefresh={refresh}
                    onAdd={() => {
                        setEditing(null);
                        setOpenForm(true);
                    }}
                    onEdit={(row) => {
                        setEditing(row);
                        setOpenForm(true);
                    }}
                    onDelete={async (row) => {
                        await mDelete.mutateAsync(row.id);
                        await refresh();
                    }}
                />
            </Box>

            <Drawer
                anchor={isMobile ? "bottom" : "right"}
                open={openForm}
                onClose={closeForm}
                PaperProps={{
                    sx: {
                        width: isMobile ? "100%" : { md: 620, lg: 720 },
                        maxWidth: "100%",
                        top: isMobile ? "auto" : `${HEADER_HEIGHT}px`,
                        height: isMobile
                            ? "92dvh"
                            : `calc(100vh - ${HEADER_HEIGHT}px)`,
                        minHeight: isMobile
                            ? "92dvh"
                            : `calc(100vh - ${HEADER_HEIGHT}px)`,
                        borderTopLeftRadius: isMobile ? 16 : 0,
                        borderTopRightRadius: isMobile ? 16 : 0,
                        overflowY: "auto",
                        overflowX: "hidden",
                        p: { xs: 1.5, sm: 2, md: 2.5 },
                    },
                }}
            >
                <IndicatorProjectForm
                    mode={editing ? "edit" : "create"}
                    initial={editing}
                    loading={loading}
                    projectCodePlatforms={qProjectCodePlatforms.data ?? []}
                    indicators={qIndicators.data ?? []}
                    onSubmit={handleSubmit}
                    onCancel={closeForm}
                />
            </Drawer>
        </Box>
    );
}