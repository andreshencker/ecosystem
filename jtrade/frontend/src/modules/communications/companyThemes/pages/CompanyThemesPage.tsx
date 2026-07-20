import * as React from "react";
import {
    Box,
    CircularProgress,
    Drawer,
    IconButton,
    Stack,
    Tooltip,
    Typography,
    useMediaQuery,
    useTheme,
    Button,
} from "@mui/material";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";

import CompanyThemeForm from "../components/CompanyThemeForm";
import CompanyThemesTable from "../components/CompanyThemesTable";

import {
    useCompanyThemes,
    useCreateCompanyTheme,
    useDeleteCompanyTheme,
    useUpdateCompanyTheme,
} from "../hooks/useCompanyThemes";

import type { CompanyTheme } from "../types/companyThemes.types";

const COMPANY_ID = import.meta.env.VITE_SYSTEM_COMPANY_ID;

type DrawerMode = "create" | "edit" | "view";

export default function CompanyThemesPage() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("md"));
    const HEADER_HEIGHT = 56;

    const q = useCompanyThemes();
    const createTheme = useCreateCompanyTheme();
    const updateTheme = useUpdateCompanyTheme();
    const deleteTheme = useDeleteCompanyTheme();

    const [openForm, setOpenForm] = React.useState(false);
    const [drawerMode, setDrawerMode] = React.useState<DrawerMode>("create");
    const [selected, setSelected] = React.useState<CompanyTheme | null>(null);

    const pending =
        createTheme.isPending ||
        updateTheme.isPending ||
        deleteTheme.isPending;

    const handleAdd = () => {
        setSelected(null);
        setDrawerMode("create");
        setOpenForm(true);
    };

    const handleView = (row: CompanyTheme) => {
        setSelected(row);
        setDrawerMode("view");
        setOpenForm(true);
    };

    const handleEdit = (row: CompanyTheme) => {
        setSelected(row);
        setDrawerMode("edit");
        setOpenForm(true);
    };

    const handleCloseForm = () => {
        setSelected(null);
        setDrawerMode("create");
        setOpenForm(false);
    };

    const handleDelete = async (row: CompanyTheme) => {
        await deleteTheme.mutateAsync(row.id);
        await q.refetch();
    };

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
                        Company Themes
                    </Typography>

                    <Typography variant="body2" color="text.secondary">
                        Manage theme presets for the current company and configure default branding styles.
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
                                Themes
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                                Create, update and remove company themes.
                            </Typography>
                        </Box>

                        <Stack direction="row" spacing={1} alignItems="center">
                            <Button
                                startIcon={<AddRoundedIcon fontSize="small" />}
                                variant="contained"
                                color="warning"
                                sx={{
                                    textTransform: "none",
                                    fontWeight: 900,
                                    borderRadius: 3,
                                    boxShadow: "none",
                                    px: 2,
                                    whiteSpace: "nowrap",
                                    color: "#fff", // 👈 clave
                                }}
                            >
                                Create theme
                            </Button>

                            <Tooltip title="Reload">
                                <span>
                                    <IconButton
                                        size="small"
                                        onClick={() => q.refetch()}
                                        disabled={q.isFetching || pending}
                                    >
                                        <RefreshRoundedIcon
                                            fontSize="small"
                                            sx={{
                                                transform: q.isFetching ? "rotate(90deg)" : "none",
                                                transition: "transform 0.2s ease-out",
                                            }}
                                        />
                                    </IconButton>
                                </span>
                            </Tooltip>
                        </Stack>
                    </Box>

                    <CompanyThemesTable
                        rows={q.data ?? []}
                        loading={q.isFetching || pending}
                        onView={handleView}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                    />
                </Box>
            </Stack>

            <Drawer
                anchor={isMobile ? "bottom" : "right"}
                open={openForm}
                onClose={handleCloseForm}
                PaperProps={{
                    sx: {
                        width: isMobile ? "100%" : { md: 780, lg: 900 },
                        maxWidth: "100%",
                        top: isMobile ? "auto" : `${HEADER_HEIGHT}px`,
                        height: isMobile ? "85vh" : `calc(100vh - ${HEADER_HEIGHT}px)`,
                        minHeight: 0,
                        display: "flex",
                        flexDirection: "column",
                        borderTopLeftRadius: isMobile ? 16 : 0,
                        borderTopRightRadius: isMobile ? 16 : 0,
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
                    <CompanyThemeForm
                        initial={selected}
                        companyId={COMPANY_ID}
                        mode={drawerMode}
                        loading={pending}
                        onSubmit={async (values) => {
                            if (drawerMode === "view") return;

                            if (drawerMode === "edit" && selected) {
                                await updateTheme.mutateAsync({
                                    id: selected.id,
                                    data: values as any,
                                });
                            } else {
                                await createTheme.mutateAsync(values as any);
                            }

                            await q.refetch();
                            handleCloseForm();
                        }}
                        onCancel={handleCloseForm}
                    />
                </Box>
            </Drawer>
        </Box>
    );
}