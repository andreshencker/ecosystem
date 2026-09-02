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

import type { Indicator, CreateIndicatorDto } from "../types/indicators";
import type { CompanyProvider } from "@/old/modules/core/companyProviders/types/companyProvider";

export type IndicatorFormValues = CreateIndicatorDto;

type Props = {
    initial?: Indicator | null;
    loading?: boolean;
    companyProviders?: CompanyProvider[];
    fixedCompanyProviderId?: string;
    onSubmit: (values: IndicatorFormValues) => void | Promise<void>;
    onCancel?: () => void;
};

const DEFAULT_VALUES: IndicatorFormValues = {
    companyProviderId: "",
    name: "",
    key: "",
    description: "",
    isActive: true,
};

export default function IndicatorsForm({
                                           initial,
                                           loading,
                                           companyProviders = [],
                                           fixedCompanyProviderId,
                                           onSubmit,
                                           onCancel,
                                       }: Props) {
    const isEditing = !!initial;

    const [values, setValues] = React.useState<IndicatorFormValues>({
        ...DEFAULT_VALUES,
        companyProviderId: fixedCompanyProviderId ?? "",
    });

    React.useEffect(() => {
        if (!initial) {
            setValues({
                ...DEFAULT_VALUES,
                companyProviderId: fixedCompanyProviderId ?? "",
            });
            return;
        }

        setValues({
            companyProviderId:
                initial.companyProviderId ?? fixedCompanyProviderId ?? "",
            name: initial.name ?? "",
            key: initial.key ?? "",
            description: initial.description ?? "",
            isActive: initial.isActive ?? true,
        });
    }, [initial, fixedCompanyProviderId]);

    const setField =
        (k: keyof IndicatorFormValues) =>
            (e: React.ChangeEvent<HTMLInputElement>) => {
                const v =
                    k === "isActive"
                        ? (e.target as HTMLInputElement).checked
                        : e.target.value;

                setValues((prev) => ({
                    ...prev,
                    [k]: v as any,
                }));
            };

    const canSubmit =
        !!values.companyProviderId &&
        !!values.name.trim() &&
        !!values.key.trim() &&
        !loading;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!canSubmit) return;

        await onSubmit({
            companyProviderId: values.companyProviderId,
            name: values.name.trim(),
            key: values.key.trim().toLowerCase(),
            description: values.description?.trim() ?? "",
            isActive: !!values.isActive,
        });

        if (!isEditing) {
            setValues({
                ...DEFAULT_VALUES,
                companyProviderId: fixedCompanyProviderId ?? "",
            });
        }
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
                p: { xs: 1.5, sm: 2, md: 2.5 },
                bgcolor: "background.paper",
            }}
        >
            <Stack spacing={2.5}>
                <Box>
                    <Typography variant="h5" fontWeight={900}>
                        {isEditing ? "Edit indicator" : "Create indicator"}
                    </Typography>

                    <Typography variant="body2" color="text.secondary">
                        Manage the provider indicator catalog.
                    </Typography>
                </Box>

                <Divider />

                <Grid container spacing={2}>
                    {!fixedCompanyProviderId && (
                        <Grid size={{ xs: 12 }}>
                            <TextField
                                select
                                label="Company provider"
                                value={values.companyProviderId}
                                onChange={setField("companyProviderId")}
                                fullWidth
                                required
                                disabled={loading || isEditing}
                                InputLabelProps={{ shrink: true }}
                            >
                                {companyProviders.map((company) => (
                                    <MenuItem key={company.id} value={company.id}>
                                        {company.companyName}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                    )}

                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                            label="Name"
                            value={values.name}
                            onChange={setField("name")}
                            fullWidth
                            required
                            disabled={loading}
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                            label="Key"
                            value={values.key}
                            onChange={setField("key")}
                            fullWidth
                            required
                            disabled={loading}
                            placeholder="blade"
                            InputLabelProps={{ shrink: true }}
                            helperText="Lowercase key. Example: blade, fvg-engine"
                        />
                    </Grid>

                    <Grid size={{ xs: 12 }}>
                        <TextField
                            label="Description"
                            value={values.description ?? ""}
                            onChange={setField("description")}
                            fullWidth
                            multiline
                            minRows={3}
                            disabled={loading}
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>

                    <Grid size={{ xs: 12 }}>
                        <FormControlLabel
                            control={
                                <Switch
                                    size="small"
                                    checked={!!values.isActive}
                                    onChange={setField("isActive")}
                                    disabled={loading}
                                />
                            }
                            label={values.isActive ? "Active" : "Inactive"}
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
                        {isEditing ? "Save changes" : "Create"}
                    </Button>
                </Stack>
            </Stack>
        </Box>
    );
}