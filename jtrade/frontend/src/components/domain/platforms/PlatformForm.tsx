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
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from "@mui/material";

import type { Platform } from "@/types/platforms";

export type PlatformFormValues = {
    key: string;
    name: string;
    description: string;
    isActive: boolean;
    isSupported: boolean;
    logoUrl?: string;
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
    isSupported: false,
};

type LogoMode = "upload" | "url";

function LogoField({
    fallbackChar,
    logoFilePreview,
    urlValue,
    mode,
    onModeChange,
    onFileSelect,
    onUrlChange,
    onRemove,
}: {
    fallbackChar: string;
    logoFilePreview: string | null;
    urlValue: string;
    mode: LogoMode;
    onModeChange: (mode: LogoMode) => void;
    onFileSelect: (file: File | null) => void;
    onUrlChange: (url: string) => void;
    onRemove: () => void;
}) {
    const previewSrc = logoFilePreview || urlValue || "";

    return (
        <Box
            sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 1.5,
                p: 2.5,
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 3,
                bgcolor: "action.hover",
            }}
        >
            <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ alignSelf: "flex-start" }}>
                Logo
            </Typography>

            <Box
                sx={{
                    width: 96,
                    height: 96,
                    borderRadius: "20px",
                    border: "1px solid",
                    borderColor: "divider",
                    bgcolor: "background.paper",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                    flexShrink: 0,
                }}
            >
                {previewSrc ? (
                    <Box component="img" src={previewSrc} alt="" sx={{ width: "100%", height: "100%", objectFit: "contain" }} />
                ) : (
                    <Typography variant="h5" color="text.secondary">{fallbackChar}</Typography>
                )}
            </Box>

            {previewSrc && (
                <Button
                    variant="text"
                    size="small"
                    color="error"
                    onClick={onRemove}
                    sx={{ textTransform: "none", fontWeight: 700, textDecoration: "underline", minWidth: 0, p: 0 }}
                >
                    Remove logo
                </Button>
            )}

            <ToggleButtonGroup
                value={mode}
                exclusive
                size="small"
                onChange={(_, value: LogoMode | null) => value && onModeChange(value)}
                sx={{
                    borderRadius: 999,
                    "& .MuiToggleButton-root": {
                        textTransform: "none",
                        fontWeight: 700,
                        fontSize: 12,
                        border: 0,
                        borderRadius: 999,
                        px: 2.25,
                        color: "text.secondary",
                        "&.Mui-selected": {
                            bgcolor: "text.primary",
                            color: "background.paper",
                            "&:hover": { bgcolor: "text.primary" },
                        },
                    },
                }}
            >
                <ToggleButton value="upload">Upload</ToggleButton>
                <ToggleButton value="url">URL</ToggleButton>
            </ToggleButtonGroup>

            {mode === "upload" ? (
                <Button component="label" variant="outlined" fullWidth sx={{ textTransform: "none", fontWeight: 600 }}>
                    Choose an image…
                    <input
                        hidden
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                            onFileSelect(e.target.files?.[0] ?? null);
                            e.target.value = "";
                        }}
                    />
                </Button>
            ) : (
                <TextField
                    value={urlValue}
                    onChange={(e) => onUrlChange(e.target.value)}
                    placeholder="https://"
                    fullWidth
                    size="small"
                />
            )}
        </Box>
    );
}

export default function PlatformForm({ initial, loading, onSubmit, onCancel }: Props) {
    const isEditing = !!initial;

    const [values, setValues] = React.useState(DEFAULT_VALUES);
    const [logoMode, setLogoMode] = React.useState<LogoMode>("upload");
    const [logoFile, setLogoFile] = React.useState<File | null>(null);
    const [logoFilePreview, setLogoFilePreview] = React.useState<string | null>(null);
    const [logoUrlValue, setLogoUrlValue] = React.useState("");

    React.useEffect(() => {
        setValues({
            key: initial?.key ?? "",
            name: initial?.name ?? "",
            description: initial?.description ?? "",
            isActive: initial?.isActive ?? true,
            isSupported: initial?.isSupported ?? false,
        });
        setLogoMode(initial?.logoUrl ? "url" : "upload");
        setLogoFile(null);
        setLogoFilePreview(null);
        setLogoUrlValue(initial?.logoUrl ?? "");
    }, [initial]);

    React.useEffect(() => {
        return () => {
            if (logoFilePreview) URL.revokeObjectURL(logoFilePreview);
        };
    }, [logoFilePreview]);

    const handleChange =
        (field: keyof Omit<PlatformFormValues, "logoUrl">) =>
            (e: React.ChangeEvent<HTMLInputElement>) => {
                const v = field === "isActive" || field === "isSupported" ? e.target.checked : e.target.value;
                setValues((prev) => ({ ...prev, [field]: v }));
            };

    const handlePickFile = (file: File | null) => {
        if (logoFilePreview) URL.revokeObjectURL(logoFilePreview);
        setLogoFile(file);
        setLogoFilePreview(file ? URL.createObjectURL(file) : null);
    };

    const handleRemoveLogo = () => {
        handlePickFile(null);
        setLogoUrlValue("");
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!values.name.trim() || !values.key.trim()) return;

        await onSubmit(
            {
                key: values.key.trim().toLowerCase(),
                name: values.name.trim(),
                description: values.description.trim(),
                isActive: values.isActive,
                isSupported: values.isSupported,
                logoUrl: logoFile ? undefined : logoUrlValue.trim(),
            },
            logoMode === "upload" ? logoFile : null,
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

                <LogoField
                    fallbackChar={(values.name?.[0] ?? "P").toUpperCase()}
                    logoFilePreview={logoFilePreview}
                    urlValue={logoUrlValue}
                    mode={logoMode}
                    onModeChange={setLogoMode}
                    onFileSelect={handlePickFile}
                    onUrlChange={setLogoUrlValue}
                    onRemove={handleRemoveLogo}
                />

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

                    <Grid size={{ xs: 12, sm: 6 }}>
                        <FormControlLabel
                            sx={{ m: 0 }}
                            control={<Switch checked={values.isActive} onChange={handleChange("isActive")} disabled={loading} />}
                            label="Active"
                        />
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                        <FormControlLabel
                            sx={{ m: 0 }}
                            control={<Switch checked={values.isSupported} onChange={handleChange("isSupported")} disabled={loading} />}
                            label="Supported"
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
