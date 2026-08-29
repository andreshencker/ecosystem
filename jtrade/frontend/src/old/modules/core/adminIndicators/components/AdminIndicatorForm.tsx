import * as React from "react";

import {
    Box,
    Button,
    Chip,
    Divider,
    MenuItem,
    Stack,
    TextField,
    Typography,
} from "@mui/material";

import type {
    AdminIndicator,
    CreateAdminIndicatorPayload,
} from "../types/adminIndicators";

import { useMyIndicatorProjects } from "@/old/modules/core/indicatorProjects/hooks/useIndicatorProjects";

type Props = {
    loading?: boolean;
    onSubmit: (values: CreateAdminIndicatorPayload) => void | Promise<void>;
    onCancel?: () => void;
    initial?: AdminIndicator | null;
};

export default function AdminIndicatorForm({
                                               loading,
                                               onSubmit,
                                               onCancel,
                                               initial = null,
                                           }: Props) {
    const isEditing = !!initial;

    const qIndicatorProjects = useMyIndicatorProjects();

    const indicatorProjects = Array.isArray(qIndicatorProjects.data)
        ? qIndicatorProjects.data.filter((item) => item.isActive !== false)
        : [];

    const [indicatorProjectId, setIndicatorProjectId] =
        React.useState<string>(initial?.indicatorProjectId ?? "");

    React.useEffect(() => {
        setIndicatorProjectId(initial?.indicatorProjectId ?? "");
    }, [initial]);

    const canSubmit =
        !!indicatorProjectId &&
        !loading &&
        !qIndicatorProjects.isLoading &&
        !isEditing;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!canSubmit) return;

        await onSubmit({
            indicatorProjectId,
        });

        if (!isEditing) {
            setIndicatorProjectId("");
        }
    };

    const handleCancel = () => {
        setIndicatorProjectId("");
        onCancel?.();
    };

    return (
        <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{
                width: "100%",
                maxWidth: 720,
                mx: "auto",
                borderRadius: 4,
                border: "1px solid",
                borderColor: "divider",
                p: { xs: 1.5, sm: 2, md: 2.5 },
                bgcolor: "background.paper",
                overflow: "hidden",
            }}
        >
            <Stack spacing={2.5}>
                <Box>
                    <Typography variant="h5" fontWeight={900} sx={{ mb: 0.5 }}>
                        {isEditing ? "Edit webhook" : "Create webhook"}
                    </Typography>

                    <Typography variant="body2" color="text.secondary">
                        Select an indicator project to generate webhook
                        credentials.
                    </Typography>
                </Box>

                <Divider />

                <TextField
                    select
                    fullWidth
                    label="Indicator project"
                    value={indicatorProjectId}
                    onChange={(e) => setIndicatorProjectId(e.target.value)}
                    disabled={
                        loading ||
                        qIndicatorProjects.isLoading ||
                        isEditing
                    }
                    InputLabelProps={{ shrink: true }}
                    helperText={
                        isEditing
                            ? "Indicator project cannot be changed while editing."
                            : "Select the project-platform and indicator relation."
                    }
                >
                    {indicatorProjects.length === 0 && (
                        <MenuItem disabled value="">
                            No indicator projects available
                        </MenuItem>
                    )}

                    {indicatorProjects.map((item) => {
                        const pcp = item.projectCodePlatform;
                        const codeProject = pcp?.codeProject;
                        const platform = pcp?.platform;
                        const indicator = item.indicator;

                        return (
                            <MenuItem key={item.id} value={item.id}>
                                <Stack spacing={0.4} sx={{ minWidth: 0 }}>
                                    <Typography
                                        variant="body2"
                                        fontWeight={900}
                                        noWrap
                                    >
                                        {codeProject?.name ?? "Project"} /{" "}
                                        {platform?.name ?? "Platform"}
                                    </Typography>

                                    <Stack
                                        direction="row"
                                        spacing={1}
                                        alignItems="center"
                                    >
                                        <Chip
                                            size="small"
                                            label={
                                                indicator?.key ??
                                                indicator?.name ??
                                                "indicator"
                                            }
                                            sx={{ maxWidth: 160 }}
                                        />

                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                            noWrap
                                        >
                                            {pcp?.runtimeMode ?? "-"}
                                        </Typography>
                                    </Stack>
                                </Stack>
                            </MenuItem>
                        );
                    })}
                </TextField>

                <Divider />

                <Stack
                    direction="row"
                    justifyContent={{ xs: "stretch", sm: "flex-end" }}
                    spacing={1.5}
                    flexWrap="wrap"
                    useFlexGap
                >
                    {onCancel && (
                        <Button
                            variant="outlined"
                            color="inherit"
                            onClick={handleCancel}
                            disabled={loading}
                            sx={{
                                textTransform: "none",
                                fontWeight: 800,
                                minWidth: { xs: 100, sm: 120 },
                            }}
                        >
                            Cancel
                        </Button>
                    )}

                    <Button
                        type="submit"
                        variant="contained"
                        disabled={!canSubmit}
                        sx={{
                            textTransform: "none",
                            fontWeight: 900,
                            minWidth: { xs: 120, sm: 140 },
                        }}
                    >
                        Create
                    </Button>
                </Stack>
            </Stack>
        </Box>
    );
}