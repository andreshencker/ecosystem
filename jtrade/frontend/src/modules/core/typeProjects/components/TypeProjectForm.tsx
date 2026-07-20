import * as React from "react";
import {
    Box,
    Button,
    Divider,
    FormControlLabel,
    Grid,
    Stack,
    Switch,
    TextField,
    Typography,
} from "@mui/material";

import type {
    CreateTypeProjectDto,
    TypeProject,
} from "../types/typeProject";

export type TypeProjectFormValues = CreateTypeProjectDto;

type Props = {
    initial?: TypeProject | null;
    loading?: boolean;
    onSubmit: (values: TypeProjectFormValues) => void | Promise<void>;
    onCancel?: () => void;
};

const DEFAULT_VALUES: TypeProjectFormValues = {
    key: "",
    name: "",
    description: "",
    isActive: true,
};

function normalizeKey(value: string): string {
    return value.trim().toLowerCase().replace(/\s+/g, "_");
}

export default function TypeProjectForm({
                                            initial,
                                            loading,
                                            onSubmit,
                                            onCancel,
                                        }: Props) {
    const isEditing = !!initial;

    const [values, setValues] =
        React.useState<TypeProjectFormValues>(DEFAULT_VALUES);

    React.useEffect(() => {
        if (!initial) {
            setValues(DEFAULT_VALUES);
            return;
        }

        setValues({
            key: initial.key ?? "",
            name: initial.name ?? "",
            description: initial.description ?? "",
            isActive: initial.isActive ?? true,
        });
    }, [initial]);

    const handleChange =
        (field: keyof TypeProjectFormValues) =>
            (e: React.ChangeEvent<HTMLInputElement>) => {
                const nextValue =
                    field === "isActive"
                        ? (e.target as HTMLInputElement).checked
                        : e.target.value;

                setValues((prev) => ({
                    ...prev,
                    [field]: nextValue as never,
                }));
            };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (loading) return;

        const key = normalizeKey(values.key);
        const name = values.name.trim();

        if (!key || !name) return;

        await onSubmit({
            key,
            name,
            description: values.description?.trim() || undefined,
            isActive: !!values.isActive,
        });

        if (!isEditing) {
            setValues(DEFAULT_VALUES);
        }
    };

    return (
        <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{
                width: "100%",
                maxWidth: 680,
                mx: "auto",
                borderRadius: 4,
                border: "1px solid",
                borderColor: "divider",
                bgcolor: "background.paper",
                p: { xs: 1.5, sm: 2, md: 2.5 },
                overflow: "hidden",
            }}
        >
            <Stack spacing={2.5}>
                <Box>
                    <Typography variant="h5" fontWeight={900} sx={{ mb: 0.5 }}>
                        {isEditing ? "Edit type project" : "Create type project"}
                    </Typography>

                    <Typography variant="body2" color="text.secondary">
                        Define the classification used by marketplace projects, such as bot, indicator or strategy.
                    </Typography>
                </Box>

                <Divider />

                <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                            label="Key"
                            value={values.key}
                            onChange={handleChange("key")}
                            fullWidth
                            required
                            disabled={loading}
                            placeholder="bot"
                            helperText="Example: bot, indicator, signal_provider"
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                            label="Name"
                            value={values.name}
                            onChange={handleChange("name")}
                            fullWidth
                            required
                            disabled={loading}
                            placeholder="Bot"
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>

                    <Grid size={{ xs: 12 }}>
                        <TextField
                            label="Description"
                            value={values.description ?? ""}
                            onChange={handleChange("description")}
                            fullWidth
                            multiline
                            minRows={3}
                            disabled={loading}
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>

                    <Grid size={{ xs: 12 }}>
                        <FormControlLabel
                            sx={{ m: 0 }}
                            control={
                                <Switch
                                    size="small"
                                    checked={!!values.isActive}
                                    onChange={handleChange("isActive")}
                                    disabled={loading}
                                />
                            }
                            label="Active"
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
                            textTransform: "none",
                            fontWeight: 800,
                            minWidth: { xs: 100, sm: 120 },
                        }}
                    >
                        Cancel
                    </Button>

                    <Button
                        type="submit"
                        variant="contained"
                        disabled={
                            !!loading ||
                            !values.key.trim() ||
                            !values.name.trim()
                        }
                        sx={{
                            textTransform: "none",
                            fontWeight: 800,
                            minWidth: { xs: 120, sm: 140 },
                        }}
                    >
                        {loading
                            ? "Saving..."
                            : isEditing
                                ? "Save changes"
                                : "Create type"}
                    </Button>
                </Stack>
            </Stack>
        </Box>
    );
}