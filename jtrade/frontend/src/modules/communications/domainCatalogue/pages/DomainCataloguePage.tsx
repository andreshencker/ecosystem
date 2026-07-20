import * as React from "react";
import {
    Box,
    Button,
    CircularProgress,
    Drawer,
    IconButton,
    Stack,
    Tooltip,
    Typography,
    useMediaQuery,
    useTheme,
} from "@mui/material";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";

import DomainCatalogueTable from "../components/DomainCatalogueTable";
import DomainCatalogueForm from "../components/DomainCatalogueForm";

import {
    COMPANY_ID,
    useCreateDomainCatalogue,
    useDeleteDomainCatalogue,
    useDomainCatalogue,
    useUpdateDomainCatalogue,
} from "../hooks/useDomainCatalogue";

import { useProviderCredentialOptions } from "@/modules/communications/providerCredentials/hooks/useProviderCredentials";

import type {
    CreateDomainCatalogueDto,
    DomainCatalogue,
    UpdateDomainCatalogueDto,
} from "../types/domainCatalogue.types";

type DrawerMode = "create" | "edit" | "view";

export default function DomainCataloguePage() {
    const muiTheme = useTheme();
    const isMobile = useMediaQuery(muiTheme.breakpoints.down("md"));

    const q = useDomainCatalogue();

    const credentialsQuery = useProviderCredentialOptions({
        companyId: COMPANY_ID,
        active: true,
    });

    const createDomain = useCreateDomainCatalogue();
    const updateDomain = useUpdateDomainCatalogue();
    const deleteDomain = useDeleteDomainCatalogue();

    const [open, setOpen] = React.useState(false);
    const [mode, setMode] = React.useState<DrawerMode>("create");
    const [selected, setSelected] = React.useState<DomainCatalogue | null>(null);

    const pending =
        createDomain.isPending ||
        updateDomain.isPending ||
        deleteDomain.isPending;

    const openCreate = () => {
        setSelected(null);
        setMode("create");
        setOpen(true);
    };

    const openEdit = (row: DomainCatalogue) => {
        setSelected(row);
        setMode("edit");
        setOpen(true);
    };

    const openView = (row: DomainCatalogue) => {
        setSelected(row);
        setMode("view");
        setOpen(true);
    };

    const close = () => {
        setSelected(null);
        setMode("create");
        setOpen(false);
    };

    const handleSubmit = async (
        values: CreateDomainCatalogueDto | UpdateDomainCatalogueDto
    ) => {
        if (mode === "view") {
            close();
            return;
        }

        if (mode === "edit" && selected) {
            await updateDomain.mutateAsync({
                id: selected.id,
                data: values as UpdateDomainCatalogueDto,
            });

            close();
            return;
        }

        await createDomain.mutateAsync(values as CreateDomainCatalogueDto);
        close();
    };

    if (!COMPANY_ID) {
        return (
            <Box sx={{ p: 3 }}>
                <Typography color="error.main">
                    Missing VITE_SYSTEM_COMPANY_ID environment variable.
                </Typography>
            </Box>
        );
    }

    if (q.isLoading) {
        return (
            <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box
            sx={{
                width: "100%",
                minHeight: "100%",
                px: { xs: 1.5, sm: 2, lg: 3 },
                py: { xs: 2, sm: 3 },
                boxSizing: "border-box",
                overflowX: "hidden",
            }}
        >
            <Stack spacing={2.5}>
                <Box>
                    <Typography variant="h4" fontWeight={900} sx={{ mb: 0.5 }}>
                        Domain Catalogue
                    </Typography>

                    <Typography variant="body2" color="text.secondary">
                        Manage communication domains and channels for the current company.
                    </Typography>
                </Box>

                <Box>
                    <Box
                        sx={{
                            mb: 1.25,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 1,
                        }}
                    >
                        <Box>
                            <Typography variant="h6" fontWeight={800}>
                                Domains
                            </Typography>

                            <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ mt: 0.25 }}
                            >
                                Create, update and remove communication domains.
                            </Typography>
                        </Box>

                        <Stack direction="row" spacing={1} alignItems="center">
                            <Button
                                startIcon={<AddRoundedIcon fontSize="small" />}
                                variant="contained"
                                color="warning"
                                onClick={openCreate}
                                sx={{
                                    textTransform: "none",
                                    fontWeight: 900,
                                    borderRadius: 3,
                                    boxShadow: "none",
                                    px: 2,
                                    whiteSpace: "nowrap",
                                    color: "#fff",
                                }}
                            >
                                Create domain
                            </Button>

                            <Tooltip title="Reload">
                                <span>
                                    <IconButton
                                        size="small"
                                        onClick={() => {
                                            q.refetch();
                                            credentialsQuery.refetch();
                                        }}
                                        disabled={q.isFetching || pending}
                                    >
                                        <RefreshRoundedIcon
                                            fontSize="small"
                                            sx={{
                                                transform: q.isFetching
                                                    ? "rotate(90deg)"
                                                    : "none",
                                                transition: "transform 0.2s ease-out",
                                            }}
                                        />
                                    </IconButton>
                                </span>
                            </Tooltip>
                        </Stack>
                    </Box>

                    <DomainCatalogueTable
                        rows={q.data ?? []}
                        loading={q.isFetching || pending}
                        onView={openView}
                        onEdit={openEdit}
                        onDelete={(row) => deleteDomain.mutateAsync(row.id)}
                    />
                </Box>
            </Stack>

            <Drawer
                anchor={isMobile ? "bottom" : "right"}
                open={open}
                onClose={close}
                PaperProps={{
                    sx: {
                        width: isMobile ? "100%" : { md: 860, lg: 980 },
                        maxWidth: "100%",
                        height: isMobile ? "85vh" : "100%",
                        minHeight: 0,
                        display: "flex",
                        flexDirection: "column",
                        overflow: "hidden",
                    },
                }}
            >
                <Box
                    sx={{
                        flex: 1,
                        minHeight: 0,
                        overflowY: "auto",
                        overflowX: "hidden",
                        p: { xs: 1.5, sm: 2, md: 2.5 },
                    }}
                >
                    <DomainCatalogueForm
                        initial={selected}
                        companyId={COMPANY_ID}
                        mode={mode}
                        loading={pending}
                        credentialsLoading={credentialsQuery.isLoading}
                        credentialOptions={credentialsQuery.data ?? []}
                        onSubmit={handleSubmit}
                        onCancel={close}
                    />
                </Box>
            </Drawer>
        </Box>
    );
}