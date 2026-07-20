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

import type { Company, UpdateCompanyDto } from "../types/companyInfo.types";

type Props = {
    initial?: Company | null;
    loading?: boolean;
    onSubmit: (values: UpdateCompanyDto) => void | Promise<void>;
    onCancel?: () => void;
};

type FormState = UpdateCompanyDto & {
    logoIconFile: File | null;
    logoFullFile: File | null;
    logoIconPreview: string | null;
    logoFullPreview: string | null;
};

const EMPTY_VALUES: FormState = {
    companyKey: "",
    displayName: "",
    legalName: "",
    tagline: "",
    timezone: "",

    supportEmail: "",
    supportPhone: "",
    supportHours: "",

    addressLine1: "",
    addressLine2: "",
    addressCity: "",
    addressState: "",
    addressPostalCode: "",
    addressCountry: "",

    webBaseUrl: "",
    apiBaseUrl: "",
    helpCenterUrl: "",
    privacyPolicyUrl: "",
    termsUrl: "",
    unsubscribeUrl: "",

    facebook: "",
    instagram: "",
    linkedin: "",
    x: "",
    youtube: "",
    tiktok: "",
    whatsapp: "",
    telegram: "",

    copyrightText: "",
    disclaimerShort: "",
    disclaimerLong: "",

    logoIconUrl: "",
    logoFullUrl: "",

    isActive: true,

    logoIconFile: null,
    logoFullFile: null,
    logoIconPreview: null,
    logoFullPreview: null,
};

function buildFormState(company?: Company | null): FormState {
    if (!company) return EMPTY_VALUES;

    return {
        companyKey: company.companyKey ?? "",
        displayName: company.displayName ?? "",
        legalName: company.legalName ?? "",
        tagline: company.tagline ?? "",
        timezone: company.timezone ?? "",

        supportEmail: company.supportEmail ?? "",
        supportPhone: company.supportPhone ?? "",
        supportHours: company.supportHours ?? "",

        addressLine1: company.addressLine1 ?? "",
        addressLine2: company.addressLine2 ?? "",
        addressCity: company.addressCity ?? "",
        addressState: company.addressState ?? "",
        addressPostalCode: company.addressPostalCode ?? "",
        addressCountry: company.addressCountry ?? "",

        webBaseUrl: company.webBaseUrl ?? "",
        apiBaseUrl: company.apiBaseUrl ?? "",
        helpCenterUrl: company.helpCenterUrl ?? "",
        privacyPolicyUrl: company.privacyPolicyUrl ?? "",
        termsUrl: company.termsUrl ?? "",
        unsubscribeUrl: company.unsubscribeUrl ?? "",

        facebook: company.facebook ?? "",
        instagram: company.instagram ?? "",
        linkedin: company.linkedin ?? "",
        x: company.x ?? "",
        youtube: company.youtube ?? "",
        tiktok: company.tiktok ?? "",
        whatsapp: company.whatsapp ?? "",
        telegram: company.telegram ?? "",

        copyrightText: company.copyrightText ?? "",
        disclaimerShort: company.disclaimerShort ?? "",
        disclaimerLong: company.disclaimerLong ?? "",

        logoIconUrl: company.logoIconUrl ?? "",
        logoFullUrl: company.logoFullUrl ?? "",

        isActive: company.isActive ?? true,

        logoIconFile: null,
        logoFullFile: null,
        logoIconPreview: null,
        logoFullPreview: null,
    };
}

export default function CompanyInfoForm({
                                            initial,
                                            loading,
                                            onSubmit,
                                            onCancel,
                                        }: Props) {
    const [values, setValues] = React.useState<FormState>(buildFormState(initial));

    React.useEffect(() => {
        setValues(buildFormState(initial));
    }, [initial]);

    React.useEffect(() => {
        return () => {
            if (values.logoIconPreview) URL.revokeObjectURL(values.logoIconPreview);
            if (values.logoFullPreview) URL.revokeObjectURL(values.logoFullPreview);
        };
    }, [values.logoIconPreview, values.logoFullPreview]);

    const handleChange =
        (field: keyof UpdateCompanyDto) =>
            (e: React.ChangeEvent<HTMLInputElement>) => {
                const nextValue =
                    field === "isActive"
                        ? (e.target as HTMLInputElement).checked
                        : e.target.value;

                setValues((prev) => ({
                    ...prev,
                    [field]: nextValue,
                }));
            };

    const handlePickFile = (field: "logoIcon" | "logoFull", file: File | null) => {
        setValues((prev) => {
            const previewKey = field === "logoIcon" ? "logoIconPreview" : "logoFullPreview";
            const fileKey = field === "logoIcon" ? "logoIconFile" : "logoFullFile";
            const urlKey = field === "logoIcon" ? "logoIconUrl" : "logoFullUrl";

            if (prev[previewKey]) {
                URL.revokeObjectURL(prev[previewKey] as string);
            }

            if (!file) {
                return {
                    ...prev,
                    [fileKey]: null,
                    [previewKey]: null,
                };
            }

            const preview = URL.createObjectURL(file);

            return {
                ...prev,
                [fileKey]: file,
                [previewKey]: preview,
                [urlKey]: "",
            };
        });
    };

    const removeImage = (field: "logoIcon" | "logoFull") => {
        setValues((prev) => {
            const previewKey = field === "logoIcon" ? "logoIconPreview" : "logoFullPreview";
            const fileKey = field === "logoIcon" ? "logoIconFile" : "logoFullFile";
            const urlKey = field === "logoIcon" ? "logoIconUrl" : "logoFullUrl";

            if (prev[previewKey]) {
                URL.revokeObjectURL(prev[previewKey] as string);
            }

            return {
                ...prev,
                [fileKey]: null,
                [previewKey]: null,
                [urlKey]: "",
            };
        });
    };

    const handleReset = () => {
        setValues(buildFormState(initial));
        onCancel?.();
    };

    const cleanOptional = (value?: string | null) => {
        const v = String(value ?? "").trim();
        return v || undefined;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!initial) return;

        // ⚠️ Solo enviamos lo que hoy sí parece aceptar tu backend
        const payload: UpdateCompanyDto = {
            displayName: values.displayName?.trim() || undefined,
            legalName: cleanOptional(values.legalName),
            tagline: cleanOptional(values.tagline),
            timezone: cleanOptional(values.timezone),
            logoIconUrl: cleanOptional(values.logoIconUrl),
            logoFullUrl: cleanOptional(values.logoFullUrl),
            isActive: !!values.isActive,
        };

        await onSubmit(payload);
    };

    const logoIconSrc =
        values.logoIconPreview || values.logoIconUrl || initial?.logoIconUrl || "";

    const logoFullSrc =
        values.logoFullPreview || values.logoFullUrl || initial?.logoFullUrl || "";

    return (
        <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{
                width: "100%",
                maxWidth: 1100,
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
                        Company settings
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Manage your company branding and communication settings.
                    </Typography>
                </Box>

                <Divider />

                <Stack spacing={2.5}>
                    <Box>
                        <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1.5 }}>
                            Company identity
                        </Typography>

                        <Grid container spacing={2}>
                            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                                <TextField
                                    label="Company key"
                                    value={values.companyKey ?? ""}
                                    fullWidth
                                    disabled
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>

                            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                                <TextField
                                    label="Display name"
                                    value={values.displayName ?? ""}
                                    onChange={handleChange("displayName")}
                                    fullWidth
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>

                            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                                <TextField
                                    label="Legal name"
                                    value={values.legalName ?? ""}
                                    onChange={handleChange("legalName")}
                                    fullWidth
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>

                            <Grid size={{ xs: 12, md: 8 }}>
                                <TextField
                                    label="Tagline"
                                    value={values.tagline ?? ""}
                                    onChange={handleChange("tagline")}
                                    fullWidth
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>

                            <Grid size={{ xs: 12, md: 4 }}>
                                <TextField
                                    label="Timezone"
                                    value={values.timezone ?? ""}
                                    onChange={handleChange("timezone")}
                                    fullWidth
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>
                        </Grid>
                    </Box>

                    <Divider />

                    <Box>
                        <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1.5 }}>
                            Branding and legal
                        </Typography>

                        <Grid container spacing={2}>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <Stack spacing={1.25}>
                                    <Typography variant="body2" fontWeight={700}>
                                        Logo icon
                                    </Typography>

                                    <Stack direction="row" spacing={1.5} alignItems="center">
                                        <Avatar
                                            src={logoIconSrc}
                                            variant="rounded"
                                            sx={{
                                                width: 72,
                                                height: 72,
                                                borderRadius: 2,
                                                bgcolor: "background.default",
                                            }}
                                        >
                                            {(values.displayName?.[0] ?? "C").toUpperCase()}
                                        </Avatar>

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
                                                        handlePickFile(
                                                            "logoIcon",
                                                            e.target.files?.[0] ?? null
                                                        )
                                                    }
                                                />
                                            </Button>

                                            <Button
                                                variant="text"
                                                color="inherit"
                                                onClick={() => removeImage("logoIcon")}
                                                sx={{ textTransform: "none", fontWeight: 700 }}
                                            >
                                                Remove
                                            </Button>
                                        </Stack>
                                    </Stack>

                                    <TextField
                                        label="Logo icon URL"
                                        value={values.logoIconUrl ?? ""}
                                        onChange={handleChange("logoIconUrl")}
                                        fullWidth
                                        InputLabelProps={{ shrink: true }}
                                        helperText="Paste a direct image URL or upload a file."
                                    />
                                </Stack>
                            </Grid>

                            <Grid size={{ xs: 12, md: 6 }}>
                                <Stack spacing={1.25}>
                                    <Typography variant="body2" fontWeight={700}>
                                        Logo full
                                    </Typography>

                                    <Box
                                        sx={{
                                            width: "100%",
                                            minHeight: 88,
                                            border: "1px dashed",
                                            borderColor: "divider",
                                            borderRadius: 2,
                                            px: 2,
                                            py: 1.5,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            bgcolor: "background.default",
                                            overflow: "hidden",
                                        }}
                                    >
                                        {logoFullSrc ? (
                                            <Box
                                                component="img"
                                                src={logoFullSrc}
                                                alt="Logo full preview"
                                                sx={{
                                                    maxWidth: "100%",
                                                    maxHeight: 56,
                                                    objectFit: "contain",
                                                    display: "block",
                                                }}
                                            />
                                        ) : (
                                            <Typography variant="body2" color="text.secondary">
                                                No image selected
                                            </Typography>
                                        )}
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
                                                    handlePickFile(
                                                        "logoFull",
                                                        e.target.files?.[0] ?? null
                                                    )
                                                }
                                            />
                                        </Button>

                                        <Button
                                            variant="text"
                                            color="inherit"
                                            onClick={() => removeImage("logoFull")}
                                            sx={{ textTransform: "none", fontWeight: 700 }}
                                        >
                                            Remove
                                        </Button>
                                    </Stack>

                                    <TextField
                                        label="Logo full URL"
                                        value={values.logoFullUrl ?? ""}
                                        onChange={handleChange("logoFullUrl")}
                                        fullWidth
                                        InputLabelProps={{ shrink: true }}
                                        helperText="Paste a direct image URL or upload a file."
                                    />
                                </Stack>
                            </Grid>

                            <Grid size={{ xs: 12 }}>
                                <TextField
                                    label="Copyright text"
                                    value={values.copyrightText ?? ""}
                                    fullWidth
                                    disabled
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>

                            <Grid size={{ xs: 12 }}>
                                <TextField
                                    label="Short disclaimer"
                                    value={values.disclaimerShort ?? ""}
                                    fullWidth
                                    disabled
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>

                            <Grid size={{ xs: 12 }}>
                                <TextField
                                    label="Long disclaimer"
                                    value={values.disclaimerLong ?? ""}
                                    fullWidth
                                    multiline
                                    minRows={3}
                                    disabled
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>

                            <Grid size={{ xs: 12 }}>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={!!values.isActive}
                                            onChange={handleChange("isActive")}
                                        />
                                    }
                                    label="Active"
                                />
                            </Grid>
                        </Grid>
                    </Box>
                </Stack>

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
                        Cancel
                    </Button>

                    <Button
                        type="submit"
                        variant="contained"
                        disabled={loading}
                        sx={{
                            fontWeight: 900,
                            textTransform: "none",
                            minWidth: 160,
                        }}
                    >
                        Save changes
                    </Button>
                </Stack>
            </Stack>
        </Box>
    );
}