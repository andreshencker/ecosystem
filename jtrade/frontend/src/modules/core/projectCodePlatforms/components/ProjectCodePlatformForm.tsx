import * as React from "react";
import {
    Avatar,
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

import type { CodeProject } from "@/modules/core/codeProjects/types/codeProjects";
import type { Platform } from "@/modules/core/platforms/types/platforms";

import type {
    CreateProjectCodePlatformPayload,
    ProjectCodePlatform,
    ProjectCodePlatformStatus,
    ProjectDeliveryMode,
    ProjectRuntimeMode,
    UpdateProjectCodePlatformPayload,
} from "../types/projectCodePlatforms";

type Props = {
    mode: "create" | "edit";
    loading?: boolean;
    initialData?: ProjectCodePlatform | null;
    codeProjects?: CodeProject[];
    platforms?: Platform[];
    onSubmit: (
        payload:
            | CreateProjectCodePlatformPayload
            | UpdateProjectCodePlatformPayload,
    ) => void | Promise<void>;
    onCancel?: () => void;
};

const DELIVERY_OPTIONS: { label: string; value: ProjectDeliveryMode }[] = [
    { label: "Download", value: "download" },
    { label: "Webhook", value: "webhook" },
    { label: "API", value: "api" },
    { label: "Cloud", value: "cloud" },
    { label: "Managed", value: "managed" },
];

const RUNTIME_OPTIONS: { label: string; value: ProjectRuntimeMode }[] = [
    { label: "None", value: "none" },
    { label: "Signal based", value: "signal_based" },
    { label: "Bot execution", value: "bot_execution" },
    { label: "Copy trading", value: "copy_trading" },
    { label: "Strategy rules", value: "strategy_rules" },
];

const STATUS_OPTIONS: { label: string; value: ProjectCodePlatformStatus }[] = [
    { label: "Draft", value: "draft" },
    { label: "Published", value: "published" },
    { label: "Suspended", value: "suspended" },
    { label: "Archived", value: "archived" },
];

function platformLabel(platform?: Platform | null): string {
    if (!platform) return "";

    const meta = [platform.category, platform.connectionType]
        .filter(Boolean)
        .join(" · ");

    return meta ? `${platform.name} — ${meta}` : platform.name;
}

export default function ProjectCodePlatformForm({
                                                    mode,
                                                    loading,
                                                    initialData,
                                                    codeProjects = [],
                                                    platforms = [],
                                                    onSubmit,
                                                    onCancel,
                                                }: Props) {
    const isEdit = mode === "edit";

    const [codeProjectId, setCodeProjectId] = React.useState("");
    const [platformId, setPlatformId] = React.useState("");
    const [deliveryMode, setDeliveryMode] =
        React.useState<ProjectDeliveryMode>("download");
    const [runtimeMode, setRuntimeMode] =
        React.useState<ProjectRuntimeMode>("none");
    const [status, setStatus] =
        React.useState<ProjectCodePlatformStatus>("draft");
    const [isActive, setIsActive] = React.useState(true);
    const [notes, setNotes] = React.useState("");

    const supportedPlatforms = React.useMemo(() => {
        return platforms.filter((platform) => {
            return platform.isActive === true && platform.isSupported === true;
        });
    }, [platforms]);

    const selectedPlatform = React.useMemo(() => {
        return supportedPlatforms.find((platform) => platform.id === platformId);
    }, [supportedPlatforms, platformId]);

    React.useEffect(() => {
        if (!initialData) {
            if (mode === "create") {
                setCodeProjectId("");
                setPlatformId("");
                setDeliveryMode("download");
                setRuntimeMode("none");
                setStatus("draft");
                setIsActive(true);
                setNotes("");
            }
            return;
        }

        setCodeProjectId(initialData.codeProjectId ?? "");
        setPlatformId(initialData.platformId ?? "");
        setDeliveryMode(initialData.deliveryMode ?? "download");
        setRuntimeMode(initialData.runtimeMode ?? "none");
        setStatus(initialData.status ?? "draft");
        setIsActive(initialData.isActive ?? true);
        setNotes(initialData.notes ?? "");
    }, [initialData, mode]);

    const canSubmit = !!codeProjectId && !!platformId && !loading;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!canSubmit) return;

        if (isEdit) {
            await onSubmit({
                platformId,
                deliveryMode,
                runtimeMode,
                status,
                isActive,
                notes: notes.trim() || undefined,
            });

            return;
        }

        await onSubmit({
            codeProjectId,
            platformId,
            deliveryMode,
            runtimeMode,
            isActive,
            notes: notes.trim() || undefined,
        });

        setCodeProjectId("");
        setPlatformId("");
        setDeliveryMode("download");
        setRuntimeMode("none");
        setStatus("draft");
        setIsActive(true);
        setNotes("");
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
                        {isEdit ? "Edit project platform" : "Create project platform"}
                    </Typography>

                    <Typography variant="body2" color="text.secondary">
                        Assign your code project to a supported platform such as MT5 or TradingView.
                    </Typography>
                </Box>

                <Divider />

                <Grid container spacing={2}>
                    <Grid size={{ xs: 12 }}>
                        <TextField
                            select
                            label="Code project"
                            value={codeProjectId}
                            onChange={(e) => setCodeProjectId(e.target.value)}
                            disabled={loading || isEdit}
                            fullWidth
                            required
                            InputLabelProps={{ shrink: true }}
                        >
                            {codeProjects.map((project) => (
                                <MenuItem key={project.id} value={project.id}>
                                    {project.name} ({project.projectKey})
                                </MenuItem>
                            ))}
                        </TextField>
                    </Grid>

                    <Grid size={{ xs: 12 }}>
                        <TextField
                            select
                            label="Platform"
                            value={platformId}
                            onChange={(e) => setPlatformId(e.target.value)}
                            disabled={loading}
                            fullWidth
                            required
                            InputLabelProps={{ shrink: true }}
                            SelectProps={{
                                renderValue: () => {
                                    if (!selectedPlatform) return "";

                                    return (
                                        <Stack
                                            direction="row"
                                            spacing={1.2}
                                            alignItems="center"
                                            sx={{ minWidth: 0 }}
                                        >
                                            <Avatar
                                                src={selectedPlatform.imageUrl || undefined}
                                                alt={selectedPlatform.name}
                                                sx={{
                                                    width: 24,
                                                    height: 24,
                                                    bgcolor: "background.default",
                                                }}
                                            >
                                                {selectedPlatform.name?.charAt(0)?.toUpperCase()}
                                            </Avatar>

                                            <Box sx={{ minWidth: 0 }}>
                                                <Typography
                                                    variant="body2"
                                                    fontWeight={800}
                                                    noWrap
                                                >
                                                    {selectedPlatform.name}
                                                </Typography>
                                            </Box>
                                        </Stack>
                                    );
                                },
                            }}
                            helperText={
                                supportedPlatforms.length === 0
                                    ? "No supported platforms available."
                                    : "Only active and supported platforms are available."
                            }
                        >
                            {supportedPlatforms.map((platform) => (
                                <MenuItem key={platform.id} value={platform.id}>
                                    <Stack
                                        direction="row"
                                        spacing={1.5}
                                        alignItems="center"
                                        sx={{ width: "100%", minWidth: 0, py: 0.5 }}
                                    >
                                        <Avatar
                                            src={platform.imageUrl || undefined}
                                            alt={platform.name}
                                            sx={{
                                                width: 32,
                                                height: 32,
                                                bgcolor: "background.default",
                                                flexShrink: 0,
                                            }}
                                        >
                                            {platform.name?.charAt(0)?.toUpperCase()}
                                        </Avatar>

                                        <Box sx={{ minWidth: 0 }}>
                                            <Typography
                                                variant="body2"
                                                fontWeight={800}
                                                noWrap
                                            >
                                                {platform.name}
                                            </Typography>

                                            <Typography
                                                variant="caption"
                                                color="text.secondary"
                                                noWrap
                                            >
                                                {platformLabel(platform).replace(
                                                    `${platform.name} — `,
                                                    "",
                                                )}
                                            </Typography>
                                        </Box>
                                    </Stack>
                                </MenuItem>
                            ))}
                        </TextField>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                            select
                            label="Delivery mode"
                            value={deliveryMode}
                            onChange={(e) =>
                                setDeliveryMode(e.target.value as ProjectDeliveryMode)
                            }
                            disabled={loading}
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                        >
                            {DELIVERY_OPTIONS.map((option) => (
                                <MenuItem key={option.value} value={option.value}>
                                    {option.label}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                            select
                            label="Runtime mode"
                            value={runtimeMode}
                            onChange={(e) =>
                                setRuntimeMode(e.target.value as ProjectRuntimeMode)
                            }
                            disabled={loading}
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                        >
                            {RUNTIME_OPTIONS.map((option) => (
                                <MenuItem key={option.value} value={option.value}>
                                    {option.label}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Grid>

                    {isEdit && (
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                                select
                                label="Status"
                                value={status}
                                onChange={(e) =>
                                    setStatus(e.target.value as ProjectCodePlatformStatus)
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

                    <Grid size={{ xs: 12 }}>
                        <TextField
                            label="Notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            disabled={loading}
                            fullWidth
                            multiline
                            minRows={3}
                            InputLabelProps={{ shrink: true }}
                            placeholder="Internal notes about compatibility, file type, installation requirements, etc."
                        />
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
                                : "Create"}
                    </Button>
                </Stack>
            </Stack>
        </Paper>
    );
}