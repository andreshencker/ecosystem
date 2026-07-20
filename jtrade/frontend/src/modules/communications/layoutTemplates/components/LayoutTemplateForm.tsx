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
    CompanyThemeOption,
    CreateLayoutTemplateDto,
    LayoutTemplate,
    TemplateType,
    UpdateLayoutTemplateDto,
} from "../types/layoutTemplates.types";

type Mode = "create" | "edit" | "view";

type Props = {
    initial?: LayoutTemplate | null;
    companyThemeOptions?: CompanyThemeOption[];
    loading?: boolean;
    mode?: Mode;
    onSubmit: (
        values: CreateLayoutTemplateDto | UpdateLayoutTemplateDto
    ) => void | Promise<void>;
    onCancel?: () => void;
};

type FormValues = {
    companyThemeId: string;
    templateType: TemplateType;
    key: string;
    name: string;
    html: string;
    css: string;
    requiredVariablesText: string;
    optionalVariablesText: string;
    isDefault: boolean;
    isActive: boolean;
};

const DEFAULT_VALUES: FormValues = {
    companyThemeId: "",
    templateType: "email",
    key: "",
    name: "",
    html: "",
    css: "",
    requiredVariablesText: "",
    optionalVariablesText: "",
    isDefault: false,
    isActive: true,
};

function buildInitialValues(initial?: LayoutTemplate | null): FormValues {
    if (!initial) return DEFAULT_VALUES;

    return {
        companyThemeId: initial.companyThemeId ?? "",
        templateType: initial.templateType ?? "email",
        key: initial.key ?? "",
        name: initial.name ?? "",
        html: initial.html ?? "",
        css: initial.css ?? "",
        requiredVariablesText: (initial.requiredVariables ?? []).join(", "),
        optionalVariablesText: (initial.optionalVariables ?? []).join(", "),
        isDefault: !!initial.isDefault,
        isActive: !!initial.isActive,
    };
}

function parseVariables(value: string): string[] {
    return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
}

export default function LayoutTemplateForm({
                                               initial,
                                               companyThemeOptions = [],
                                               loading,
                                               mode = "create",
                                               onSubmit,
                                               onCancel,
                                           }: Props) {
    const isView = mode === "view";
    const isEdit = mode === "edit";
    const isCreate = mode === "create";

    const [values, setValues] = React.useState<FormValues>(
        buildInitialValues(initial)
    );

    React.useEffect(() => {
        setValues(buildInitialValues(initial));
    }, [initial]);

    const handleChange =
        (field: keyof FormValues) =>
            (
                e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
            ) => {
                const nextValue =
                    field === "isDefault" || field === "isActive"
                        ? (e.target as HTMLInputElement).checked
                        : e.target.value;

                setValues((prev) => ({
                    ...prev,
                    [field]: nextValue,
                }));
            };

    const handleReset = () => {
        setValues(buildInitialValues(initial));
        onCancel?.();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isView) return;

        const base = {
            companyThemeId: values.companyThemeId,
            templateType: values.templateType,
            key: values.key.trim().toLowerCase(),
            name: values.name.trim(),
            html: values.html,
            css: values.css,
            requiredVariables: parseVariables(values.requiredVariablesText),
            optionalVariables: parseVariables(values.optionalVariablesText),
            isDefault: !!values.isDefault,
            isActive: !!values.isActive,
        };

        if (isCreate) {
            const payload: CreateLayoutTemplateDto = {
                ...base,
            };
            await onSubmit(payload);
            return;
        }

        const payload: UpdateLayoutTemplateDto = {
            companyThemeId: base.companyThemeId,
            templateType: base.templateType,
            key: base.key,
            name: base.name,
            html: base.html,
            css: base.css,
            requiredVariables: base.requiredVariables,
            optionalVariables: base.optionalVariables,
            isDefault: base.isDefault,
            isActive: base.isActive,
        };

        await onSubmit(payload);
    };

    const submitDisabled =
        loading ||
        !values.companyThemeId ||
        !values.key.trim() ||
        !values.name.trim() ||
        !values.html.trim();

    return (
        <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{
                width: "100%",
                borderRadius: 4,
                border: "1px solid",
                borderColor: "divider",
                p: { xs: 1.5, sm: 2, md: 2.5 },
                bgcolor: "background.paper",
            }}
        >
            <Stack spacing={2.5}>
                <Box>
                    <Typography variant="h5" fontWeight={900} sx={{ mb: 0.5 }}>
                        {isCreate
                            ? "Create layout template"
                            : isEdit
                                ? "Edit layout template"
                                : "Layout template details"}
                    </Typography>

                    <Typography variant="body2" color="text.secondary">
                        {isView
                            ? "Review all template settings."
                            : "Configure template structure, metadata and variables."}
                    </Typography>
                </Box>

                <Divider />

                <Box>
                    <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1.5 }}>
                        General
                    </Typography>

                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <TextField
                                select
                                label="Theme"
                                value={values.companyThemeId}
                                onChange={handleChange("companyThemeId")}
                                fullWidth
                                disabled={isView || isEdit}
                                InputLabelProps={{ shrink: true }}
                            >
                                {companyThemeOptions.length === 0 ? (
                                    <MenuItem value="" disabled>
                                        No themes available
                                    </MenuItem>
                                ) : (
                                    companyThemeOptions.map((option) => (
                                        <MenuItem key={option.id} value={option.id}>
                                            {option.label}
                                        </MenuItem>
                                    ))
                                )}
                            </TextField>
                        </Grid>

                        <Grid size={{ xs: 12, md: 2 }}>
                            <TextField
                                select
                                label="Type"
                                value={values.templateType}
                                onChange={handleChange("templateType")}
                                fullWidth
                                disabled={isView}
                                InputLabelProps={{ shrink: true }}
                            >
                                <MenuItem value="email">Email</MenuItem>
                                <MenuItem value="pdf">PDF</MenuItem>
                            </TextField>
                        </Grid>

                        <Grid size={{ xs: 12, md: 3 }}>
                            <TextField
                                label="Key"
                                value={values.key}
                                onChange={handleChange("key")}
                                fullWidth
                                disabled={isView}
                                InputLabelProps={{ shrink: true }}
                                placeholder="welcome-layout"
                            />
                        </Grid>

                        <Grid size={{ xs: 12, md: 3 }}>
                            <TextField
                                label="Name"
                                value={values.name}
                                onChange={handleChange("name")}
                                fullWidth
                                disabled={isView}
                                InputLabelProps={{ shrink: true }}
                                placeholder="Welcome layout"
                            />
                        </Grid>
                    </Grid>
                </Box>

                <Divider />

                <Box>
                    <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1.5 }}>
                        Content
                    </Typography>

                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12 }}>
                            <TextField
                                label="HTML"
                                value={values.html}
                                onChange={handleChange("html")}
                                fullWidth
                                multiline
                                minRows={10}
                                disabled={isView}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>

                        <Grid size={{ xs: 12 }}>
                            <TextField
                                label="CSS"
                                value={values.css}
                                onChange={handleChange("css")}
                                fullWidth
                                multiline
                                minRows={6}
                                disabled={isView}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                    </Grid>
                </Box>

                <Divider />

                <Box>
                    <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1.5 }}>
                        Variables
                    </Typography>

                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12 }}>
                            <TextField
                                label="Required variables"
                                value={values.requiredVariablesText}
                                onChange={handleChange("requiredVariablesText")}
                                fullWidth
                                disabled={isView}
                                helperText="Separate values with commas."
                                placeholder="companyName, userName, actionUrl"
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>

                        <Grid size={{ xs: 12 }}>
                            <TextField
                                label="Optional variables"
                                value={values.optionalVariablesText}
                                onChange={handleChange("optionalVariablesText")}
                                fullWidth
                                disabled={isView}
                                helperText="Separate values with commas."
                                placeholder="footerText, supportEmail"
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
                                    checked={values.isDefault}
                                    onChange={handleChange("isDefault")}
                                    disabled={isView}
                                />
                            }
                            label="Default"
                        />

                        <FormControlLabel
                            control={
                                <Switch
                                    checked={values.isActive}
                                    onChange={handleChange("isActive")}
                                    disabled={isView}
                                />
                            }
                            label="Active"
                        />
                    </Stack>
                </Box>

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
                        {isView ? "Close" : "Cancel"}
                    </Button>

                    {!isView && (
                        <Button
                            type="submit"
                            variant="contained"
                            color="warning"
                            disabled={submitDisabled}
                            sx={{
                                fontWeight: 900,
                                textTransform: "none",
                                minWidth: 170,
                                borderRadius: 3,
                                color: "#fff",
                            }}
                        >
                            {isEdit ? "Save changes" : "Create template"}
                        </Button>
                    )}
                </Stack>
            </Stack>
        </Box>
    );
}