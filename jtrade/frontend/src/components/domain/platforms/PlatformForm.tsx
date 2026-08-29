import * as React from "react";
import {
    Avatar,
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

import type { Platform } from "@/types/platforms";

export type PlatformFormValues = {
    key: string;
    name: string;
    description: string;
    isActive: boolean;
};

type Props = {
    initial?: Platform | null;
    loading?: boolean;
    onSubmit: (values: PlatformFormValues, logoFile: File | null) => void | Promise<void>;
    onCancel?: () => void;
};

const DEFAULT_VALUES: PlatformFormValues = {
    key: "",
    name: "",
    description: "",
    isActive: true,
};

export default function PlatformForm({ initial, loading, onSubmit, onCancel }: Props) {
    const isEditing = !!initial;

    const [values, setValues] = React.useState(DEFAULT_VALUES);
    const [logoFile, setLogoFile] = React.useState<File | null>(null);
    const [logoPreview, setLogoPreview] = React.useState<string | null>(null);

    React.useEffect(() => {
        if (!initial) {
            setValues(DEFAULT_VALUES);
            setLogoFile(null);
            setLogoPreview(null);
            return;
        }

        setValues({
            key: initial.key ?? "",
            name: initial.name ?? "",
            description: initial.description ?? "",
            isActive: initial.isActive ?? true,
        });
        setLogoFile(null);
        setLogoPreview(null);
    }, [initial]);

    React.useEffect(() => {
        return () => {
            if (logoPreview) URL.revokeObjectURL(logoPreview);
        };
    }, [logoPreview]);

    const handleChange =
        (field: keyof PlatformFormValues) =>
            (e: React.ChangeEvent<HTMLInputElement>) => {
                const v = field === "isActive" ? e.target.checked : e.target.value;
                setValues((prev) => ({ ...prev, [field]: v }));
            };

    const handlePickFile = (file: File | null) => {
        if (logoPreview) URL.revokeObjectURL(logoPreview);
        setLogoFile(file);
        setLogoPreview(file ? URL.createObjectURL(file) : null);
    };

    const logoSrc = logoPreview || initial?.logoUrl || "";

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!values.name.trim() || !values.key.trim()) return;

        await onSubmit(
            {
                key: values.key.trim().toLowerCase(),
                name: values.name.trim(),
                description: values.description.trim(),
                isActive: values.isActive,
            },
            logoFile,
        );
    };

    return (
        <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={2.5}>
                <Box>
                    <Typography variant="h5" fontWeight={900} sx={{ mb: 0.5 }}>
                        {isEditing ? "Edit platform" : "Create new platform"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {isEditing ? "Review platform details and update its configuration." : "Add a trading platform to the catalogue."}
                    </Typography>
                </Box>

                <Divider />

                <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ xs: "flex-start", sm: "center" }}>
                    <Avatar src={logoSrc} sx={{ width: 56, height: 56 }}>
                        {(values.name?.[0] ?? "P").toUpperCase()}
                    </Avatar>

                    <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                            Logo image, uploaded and stored in Relay.
                        </Typography>
                    </Box>

                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        <Button component="label" variant="outlined" sx={{ textTransform: "none", fontWeight: 700 }}>
                            Upload image
                            <input hidden type="file" accept="image/*" onChange={(e) => handlePickFile(e.target.files?.[0] ?? null)} />
                        </Button>

                        {logoFile && (
                            <Button variant="text" color="inherit" onClick={() => handlePickFile(null)} sx={{ textTransform: "none", fontWeight: 700 }}>
                                Remove
                            </Button>
                        )}
                    </Stack>
                </Stack>

                <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField label="Key" value={values.key} onChange={handleChange("key")} fullWidth required
                            InputLabelProps={{ shrink: true }} helperText="e.g. mt4, mt5, ctrader, tradingview" />
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField label="Name" value={values.name} onChange={handleChange("name")} fullWidth required InputLabelProps={{ shrink: true }} />
                    </Grid>

                    <Grid size={{ xs: 12 }}>
                        <TextField label="Description" value={values.description} onChange={handleChange("description")} fullWidth multiline minRows={2}
                            InputLabelProps={{ shrink: true }} />
                    </Grid>

                    <Grid size={{ xs: 12 }}>
                        <FormControlLabel
                            sx={{ m: 0 }}
                            control={<Switch checked={values.isActive} onChange={handleChange("isActive")} disabled={loading} />}
                            label="Active"
                        />
                    </Grid>
                </Grid>

                <Divider />

                <Stack direction="row" justifyContent={{ xs: "stretch", sm: "flex-end" }} spacing={1.5} flexWrap="wrap" useFlexGap>
                    <Button variant="outlined" color="inherit" onClick={onCancel} disabled={loading} sx={{ textTransform: "none", fontWeight: 800, minWidth: { xs: 100, sm: 120 } }}>
                        Cancel
                    </Button>
                    <Button type="submit" variant="contained" disabled={loading || !values.name.trim() || !values.key.trim()}
                        sx={{ textTransform: "none", fontWeight: 800, minWidth: { xs: 120, sm: 140 } }}>
                        {isEditing ? "Save changes" : "Create platform"}
                    </Button>
                </Stack>
            </Stack>
        </Box>
    );
}
