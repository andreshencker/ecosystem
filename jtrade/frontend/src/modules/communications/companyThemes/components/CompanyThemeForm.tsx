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
    CompanyTheme,
    CreateCompanyThemeDto,
    UpdateCompanyThemeDto,
} from "../types/companyThemes.types";

type Props = {
    initial?: CompanyTheme | null;
    companyId: string;
    loading?: boolean;
    mode?: "create" | "edit" | "view";
    onSubmit: (values: CreateCompanyThemeDto | UpdateCompanyThemeDto) => void | Promise<void>;
    onCancel?: () => void;
};

type FormValues = {
    label: string;

    primaryColor: string;
    secondaryColor: string;
    backgroundColor: string;
    surfaceColor: string;
    textColor: string;
    mutedTextColor: string;
    borderColor: string;
    linkColor: string;

    fontFamily: string;
    fontSizeBase: string;
    fontWeightNormal: string;
    fontWeightBold: string;

    isDefault: boolean;
    isActive: boolean;
};

const DEFAULT_VALUES: FormValues = {
    label: "",
    primaryColor: "#f59e0b",
    secondaryColor: "#1f2937",
    backgroundColor: "#0b1120",
    surfaceColor: "#111827",
    textColor: "#f9fafb",
    mutedTextColor: "#9ca3af",
    borderColor: "#374151",
    linkColor: "#60a5fa",
    fontFamily: "Inter, sans-serif",
    fontSizeBase: "14px",
    fontWeightNormal: "400",
    fontWeightBold: "700",
    isDefault: false,
    isActive: true,
};

function isHexColor(value: string) {
    return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(String(value ?? "").trim());
}

function buildInitialValues(initial?: CompanyTheme | null): FormValues {
    if (!initial) return DEFAULT_VALUES;

    return {
        label: initial.label ?? "",
        primaryColor: initial.primaryColor ?? DEFAULT_VALUES.primaryColor,
        secondaryColor: initial.secondaryColor ?? DEFAULT_VALUES.secondaryColor,
        backgroundColor: initial.backgroundColor ?? DEFAULT_VALUES.backgroundColor,
        surfaceColor: initial.surfaceColor ?? DEFAULT_VALUES.surfaceColor,
        textColor: initial.textColor ?? DEFAULT_VALUES.textColor,
        mutedTextColor: initial.mutedTextColor ?? DEFAULT_VALUES.mutedTextColor,
        borderColor: initial.borderColor ?? DEFAULT_VALUES.borderColor,
        linkColor: initial.linkColor ?? DEFAULT_VALUES.linkColor,
        fontFamily: initial.fontFamily ?? DEFAULT_VALUES.fontFamily,
        fontSizeBase: initial.fontSizeBase ?? DEFAULT_VALUES.fontSizeBase,
        fontWeightNormal: String(initial.fontWeightNormal ?? 400),
        fontWeightBold: String(initial.fontWeightBold ?? 700),
        isDefault: !!initial.isDefault,
        isActive: !!initial.isActive,
    };
}

function ColorField({
                        label,
                        value,
                        onChange,
                        disabled,
                    }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
}) {
    return (
        <Stack spacing={1}>
            <Typography variant="body2" fontWeight={700}>
                {label}
            </Typography>

            <Stack direction="row" spacing={1.25} alignItems="center">
                <Box
                    sx={{
                        width: 42,
                        height: 42,
                        borderRadius: 2,
                        border: "1px solid",
                        borderColor: "divider",
                        bgcolor: isHexColor(value) ? value : "transparent",
                        overflow: "hidden",
                        flex: "0 0 auto",
                    }}
                >
                    <Box
                        component="input"
                        type="color"
                        value={isHexColor(value) ? value : "#000000"}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            onChange(e.target.value)
                        }
                        disabled={disabled}
                        sx={{
                            width: "100%",
                            height: "100%",
                            border: "none",
                            p: 0,
                            m: 0,
                            bgcolor: "transparent",
                            cursor: disabled ? "default" : "pointer",
                        }}
                    />
                </Box>

                <TextField
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    fullWidth
                    placeholder="#000000"
                    disabled={disabled}
                    InputLabelProps={{ shrink: true }}
                />
            </Stack>
        </Stack>
    );
}

export default function CompanyThemeForm({
                                             initial,
                                             companyId,
                                             loading,
                                             mode = "create",
                                             onSubmit,
                                             onCancel,
                                         }: Props) {
    const isEditing = mode === "edit";
    const isViewing = mode === "view";

    const [values, setValues] = React.useState<FormValues>(() =>
        buildInitialValues(initial)
    );

    React.useEffect(() => {
        setValues(buildInitialValues(initial));
    }, [initial]);

    const handleReset = () => {
        setValues(buildInitialValues(initial));
        onCancel?.();
    };

    const allColorsValid = [
        values.primaryColor,
        values.secondaryColor,
        values.backgroundColor,
        values.surfaceColor,
        values.textColor,
        values.mutedTextColor,
        values.borderColor,
        values.linkColor,
    ].every(isHexColor);

    const disabled =
        !!loading ||
        !companyId ||
        !values.label.trim() ||
        !values.fontFamily.trim() ||
        !values.fontSizeBase.trim() ||
        !values.fontWeightNormal.trim() ||
        !values.fontWeightBold.trim() ||
        Number.isNaN(Number(values.fontWeightNormal)) ||
        Number.isNaN(Number(values.fontWeightBold)) ||
        !allColorsValid;

    const previewSx = {
        fontFamily: values.fontFamily,
        fontSize: values.fontSizeBase,
        color: values.textColor,
        bgcolor: values.backgroundColor,
        border: `1px solid ${values.borderColor}`,
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isViewing) return;

        const basePayload = {
            label: values.label.trim(),

            primaryColor: values.primaryColor.trim(),
            secondaryColor: values.secondaryColor.trim(),
            backgroundColor: values.backgroundColor.trim(),
            surfaceColor: values.surfaceColor.trim(),
            textColor: values.textColor.trim(),
            mutedTextColor: values.mutedTextColor.trim(),
            borderColor: values.borderColor.trim(),
            linkColor: values.linkColor.trim(),

            fontFamily: values.fontFamily.trim(),
            fontSizeBase: values.fontSizeBase.trim(),
            fontWeightNormal: Number(values.fontWeightNormal),
            fontWeightBold: Number(values.fontWeightBold),

            isDefault: !!values.isDefault,
            isActive: !!values.isActive,
        };

        if (isEditing) {
            await onSubmit(basePayload as UpdateCompanyThemeDto);
            return;
        }

        await onSubmit({
            companyId,
            ...basePayload,
        } as CreateCompanyThemeDto);
    };

    return (
        <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{
                width: "100%",
                maxWidth: 860,
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
                        {mode === "create"
                            ? "Create theme"
                            : mode === "edit"
                                ? "Edit theme"
                                : "Theme details"}
                    </Typography>

                    <Typography variant="body2" color="text.secondary">
                        {isViewing
                            ? "Review all theme settings."
                            : "Configure theme colors, typography and status for this company."}
                    </Typography>
                </Box>

                <Divider />

                <Grid container spacing={2.5}>
                    <Grid size={{ xs: 12, lg: 7 }}>
                        <Stack spacing={2.5}>
                            <Box>
                                <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1.5 }}>
                                    Theme info
                                </Typography>

                                <Grid container spacing={2}>
                                    <Grid size={{ xs: 12 }}>
                                        <TextField
                                            label="Theme name"
                                            value={values.label}
                                            onChange={(e) =>
                                                setValues((prev) => ({ ...prev, label: e.target.value }))
                                            }
                                            fullWidth
                                            required
                                            disabled={isViewing}
                                            InputLabelProps={{ shrink: true }}
                                        />
                                    </Grid>
                                </Grid>
                            </Box>

                            <Divider />

                            <Box>
                                <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1.5 }}>
                                    Brand colors
                                </Typography>

                                <Grid container spacing={2}>
                                    <Grid size={{ xs: 12, md: 6 }}>
                                        <ColorField
                                            label="Primary color"
                                            value={values.primaryColor}
                                            disabled={isViewing}
                                            onChange={(v) =>
                                                setValues((prev) => ({ ...prev, primaryColor: v }))
                                            }
                                        />
                                    </Grid>

                                    <Grid size={{ xs: 12, md: 6 }}>
                                        <ColorField
                                            label="Secondary color"
                                            value={values.secondaryColor}
                                            disabled={isViewing}
                                            onChange={(v) =>
                                                setValues((prev) => ({ ...prev, secondaryColor: v }))
                                            }
                                        />
                                    </Grid>

                                    <Grid size={{ xs: 12, md: 6 }}>
                                        <ColorField
                                            label="Background color"
                                            value={values.backgroundColor}
                                            disabled={isViewing}
                                            onChange={(v) =>
                                                setValues((prev) => ({ ...prev, backgroundColor: v }))
                                            }
                                        />
                                    </Grid>

                                    <Grid size={{ xs: 12, md: 6 }}>
                                        <ColorField
                                            label="Surface color"
                                            value={values.surfaceColor}
                                            disabled={isViewing}
                                            onChange={(v) =>
                                                setValues((prev) => ({ ...prev, surfaceColor: v }))
                                            }
                                        />
                                    </Grid>

                                    <Grid size={{ xs: 12, md: 6 }}>
                                        <ColorField
                                            label="Text color"
                                            value={values.textColor}
                                            disabled={isViewing}
                                            onChange={(v) =>
                                                setValues((prev) => ({ ...prev, textColor: v }))
                                            }
                                        />
                                    </Grid>

                                    <Grid size={{ xs: 12, md: 6 }}>
                                        <ColorField
                                            label="Muted text color"
                                            value={values.mutedTextColor}
                                            disabled={isViewing}
                                            onChange={(v) =>
                                                setValues((prev) => ({ ...prev, mutedTextColor: v }))
                                            }
                                        />
                                    </Grid>

                                    <Grid size={{ xs: 12, md: 6 }}>
                                        <ColorField
                                            label="Border color"
                                            value={values.borderColor}
                                            disabled={isViewing}
                                            onChange={(v) =>
                                                setValues((prev) => ({ ...prev, borderColor: v }))
                                            }
                                        />
                                    </Grid>

                                    <Grid size={{ xs: 12, md: 6 }}>
                                        <ColorField
                                            label="Link color"
                                            value={values.linkColor}
                                            disabled={isViewing}
                                            onChange={(v) =>
                                                setValues((prev) => ({ ...prev, linkColor: v }))
                                            }
                                        />
                                    </Grid>
                                </Grid>
                            </Box>

                            <Divider />

                            <Box>
                                <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1.5 }}>
                                    Typography
                                </Typography>

                                <Grid container spacing={2}>
                                    <Grid size={{ xs: 12, md: 6 }}>
                                        <TextField
                                            label="Font family"
                                            value={values.fontFamily}
                                            onChange={(e) =>
                                                setValues((prev) => ({ ...prev, fontFamily: e.target.value }))
                                            }
                                            fullWidth
                                            disabled={isViewing}
                                            InputLabelProps={{ shrink: true }}
                                        />
                                    </Grid>

                                    <Grid size={{ xs: 12, md: 6 }}>
                                        <TextField
                                            label="Base font size"
                                            value={values.fontSizeBase}
                                            onChange={(e) =>
                                                setValues((prev) => ({ ...prev, fontSizeBase: e.target.value }))
                                            }
                                            fullWidth
                                            disabled={isViewing}
                                            placeholder="14px"
                                            InputLabelProps={{ shrink: true }}
                                        />
                                    </Grid>

                                    <Grid size={{ xs: 12, md: 6 }}>
                                        <TextField
                                            label="Font weight normal"
                                            value={values.fontWeightNormal}
                                            onChange={(e) =>
                                                setValues((prev) => ({
                                                    ...prev,
                                                    fontWeightNormal: e.target.value,
                                                }))
                                            }
                                            fullWidth
                                            type="number"
                                            disabled={isViewing}
                                            InputLabelProps={{ shrink: true }}
                                        />
                                    </Grid>

                                    <Grid size={{ xs: 12, md: 6 }}>
                                        <TextField
                                            label="Font weight bold"
                                            value={values.fontWeightBold}
                                            onChange={(e) =>
                                                setValues((prev) => ({
                                                    ...prev,
                                                    fontWeightBold: e.target.value,
                                                }))
                                            }
                                            fullWidth
                                            type="number"
                                            disabled={isViewing}
                                            InputLabelProps={{ shrink: true }}
                                        />
                                    </Grid>
                                </Grid>
                            </Box>

                            <Divider />

                            <Box>
                                <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1.5 }}>
                                    Status
                                </Typography>

                                <Stack spacing={1}>
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={!!values.isDefault}
                                                disabled={isViewing}
                                                onChange={(e) =>
                                                    setValues((prev) => ({
                                                        ...prev,
                                                        isDefault: e.target.checked,
                                                        isActive: e.target.checked ? true : prev.isActive,
                                                    }))
                                                }
                                            />
                                        }
                                        label="Default theme"
                                    />

                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={!!values.isActive}
                                                disabled={isViewing}
                                                onChange={(e) =>
                                                    setValues((prev) => ({
                                                        ...prev,
                                                        isActive: e.target.checked,
                                                        isDefault: !e.target.checked
                                                            ? false
                                                            : prev.isDefault,
                                                    }))
                                                }
                                            />
                                        }
                                        label="Active"
                                    />

                                    <Typography variant="caption" color="text.secondary">
                                        If a theme is marked as default, it will automatically remain active.
                                    </Typography>
                                </Stack>
                            </Box>
                        </Stack>
                    </Grid>

                    <Grid size={{ xs: 12, lg: 5 }}>
                        <Stack spacing={1.5}>
                            <Typography variant="subtitle1" fontWeight={800}>
                                Live preview
                            </Typography>

                            <Box
                                sx={{
                                    ...previewSx,
                                    borderRadius: 3,
                                    p: 2,
                                }}
                            >
                                <Box
                                    sx={{
                                        bgcolor: values.surfaceColor,
                                        border: `1px solid ${values.borderColor}`,
                                        borderRadius: 3,
                                        p: 2,
                                    }}
                                >
                                    <Typography
                                        sx={{
                                            fontWeight: Number(values.fontWeightBold) || 700,
                                            mb: 0.5,
                                            color: values.textColor,
                                            fontFamily: values.fontFamily,
                                            fontSize: values.fontSizeBase,
                                        }}
                                    >
                                        {values.label.trim() || "Theme preview"}
                                    </Typography>

                                    <Typography
                                        sx={{
                                            color: values.mutedTextColor,
                                            mb: 1.5,
                                            fontWeight: Number(values.fontWeightNormal) || 400,
                                            fontFamily: values.fontFamily,
                                            fontSize: values.fontSizeBase,
                                        }}
                                    >
                                        This is how your visual configuration will look.
                                    </Typography>

                                    <Stack direction="row" spacing={1.25} alignItems="center">
                                        <Box
                                            sx={{
                                                px: 1.5,
                                                py: 0.75,
                                                borderRadius: 2,
                                                bgcolor: values.primaryColor,
                                                color: values.surfaceColor,
                                                fontWeight: Number(values.fontWeightBold) || 700,
                                                fontFamily: values.fontFamily,
                                                fontSize: values.fontSizeBase,
                                            }}
                                        >
                                            Primary
                                        </Box>

                                        <Box
                                            sx={{
                                                px: 1.5,
                                                py: 0.75,
                                                borderRadius: 2,
                                                bgcolor: values.secondaryColor,
                                                color: values.textColor,
                                                fontWeight: Number(values.fontWeightNormal) || 400,
                                                fontFamily: values.fontFamily,
                                                fontSize: values.fontSizeBase,
                                            }}
                                        >
                                            Secondary
                                        </Box>
                                    </Stack>

                                    <Typography
                                        sx={{
                                            mt: 1.5,
                                            color: values.linkColor,
                                            textDecoration: "underline",
                                            fontFamily: values.fontFamily,
                                            fontSize: values.fontSizeBase,
                                        }}
                                    >
                                        Sample link
                                    </Typography>
                                </Box>
                            </Box>
                        </Stack>
                    </Grid>
                </Grid>

                <Divider />

                <Stack
                    direction="row"
                    justifyContent="flex-end"
                    spacing={1.5}
                    flexWrap="wrap"
                    useFlexGap
                >
                    <Button
                        type="button"
                        variant="outlined"
                        color="inherit"
                        onClick={handleReset}
                        disabled={loading}
                        sx={{
                            textTransform: "none",
                            fontWeight: 800,
                            minWidth: 140,
                        }}
                    >
                        {isViewing ? "Close" : "Cancel"}
                    </Button>

                    {!isViewing && (
                        <Button
                            type="submit"
                            variant="contained"
                            color="warning"
                            disabled={disabled}
                            sx={{
                                fontWeight: 900,
                                textTransform: "none",
                                minWidth: 160,
                                borderRadius: 3,
                                boxShadow: "none",
                            }}
                        >
                            {isEditing ? "Save changes" : "Create theme"}
                        </Button>
                    )}
                </Stack>
            </Stack>
        </Box>
    );
}