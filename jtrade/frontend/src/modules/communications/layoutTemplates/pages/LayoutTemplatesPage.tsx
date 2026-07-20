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
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";

import LayoutTemplatesTable from "../components/LayoutTemplatesTable";
import LayoutTemplateForm from "../components/LayoutTemplateForm";

import {
    useCreateLayoutTemplate,
    useDeleteLayoutTemplate,
    useLayoutTemplates,
    useUpdateLayoutTemplate,
} from "../hooks/useLayoutTemplates";

import { useCompanyThemes } from "@/modules/communications/companyThemes/hooks/useCompanyThemes";
import type {
    CreateLayoutTemplateDto,
    LayoutTemplate,
    UpdateLayoutTemplateDto,
} from "../types/layoutTemplates.types";

type DrawerMode = "create" | "edit" | "view";

export default function LayoutTemplatesPage() {
    const muiTheme = useTheme();
    const isMobile = useMediaQuery(muiTheme.breakpoints.down("md"));

    const q = useLayoutTemplates();
    const qThemes = useCompanyThemes();

    const createTemplate = useCreateLayoutTemplate();
    const updateTemplate = useUpdateLayoutTemplate();
    const deleteTemplate = useDeleteLayoutTemplate();

    const [openForm, setOpenForm] = React.useState(false);
    const [drawerMode, setDrawerMode] = React.useState<DrawerMode>("create");
    const [selected, setSelected] = React.useState<LayoutTemplate | null>(null);

    const pending =
        createTemplate.isPending ||
        updateTemplate.isPending ||
        deleteTemplate.isPending;

    const themeOptions = React.useMemo(() => {
        return (qThemes.data ?? []).map((t: any) => ({
            id: t.id,
            label: t.label,
        }));
    }, [qThemes.data]);

    const openCreate = () => {
        setSelected(null);
        setDrawerMode("create");
        setOpenForm(true);
    };

    const openEdit = (row: LayoutTemplate) => {
        setSelected(row);
        setDrawerMode("edit");
        setOpenForm(true);
    };

    const openView = (row: LayoutTemplate) => {
        setSelected(row);
        setDrawerMode("view");
        setOpenForm(true);
    };

    const close = () => {
        setSelected(null);
        setDrawerMode("create");
        setOpenForm(false);
    };

    const handleDelete = async (row: LayoutTemplate) => {
        await deleteTemplate.mutateAsync(row.id);
    };

    const handleSubmit = async (
        values: CreateLayoutTemplateDto | UpdateLayoutTemplateDto
    ) => {
        if (drawerMode === "view") {
            close();
            return;
        }

        if (drawerMode === "edit" && selected) {
            await updateTemplate.mutateAsync({
                id: selected.id,
                data: values as UpdateLayoutTemplateDto,
            });
            close();
            return;
        }

        await createTemplate.mutateAsync(values as CreateLayoutTemplateDto);
        close();
    };

    if (q.isLoading || qThemes.isLoading) {
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
                        Layout Templates
                    </Typography>

                    <Typography variant="body2" color="text.secondary">
                        Manage email and PDF templates for the current company.
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
                                Templates
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                                Create, update and remove templates.
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
                                Create template
                            </Button>

                            <Tooltip title="Reload">
                                <span>
                                    <IconButton
                                        size="small"
                                        onClick={() => {
                                            q.refetch();
                                            qThemes.refetch();
                                        }}
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

                    <LayoutTemplatesTable
                        rows={q.data ?? []}
                        loading={q.isFetching || pending}
                        onView={openView}
                        onEdit={openEdit}
                        onDelete={handleDelete}
                    />
                </Box>
            </Stack>

            <Drawer
                anchor={isMobile ? "bottom" : "right"}
                open={openForm}
                onClose={close}
                PaperProps={{
                    sx: {
                        width: isMobile ? "100%" : { md: 900, lg: 1040 },
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
                    <LayoutTemplateForm
                        initial={selected}
                        companyThemeOptions={themeOptions}
                        mode={drawerMode}
                        loading={pending}
                        onSubmit={handleSubmit}
                        onCancel={close}
                    />
                </Box>
            </Drawer>
        </Box>
    );
}