import * as React from "react";
import {
    Avatar,
    Box,
    Button,
    Divider,
    FormControlLabel,
    Grid,
    ListItemText,
    MenuItem,
    Paper,
    Stack,
    Switch,
    TextField,
    Typography,
} from "@mui/material";

import type { ProjectCodePlatform } from "@/modules/core/projectCodePlatforms/types/projectCodePlatforms";

import type {
    CodeProjectVersion,
    CreateCodeProjectVersionPayload,
    ReplaceCodeProjectVersionFilePayload,
    UpdateCodeProjectVersionPayload,
} from "../types/codeProjectVersions";

export type EditSubmitPayload = UpdateCodeProjectVersionPayload &
    ReplaceCodeProjectVersionFilePayload & {
    file?: File;
};

type Props = {
    mode: "create" | "edit";
    projectPlatforms: ProjectCodePlatform[];
    loading?: boolean;
    initialData?: CodeProjectVersion | null;
    onSubmit:
        | ((
        file: File,
        payload: CreateCodeProjectVersionPayload,
    ) => void | Promise<void>)
        | ((payload: EditSubmitPayload) => void | Promise<void>);
    onCancel?: () => void;
};

export default function CodeProjectVersionForm({
                                                   mode,
                                                   projectPlatforms,
                                                   loading,
                                                   initialData,
                                                   onSubmit,
                                                   onCancel,
                                               }: Props) {
    const isEdit = mode === "edit";

    const [file, setFile] = React.useState<File | null>(null);
    const [projectCodePlatformId, setProjectCodePlatformId] =
        React.useState("");
    const [version, setVersion] = React.useState("");
    const [comments, setComments] = React.useState("");
    const [isCurrentVersion, setIsCurrentVersion] = React.useState(false);
    const [isActive, setIsActive] = React.useState(true);

    React.useEffect(() => {
        if (isEdit && initialData) {
            setProjectCodePlatformId(initialData.projectCodePlatformId ?? "");
            setVersion(initialData.version ?? "");
            setComments(initialData.comments ?? "");
            setIsCurrentVersion(initialData.isCurrentVersion ?? false);
            setIsActive(initialData.isActive ?? true);
            setFile(null);
            return;
        }

        if (!isEdit) {
            setProjectCodePlatformId("");
            setVersion("");
            setComments("");
            setIsCurrentVersion(true);
            setIsActive(true);
            setFile(null);
        }
    }, [initialData, isEdit]);

    const selectedRelation = React.useMemo(() => {
        return (
            projectPlatforms.find((item) => item.id === projectCodePlatformId) ??
            null
        );
    }, [projectCodePlatformId, projectPlatforms]);

    const canSubmit = isEdit
        ? !!projectCodePlatformId.trim() && !!version.trim() && !loading
        : !!file &&
        !!projectCodePlatformId.trim() &&
        !!version.trim() &&
        !loading;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!canSubmit) return;

        if (isEdit) {
            await (onSubmit as (payload: EditSubmitPayload) => void | Promise<void>)({
                projectCodePlatformId: projectCodePlatformId.trim(),
                version: version.trim(),
                comments: comments.trim() || undefined,
                isCurrentVersion,
                isActive,
                file: file ?? undefined,
            });

            return;
        }

        if (!file) return;

        await (
            onSubmit as (
                file: File,
                payload: CreateCodeProjectVersionPayload,
            ) => void | Promise<void>
        )(file, {
            projectCodePlatformId: projectCodePlatformId.trim(),
            version: version.trim(),
            comments: comments.trim() || undefined,
            isCurrentVersion,
            isActive,
        });

        setFile(null);
        setProjectCodePlatformId("");
        setVersion("");
        setComments("");
        setIsCurrentVersion(true);
        setIsActive(true);
    };

    const currentDisplayedFileName =
        initialData?.originalFileName?.trim() ||
        initialData?.fileName?.trim() ||
        initialData?.fileKey?.trim() ||
        "—";

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
                        {isEdit ? "Edit version" : "Upload version"}
                    </Typography>

                    <Typography variant="body2" color="text.secondary">
                        {isEdit
                            ? "Update version metadata or replace the uploaded file."
                            : "Upload a new file version for an existing project-platform relation."}
                    </Typography>
                </Box>

                <Divider />

                <Grid container spacing={2}>
                    <Grid size={{ xs: 12 }}>
                        <TextField
                            select
                            label="Project platform"
                            value={projectCodePlatformId}
                            onChange={(e) =>
                                setProjectCodePlatformId(e.target.value)
                            }
                            disabled={loading || isEdit}
                            fullWidth
                            required
                            InputLabelProps={{ shrink: true }}
                            helperText="Select the project and platform relation where this version belongs."
                            SelectProps={{
                                renderValue: () => {
                                    if (!selectedRelation) return "";

                                    return (
                                        <Stack
                                            direction="row"
                                            spacing={1.25}
                                            alignItems="center"
                                            sx={{ minWidth: 0 }}
                                        >
                                            <Avatar
                                                src={
                                                    selectedRelation.platform
                                                        ?.imageUrl || undefined
                                                }
                                                alt={
                                                    selectedRelation.platform
                                                        ?.name ?? "Platform"
                                                }
                                                sx={{
                                                    width: 26,
                                                    height: 26,
                                                    fontSize: 12,
                                                }}
                                            >
                                                {selectedRelation.platform?.name
                                                    ?.charAt(0)
                                                    ?.toUpperCase() ?? "P"}
                                            </Avatar>

                                            <Box sx={{ minWidth: 0 }}>
                                                <Typography
                                                    variant="body2"
                                                    fontWeight={800}
                                                    noWrap
                                                >
                                                    {selectedRelation.codeProject
                                                        ?.name ?? "Project"}{" "}
                                                    —{" "}
                                                    {selectedRelation.platform
                                                        ?.name ?? "Platform"}
                                                </Typography>
                                            </Box>
                                        </Stack>
                                    );
                                },
                            }}
                        >
                            {projectPlatforms.length === 0 ? (
                                <MenuItem value="" disabled>
                                    No project platforms available
                                </MenuItem>
                            ) : (
                                projectPlatforms.map((item) => (
                                    <MenuItem key={item.id} value={item.id}>
                                        <Stack
                                            direction="row"
                                            spacing={1.25}
                                            alignItems="center"
                                            sx={{
                                                minWidth: 0,
                                                width: "100%",
                                            }}
                                        >
                                            <Avatar
                                                src={
                                                    item.platform?.imageUrl ||
                                                    undefined
                                                }
                                                alt={
                                                    item.platform?.name ??
                                                    "Platform"
                                                }
                                                sx={{
                                                    width: 30,
                                                    height: 30,
                                                    fontSize: 13,
                                                }}
                                            >
                                                {item.platform?.name
                                                    ?.charAt(0)
                                                    ?.toUpperCase() ?? "P"}
                                            </Avatar>

                                            <ListItemText
                                                primary={
                                                    <Typography
                                                        variant="body2"
                                                        fontWeight={800}
                                                        noWrap
                                                    >
                                                        {item.codeProject?.name ??
                                                            "Project"}{" "}
                                                        —{" "}
                                                        {item.platform?.name ??
                                                            "Platform"}
                                                    </Typography>
                                                }
                                                secondary={
                                                    <Typography
                                                        variant="caption"
                                                        color="text.secondary"
                                                        noWrap
                                                    >
                                                        {item.deliveryMode} ·{" "}
                                                        {item.runtimeMode} ·{" "}
                                                        {item.status}
                                                    </Typography>
                                                }
                                            />
                                        </Stack>
                                    </MenuItem>
                                ))
                            )}
                        </TextField>
                    </Grid>

                    <Grid size={{ xs: 12 }}>
                        <TextField
                            label="Version"
                            value={version}
                            onChange={(e) => setVersion(e.target.value)}
                            disabled={loading}
                            fullWidth
                            required
                            InputLabelProps={{ shrink: true }}
                            helperText="Example: 1.0.0"
                        />
                    </Grid>

                    <Grid size={{ xs: 12 }}>
                        <TextField
                            label="Comments"
                            value={comments}
                            onChange={(e) => setComments(e.target.value)}
                            disabled={loading}
                            fullWidth
                            multiline
                            minRows={3}
                            InputLabelProps={{ shrink: true }}
                            helperText="Optional internal notes for this version."
                        />
                    </Grid>

                    <Grid size={{ xs: 12 }}>
                        <Box>
                            <Button
                                component="label"
                                variant="outlined"
                                color="inherit"
                                disabled={loading}
                                sx={{
                                    textTransform: "none",
                                    fontWeight: 800,
                                }}
                            >
                                {file
                                    ? isEdit
                                        ? "Change replacement file"
                                        : "Change file"
                                    : isEdit
                                        ? "Replace file"
                                        : "Select file"}

                                <input
                                    hidden
                                    type="file"
                                    onChange={(e) =>
                                        setFile(e.target.files?.[0] ?? null)
                                    }
                                />
                            </Button>

                            <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ mt: 1 }}
                            >
                                {file
                                    ? `Selected file: ${file.name}`
                                    : isEdit
                                        ? `Current file: ${currentDisplayedFileName}`
                                        : "No file selected yet."}
                            </Typography>

                            {isEdit &&
                                initialData?.fileName &&
                                initialData?.originalFileName && (
                                    <Typography
                                        variant="caption"
                                        color="text.secondary"
                                        sx={{
                                            mt: 0.5,
                                            display: "block",
                                        }}
                                    >
                                        Stored filename: {initialData.fileName}
                                    </Typography>
                                )}
                        </Box>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                        <FormControlLabel
                            control={
                                <Switch
                                    size="small"
                                    checked={isCurrentVersion}
                                    onChange={(_, checked) =>
                                        setIsCurrentVersion(checked)
                                    }
                                    disabled={loading}
                                />
                            }
                            label={
                                isCurrentVersion
                                    ? "Mark as current version"
                                    : "Not current"
                            }
                        />
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                        <FormControlLabel
                            control={
                                <Switch
                                    size="small"
                                    checked={isActive}
                                    onChange={(_, checked) =>
                                        setIsActive(checked)
                                    }
                                    disabled={loading}
                                />
                            }
                            label={isActive ? "Active" : "Inactive"}
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
                                : "Upload version"}
                    </Button>
                </Stack>
            </Stack>
        </Paper>
    );
}