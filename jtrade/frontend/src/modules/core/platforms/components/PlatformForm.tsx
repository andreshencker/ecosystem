import * as React from "react";
import {
    Avatar,
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

import type { Platform } from "@/modules/core/platforms/types/platforms";

export type PlatformFormValues = {
    name: string;
    category: Platform["category"];
    connectionType: Platform["connectionType"];
    imageUrl?: string;
    isActive: boolean;
    isSupported: boolean;
};

type Props = {
    initial?: Platform | null;
    loading?: boolean;
    onSubmit: (values: PlatformFormValues) => void | Promise<void>;
    onCancel?: () => void;
};

const CATEGORY_OPTIONS: Platform["category"][] = [
    "exchange",
    "broker",
    "data",
    "custody",
    "other",
];

const CONNECTION_OPTIONS: Platform["connectionType"][] = [
    "apikey",
    "oauth",
    "none",
];

const DEFAULT_VALUES: PlatformFormValues = {
    name: "",
    category: "exchange",
    connectionType: "apikey",
    imageUrl: "",
    isActive: true,
    isSupported: false,
};

export default function PlatformForm({
                                         initial,
                                         loading,
                                         onSubmit,
                                         onCancel,
                                     }: Props) {
    const isEditing = !!initial;

    const [values, setValues] = React.useState({
        ...DEFAULT_VALUES,
        imageFile: null as File | null,
        imagePreview: null as string | null,
    });

    React.useEffect(() => {
        if (!initial) {
            setValues({
                ...DEFAULT_VALUES,
                imageFile: null,
                imagePreview: null,
            });
            return;
        }

        setValues({
            name: initial.name ?? "",
            category: initial.category ?? "exchange",
            connectionType: initial.connectionType ?? "apikey",
            imageUrl: initial.imageUrl ?? "",
            isActive: initial.isActive ?? true,
            isSupported: initial.isSupported ?? false,
            imageFile: null,
            imagePreview: null,
        });
    }, [initial]);

    React.useEffect(() => {
        return () => {
            if (values.imagePreview) {
                URL.revokeObjectURL(values.imagePreview);
            }
        };
    }, [values.imagePreview]);

    const handleChange =
        (field: keyof PlatformFormValues) =>
            (e: React.ChangeEvent<HTMLInputElement>) => {
                const v =
                    field === "isActive" || field === "isSupported"
                        ? (e.target as HTMLInputElement).checked
                        : e.target.value;

                setValues((prev) => ({
                    ...prev,
                    [field]: v,
                }));
            };

    const handlePickFile = (file: File | null) => {
        if (values.imagePreview) {
            URL.revokeObjectURL(values.imagePreview);
        }

        if (!file) {
            setValues((prev) => ({
                ...prev,
                imageFile: null,
                imagePreview: null,
            }));
            return;
        }

        const preview = URL.createObjectURL(file);

        setValues((prev) => ({
            ...prev,
            imageFile: file,
            imagePreview: preview,
            imageUrl: "",
        }));
    };

    const imageSrc = values.imagePreview || values.imageUrl || initial?.imageUrl || "";

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!values.name.trim()) return;

        await onSubmit({
            name: values.name.trim(),
            category: values.category,
            connectionType: values.connectionType,
            imageUrl: values.imageUrl?.trim() || undefined,
            isActive: values.isActive,
            isSupported: values.isSupported,
        });
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
                        {isEditing ? "Edit platform" : "Create new platform"}
                    </Typography>

                    <Typography variant="body2" color="text.secondary">
                        {isEditing
                            ? "Review platform details and update its configuration."
                            : "Create a new platform and define its connection settings."}
                    </Typography>
                </Box>

                <Divider />

                <Grid container spacing={2}>
                    <Grid size={{ xs: 12 }}>
                        <Stack
                            direction={{ xs: "column", sm: "row" }}
                            spacing={2}
                            alignItems={{ xs: "flex-start", sm: "center" }}
                        >
                            <Avatar src={imageSrc} sx={{ width: 56, height: 56 }}>
                                {(values.name?.[0] ?? "P").toUpperCase()}
                            </Avatar>

                            <Box sx={{ flex: 1, width: "100%" }}>
                                <TextField
                                    label="Image URL"
                                    value={values.imageUrl ?? ""}
                                    onChange={handleChange("imageUrl")}
                                    fullWidth
                                    InputLabelProps={{ shrink: true }}
                                    placeholder="https://..."
                                    helperText="Paste an image URL or upload a file."
                                />
                            </Box>

                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                <Button
                                    component="label"
                                    variant="outlined"
                                    sx={{ textTransform: "none", fontWeight: 700 }}
                                >
                                    Upload image
                                    <input
                                        hidden
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) =>
                                            handlePickFile(e.target.files?.[0] ?? null)
                                        }
                                    />
                                </Button>

                                {(values.imagePreview || values.imageUrl) && (
                                    <Button
                                        variant="text"
                                        color="inherit"
                                        onClick={() => handlePickFile(null)}
                                        sx={{ textTransform: "none", fontWeight: 700 }}
                                    >
                                        Remove
                                    </Button>
                                )}
                            </Stack>
                        </Stack>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                            label="Name"
                            value={values.name}
                            onChange={handleChange("name")}
                            fullWidth
                            required
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                            select
                            label="Category"
                            value={values.category}
                            onChange={handleChange("category")}
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                        >
                            {CATEGORY_OPTIONS.map((opt) => (
                                <MenuItem key={opt} value={opt}>
                                    {opt.charAt(0).toUpperCase() + opt.slice(1)}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                            select
                            label="Connection type"
                            value={values.connectionType}
                            onChange={handleChange("connectionType")}
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                        >
                            {CONNECTION_OPTIONS.map((opt) => (
                                <MenuItem key={opt} value={opt}>
                                    {opt === "apikey"
                                        ? "API key"
                                        : opt === "oauth"
                                            ? "OAuth"
                                            : "None"}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                        <Stack
                            direction={{ xs: "column", sm: "row" }}
                            spacing={2}
                            alignItems={{ xs: "flex-start", sm: "center" }}
                            sx={{ minHeight: 56 }}
                        >
                            <FormControlLabel
                                sx={{ m: 0 }}
                                control={
                                    <Switch
                                        checked={values.isActive}
                                        onChange={handleChange("isActive")}
                                        disabled={loading}
                                    />
                                }
                                label="Active"
                            />

                            <FormControlLabel
                                sx={{ m: 0 }}
                                control={
                                    <Switch
                                        checked={values.isSupported}
                                        onChange={handleChange("isSupported")}
                                        disabled={loading}
                                    />
                                }
                                label="Supported"
                            />
                        </Stack>
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
                        disabled={loading || !values.name.trim()}
                        sx={{
                            textTransform: "none",
                            fontWeight: 800,
                            minWidth: { xs: 120, sm: 140 },
                        }}
                    >
                        {isEditing ? "Save changes" : "Create platform"}
                    </Button>
                </Stack>
            </Stack>
        </Box>
    );
}