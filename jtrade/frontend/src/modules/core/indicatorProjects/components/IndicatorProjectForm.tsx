import * as React from "react";
import {
    Box,
    Button,
    Divider,
    FormControlLabel,
    Grid,
    MenuItem,
    Stack,
    Switch,
    TextField,
    Typography,
} from "@mui/material";

import type {
    CreateIndicatorProjectDto,
    IndicatorProject,
    UpdateIndicatorProjectDto,
} from "../types/indicatorProjects";

import type { ProjectCodePlatform } from "@/modules/core/projectCodePlatforms/types/projectCodePlatforms";
import type { Indicator } from "@/modules/core/indicators/types/indicators";

type Props = {
    mode: "create" | "edit";
    initial?: IndicatorProject | null;
    loading?: boolean;
    projectCodePlatforms?: ProjectCodePlatform[];
    indicators?: Indicator[];
    onSubmit: (
        values: CreateIndicatorProjectDto | UpdateIndicatorProjectDto,
    ) => void | Promise<void>;
    onCancel?: () => void;
};

export default function IndicatorProjectForm({
                                                 mode,
                                                 initial,
                                                 loading,
                                                 projectCodePlatforms = [],
                                                 indicators = [],
                                                 onSubmit,
                                                 onCancel,
                                             }: Props) {
    const isEdit = mode === "edit";

    const [projectCodePlatformId, setProjectCodePlatformId] = React.useState("");
    const [indicatorId, setIndicatorId] = React.useState("");
    const [isActive, setIsActive] = React.useState(true);
    const [notes, setNotes] = React.useState("");

    React.useEffect(() => {
        if (!initial) {
            setProjectCodePlatformId("");
            setIndicatorId("");
            setIsActive(true);
            setNotes("");
            return;
        }

        setProjectCodePlatformId(initial.projectCodePlatformId ?? "");
        setIndicatorId(initial.indicatorId ?? "");
        setIsActive(initial.isActive ?? true);
        setNotes(initial.notes ?? "");
    }, [initial]);

    const activeProjectPlatforms = projectCodePlatforms.filter(
        (item) => item.isActive !== false,
    );

    const activeIndicators = indicators.filter(
        (item) => item.isActive !== false,
    );

    const canSubmit =
        (isEdit || (!!projectCodePlatformId && !!indicatorId)) && !loading;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!canSubmit) return;

        if (isEdit) {
            await onSubmit({
                isActive,
                notes: notes.trim(),
            });
            return;
        }

        await onSubmit({
            projectCodePlatformId,
            indicatorId,
            isActive,
            notes: notes.trim(),
        });

        setProjectCodePlatformId("");
        setIndicatorId("");
        setIsActive(true);
        setNotes("");
    };

    return (
        <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{
                width: "100%",
                borderRadius: 4,
                border: "1px solid",
                borderColor: "divider",
                bgcolor: "background.paper",
                p: { xs: 1.5, sm: 2, md: 2.5 },
            }}
        >
            <Stack spacing={2.5}>
                <Box>
                    <Typography variant="h5" fontWeight={900}>
                        {isEdit ? "Edit indicator project" : "Assign indicator to project platform"}
                    </Typography>

                    <Typography variant="body2" color="text.secondary">
                        Connect an indicator to a project-platform assignment.
                    </Typography>
                </Box>

                <Divider />

                <Grid container spacing={2}>
                    <Grid size={{ xs: 12 }}>
                        <TextField
                            select
                            label="Project platform"
                            value={projectCodePlatformId}
                            onChange={(e) => setProjectCodePlatformId(e.target.value)}
                            disabled={loading || isEdit}
                            fullWidth
                            required
                            InputLabelProps={{ shrink: true }}
                        >
                            {activeProjectPlatforms.map((item) => (
                                <MenuItem key={item.id} value={item.id}>
                                    {(item.codeProject?.name ?? "Project")} /{" "}
                                    {(item.platform?.name ?? "Platform")} —{" "}
                                    {item.runtimeMode ?? "runtime"}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Grid>

                    <Grid size={{ xs: 12 }}>
                        <TextField
                            select
                            label="Indicator"
                            value={indicatorId}
                            onChange={(e) => setIndicatorId(e.target.value)}
                            disabled={loading || isEdit}
                            fullWidth
                            required
                            InputLabelProps={{ shrink: true }}
                        >
                            {activeIndicators.map((indicator) => (
                                <MenuItem key={indicator.id} value={indicator.id}>
                                    {indicator.name} ({indicator.key})
                                </MenuItem>
                            ))}
                        </TextField>
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
                        />
                    </Grid>

                    <Grid size={{ xs: 12 }}>
                        <FormControlLabel
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
                    </Grid>
                </Grid>

                <Divider />

                <Stack direction="row" justifyContent="flex-end" spacing={1.5}>
                    <Button
                        variant="outlined"
                        color="inherit"
                        onClick={onCancel}
                        disabled={loading}
                        sx={{ textTransform: "none", fontWeight: 800 }}
                    >
                        Cancel
                    </Button>

                    <Button
                        type="submit"
                        variant="contained"
                        disabled={!canSubmit}
                        sx={{ textTransform: "none", fontWeight: 800 }}
                    >
                        {isEdit ? "Save changes" : "Assign indicator"}
                    </Button>
                </Stack>
            </Stack>
        </Box>
    );
}