import * as React from "react";
import {
    Box,
    Button,
    Divider,
    FormControlLabel,
    Grid,
    MenuItem,
    Paper,
    Stack,
    Switch,
    TextField,
    Typography,
} from "@mui/material";

import type {
    CodeProject,
    CodeProjectStatus,
    CreateCodeProjectPayload,
    UpdateCodeProjectPayload,
} from "@/old/modules/core/codeProjects/types/codeProjects";

import type { TypeProject } from "@/old/modules/core/typeProjects/types/typeProject";

type Props = {
    mode: "create" | "edit";
    loading?: boolean;
    initialData?: CodeProject | null;
    typeProjects?: TypeProject[];
    onSubmit: (
        payload: CreateCodeProjectPayload | UpdateCodeProjectPayload,
    ) => void | Promise<void>;
    onCancel?: () => void;
};

const STATUS_OPTIONS: { label: string; value: CodeProjectStatus }[] = [
    { label: "Draft", value: "draft" },
    { label: "Published", value: "published" },
    { label: "Suspended", value: "suspended" },
    { label: "Archived", value: "archived" },
];

function normalizeKey(value: string): string {
    return value.toLowerCase().trim().replace(/\s+/g, "-");
}

export default function CodeProjectForm({
                                            mode,
                                            loading,
                                            initialData,
                                            typeProjects = [],
                                            onSubmit,
                                            onCancel,
                                        }: Props) {
    const isEdit = mode === "edit";

    const [typeProjectId, setTypeProjectId] = React.useState("");
    const [projectKey, setProjectKey] = React.useState("");
    const [name, setName] = React.useState("");
    const [description, setDescription] = React.useState("");
    const [status, setStatus] = React.useState<CodeProjectStatus>("draft");
    const [isActive, setIsActive] = React.useState(true);

    React.useEffect(() => {
        if (!initialData) {
            if (mode === "create") {
                setTypeProjectId("");
                setProjectKey("");
                setName("");
                setDescription("");
                setStatus("draft");
                setIsActive(true);
            }
            return;
        }

        setTypeProjectId(initialData.typeProjectId ?? "");
        setProjectKey(initialData.projectKey ?? "");
        setName(initialData.name ?? "");
        setDescription(initialData.description ?? "");
        setStatus(initialData.status ?? "draft");
        setIsActive(initialData.isActive ?? true);
    }, [initialData, mode]);

    const canSubmit =
        !!typeProjectId &&
        !!projectKey.trim() &&
        !!name.trim() &&
        !loading;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!canSubmit) return;

        const basePayload = {
            typeProjectId,
            projectKey: normalizeKey(projectKey),
            name: name.trim(),
            description: description.trim() || undefined,
            isActive,
        };

        if (isEdit) {
            await onSubmit({
                ...basePayload,
                status,
            });

            return;
        }

        await onSubmit(basePayload);

        setTypeProjectId("");
        setProjectKey("");
        setName("");
        setDescription("");
        setStatus("draft");
        setIsActive(true);
    };

    return (
        <Paper
            component="form"
            onSubmit={handleSubmit}
            elevation={0}
            sx={{
                borderRadius: 4,
                p: { xs: 1.5, sm: 2.5 },
                border: "1px solid",
                borderColor: "divider",
            }}
        >
            <Stack spacing={2.5}>
                <Box>
                    <Typography variant="h5" fontWeight={900} sx={{ mb: 0.5 }}>
                        {isEdit ? "Edit project" : "Create project"}
                    </Typography>

                    <Typography variant="body2" color="text.secondary">
                        {isEdit
                            ? "Update your project metadata and publication status."
                            : "Create a provider project and assign its project type."}
                    </Typography>
                </Box>

                <Divider />

                <Grid container spacing={2}>
                    <Grid size={{ xs: 12 }}>
                        <TextField
                            select
                            label="Type project"
                            value={typeProjectId}
                            onChange={(e) => setTypeProjectId(e.target.value)}
                            disabled={loading}
                            fullWidth
                            required
                            InputLabelProps={{ shrink: true }}
                            helperText="Select if this project is a bot, indicator, strategy, script, etc."
                        >
                            {typeProjects.map((type) => (
                                <MenuItem key={type.id} value={type.id}>
                                    {type.name} ({type.key})
                                </MenuItem>
                            ))}
                        </TextField>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                            label="Project key"
                            value={projectKey}
                            onChange={(e) => setProjectKey(e.target.value)}
                            disabled={loading}
                            fullWidth
                            required
                            InputLabelProps={{ shrink: true }}
                            helperText="Unique inside your company. Example: gold-scalper-pro"
                        />
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                            label="Name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            disabled={loading}
                            fullWidth
                            required
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>

                    <Grid size={{ xs: 12 }}>
                        <TextField
                            label="Description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            disabled={loading}
                            fullWidth
                            multiline
                            minRows={3}
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>

                    {isEdit && (
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                                select
                                label="Status"
                                value={status}
                                onChange={(e) =>
                                    setStatus(e.target.value as CodeProjectStatus)
                                }
                                disabled={loading}
                                fullWidth
                                InputLabelProps={{ shrink: true }}
                            >
                                {STATUS_OPTIONS.map((option) => (
                                    <MenuItem key={option.value} value={option.value}>
                                        {option.label}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                    )}

                    <Grid size={{ xs: 12, sm: 6 }}>
                        <Box
                            sx={{
                                height: "100%",
                                minHeight: 56,
                                display: "flex",
                                alignItems: "center",
                            }}
                        >
                            <FormControlLabel
                                sx={{ m: 0 }}
                                control={
                                    <Switch
                                        size="small"
                                        checked={isActive}
                                        onChange={(_, checked) => setIsActive(checked)}
                                        disabled={loading}
                                    />
                                }
                                label={isActive ? "Active" : "Inactive"}
                            />
                        </Box>
                    </Grid>
                </Grid>

                <Divider />

                <Stack
                    direction="row"
                    justifyContent={{ xs: "stretch", sm: "flex-end" }}
                    spacing={1.5}
                    flexWrap="wrap"
                    useFlexGap
                >
                    <Button
                        variant="outlined"
                        color="inherit"
                        onClick={onCancel}
                        disabled={loading}
                        sx={{
                            fontWeight: 800,
                            textTransform: "none",
                            minWidth: 120,
                        }}
                    >
                        Cancel
                    </Button>

                    <Button
                        type="submit"
                        variant="contained"
                        disabled={!canSubmit}
                        sx={{
                            minWidth: 140,
                            fontWeight: 800,
                            textTransform: "none",
                        }}
                    >
                        {loading
                            ? "Saving..."
                            : isEdit
                                ? "Save changes"
                                : "Create project"}
                    </Button>
                </Stack>
            </Stack>
        </Paper>
    );
}