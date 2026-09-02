import * as React from "react";
import {
    Box,
    Button,
    Divider,
    Grid,
    Stack,
    TextField,
    Typography,
} from "@mui/material";

import type {
    CompanyProvider,
    CreateCompanyProviderDto,
} from "../types/companyProvider";

type Props = {
    initial?: CompanyProvider | null;
    loading?: boolean;
    onSubmit: (values: CreateCompanyProviderDto) => void | Promise<void>;
};

const DEFAULT_VALUES: CreateCompanyProviderDto = {
    companyName: "",
    legalName: "",
    email: "",
    phone: "",
    website: "",
    logoUrl: "",
    description: "",
};

export default function CompanyProviderForm({
                                                initial,
                                                loading,
                                                onSubmit,
                                            }: Props) {
    const [values, setValues] =
        React.useState<CreateCompanyProviderDto>(DEFAULT_VALUES);

    React.useEffect(() => {
        setValues({
            companyName: initial?.companyName ?? "",
            legalName: initial?.legalName ?? "",
            email: initial?.email ?? "",
            phone: initial?.phone ?? "",
            website: initial?.website ?? "",
            logoUrl: initial?.logoUrl ?? "",
            description: initial?.description ?? "",
        });
    }, [initial?.id]);

    const handleChange =
        (field: keyof CreateCompanyProviderDto) =>
            (e: React.ChangeEvent<HTMLInputElement>) => {
                setValues((prev) => ({
                    ...prev,
                    [field]: e.target.value,
                }));
            };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (loading) return;

        const companyName = values.companyName.trim();

        if (!companyName) return;

        await onSubmit({
            companyName,
            legalName: values.legalName?.trim() || undefined,
            email: values.email?.trim().toLowerCase() || undefined,
            phone: values.phone?.trim() || undefined,
            website: values.website?.trim() || undefined,
            logoUrl: values.logoUrl?.trim() || undefined,
            description: values.description?.trim() || undefined,
        });
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
                overflow: "hidden",
            }}
        >
            <Stack spacing={2.5}>
                <Box>
                    <Typography variant="h5" fontWeight={900} sx={{ mb: 0.5 }}>
                        {initial ? "Company details" : "Create company"}
                    </Typography>

                    <Typography variant="body2" color="text.secondary">
                        This information will be used as your provider profile in the marketplace.
                    </Typography>
                </Box>

                <Divider />

                <Grid container spacing={2}>
                    <Grid size={{ xs: 12 }}>
                        <TextField
                            label="Company name"
                            value={values.companyName}
                            onChange={handleChange("companyName")}
                            fullWidth
                            required
                            disabled={loading}
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>

                    <Grid size={{ xs: 12 }}>
                        <TextField
                            label="Legal name"
                            value={values.legalName ?? ""}
                            onChange={handleChange("legalName")}
                            fullWidth
                            disabled={loading}
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                            label="Email"
                            value={values.email ?? ""}
                            onChange={handleChange("email")}
                            fullWidth
                            disabled={loading}
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                            label="Phone"
                            value={values.phone ?? ""}
                            onChange={handleChange("phone")}
                            fullWidth
                            disabled={loading}
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>

                    <Grid size={{ xs: 12 }}>
                        <TextField
                            label="Website"
                            value={values.website ?? ""}
                            onChange={handleChange("website")}
                            fullWidth
                            disabled={loading}
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>

                    <Grid size={{ xs: 12 }}>
                        <TextField
                            label="Logo URL"
                            value={values.logoUrl ?? ""}
                            onChange={handleChange("logoUrl")}
                            fullWidth
                            disabled={loading}
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
                            minRows={4}
                            disabled={loading}
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>
                </Grid>

                <Divider />

                <Stack direction="row" justifyContent="flex-end">
                    <Button
                        type="submit"
                        variant="contained"
                        disabled={!!loading || !values.companyName.trim()}
                        sx={{
                            textTransform: "none",
                            fontWeight: 800,
                            minWidth: 140,
                        }}
                    >
                        {loading
                            ? "Saving..."
                            : initial
                                ? "Save changes"
                                : "Create company"}
                    </Button>
                </Stack>
            </Stack>
        </Box>
    );
}