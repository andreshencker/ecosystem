import * as React from "react";

import {
    Box,
    Button,
    Divider,
    Grid,
    MenuItem,
    Stack,
    TextField,
    Typography,
} from "@mui/material";

import type {
    CreateUserAccountInfoDto,
    IndicatorProjectOption,
    UpdateUserAccountInfoDto,
    UserAccountInfo,
} from "../types/userAccountInfo";

type Mode = "create" | "edit";

type Props = {
    mode: Mode;
    initial?: UserAccountInfo | null;
    userProjectPlatformId: string;
    indicatorProjectOptions?: IndicatorProjectOption[];
    showIndicatorProjectSelect?: boolean;
    loading?: boolean;
    onCreate?: (dto: CreateUserAccountInfoDto) => void | Promise<void>;
    onUpdate?: (id: string, dto: UpdateUserAccountInfoDto) => void | Promise<void>;
    onCancel?: () => void;
};

const DEFAULT_VALUES = {
    indicatorProjectId: "",
    accountRef: "",
    accountLabel: "",
    useDrawdownLimit: false,
    maxDrawdownPercent: "0",
    useProfitLimit: false,
    maxProfitPercent: "0",
    isActive: true,
};

function parseNumber(raw: string) {
    const value = String(raw ?? "").trim().replace(",", ".");
    if (!value) return NaN;

    const number = Number(value);
    return Number.isFinite(number) ? number : NaN;
}

function getIndicatorLabel(option: IndicatorProjectOption) {
    return (
        option.meta?.indicatorName ??
        option.meta?.indicatorKey ??
        option.label ??
        "Indicator"
    );
}

export default function UserAccountInfoForm({
                                                mode,
                                                initial,
                                                userProjectPlatformId,
                                                indicatorProjectOptions = [],
                                                showIndicatorProjectSelect = false,
                                                loading = false,
                                                onCreate,
                                                onUpdate,
                                                onCancel,
                                            }: Props) {
    const isEdit = mode === "edit";

    const [values, setValues] = React.useState(DEFAULT_VALUES);

    React.useEffect(() => {
        setValues({
            indicatorProjectId: initial?.indicatorProjectId ?? "",
            accountRef: initial?.accountRef ?? "",
            accountLabel: initial?.accountLabel ?? "",
            useDrawdownLimit: !!initial?.useDrawdownLimit,
            maxDrawdownPercent: String(initial?.maxDrawdownPercent ?? 0),
            useProfitLimit: !!initial?.useProfitLimit,
            maxProfitPercent: String(initial?.maxProfitPercent ?? 0),
            isActive: initial?.isActive ?? true,
        });
    }, [initial]);

    React.useEffect(() => {
        if (isEdit) return;
        if (!showIndicatorProjectSelect) return;
        if (values.indicatorProjectId) return;
        if (!indicatorProjectOptions.length) return;

        setValues((prev) => ({
            ...prev,
            indicatorProjectId: indicatorProjectOptions[0].id,
        }));
    }, [
        isEdit,
        showIndicatorProjectSelect,
        values.indicatorProjectId,
        indicatorProjectOptions,
    ]);

    React.useEffect(() => {
        if (showIndicatorProjectSelect) return;

        setValues((prev) => ({
            ...prev,
            indicatorProjectId: "",
        }));
    }, [showIndicatorProjectSelect]);

    const resolvedIndicatorProjectId = showIndicatorProjectSelect
        ? values.indicatorProjectId
        : undefined;

    const nMaxDrawdownPercent = parseNumber(values.maxDrawdownPercent);
    const nMaxProfitPercent = parseNumber(values.maxProfitPercent);

    const canSubmit =
        !!userProjectPlatformId &&
        (!showIndicatorProjectSelect || !!resolvedIndicatorProjectId) &&
        !!values.accountRef.trim() &&
        !!values.accountLabel.trim() &&
        (!values.useDrawdownLimit || Number.isFinite(nMaxDrawdownPercent)) &&
        (!values.useProfitLimit || Number.isFinite(nMaxProfitPercent)) &&
        !loading;

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();

        if (!canSubmit) return;

        const limitPayload = {
            useDrawdownLimit: values.useDrawdownLimit,
            maxDrawdownPercent: values.useDrawdownLimit ? nMaxDrawdownPercent : 0,
            useProfitLimit: values.useProfitLimit,
            maxProfitPercent: values.useProfitLimit ? nMaxProfitPercent : 0,
        };

        if (!isEdit) {
            const dto: CreateUserAccountInfoDto = {
                userProjectPlatformId,
                accountRef: values.accountRef.trim(),
                accountLabel: values.accountLabel.trim(),
                canTrade: true,
                ...limitPayload,
            };

            if (showIndicatorProjectSelect && resolvedIndicatorProjectId) {
                dto.indicatorProjectId = resolvedIndicatorProjectId;
            }

            await onCreate?.(dto);
            setValues(DEFAULT_VALUES);
            return;
        }

        if (!initial?.id) return;

        await onUpdate?.(initial.id, {
            accountRef: values.accountRef.trim(),
            accountLabel: values.accountLabel.trim(),
            canTrade: true,
            isActive: values.isActive,
            ...limitPayload,
        });
    };

    const handleCancel = () => {
        setValues(DEFAULT_VALUES);
        onCancel?.();
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
                bgcolor: "background.paper",
                p: { xs: 1.5, sm: 2, md: 2.5 },

                maxHeight: "calc(100dvh - 120px)",
                overflowY: "auto",
                overflowX: "hidden",
            }}
        >
            <Stack spacing={2.5}>
                <Box>
                    <Typography variant="h5" fontWeight={900}>
                        {isEdit ? "Edit account info" : "Add account info"}
                    </Typography>

                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {isEdit
                            ? "Update this account configuration."
                            : "Create an account configuration for the selected project platform."}
                    </Typography>
                </Box>

                <Divider />

                <Grid container spacing={2}>
                    {showIndicatorProjectSelect && (
                        <Grid size={{ xs: 12 }}>
                            <TextField
                                select
                                fullWidth
                                required
                                label="Indicator"
                                value={values.indicatorProjectId}
                                onChange={(e) =>
                                    setValues((prev) => ({
                                        ...prev,
                                        indicatorProjectId: e.target.value,
                                    }))
                                }
                                disabled={isEdit || loading}
                                InputLabelProps={{ shrink: true }}
                                helperText="Select the indicator linked to this account."
                            >
                                {indicatorProjectOptions.length === 0 ? (
                                    <MenuItem value="" disabled>
                                        No indicator projects available
                                    </MenuItem>
                                ) : (
                                    indicatorProjectOptions.map((option) => (
                                        <MenuItem key={option.id} value={option.id}>
                                            {getIndicatorLabel(option)}
                                        </MenuItem>
                                    ))
                                )}
                            </TextField>
                        </Grid>
                    )}

                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                            fullWidth
                            required
                            label="Account Ref"
                            value={values.accountRef}
                            onChange={(e) =>
                                setValues((prev) => ({
                                    ...prev,
                                    accountRef: e.target.value,
                                }))
                            }
                            disabled={loading}
                            InputLabelProps={{ shrink: true }}
                            helperText="Trading account reference."
                            placeholder="709854"
                        />
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                            fullWidth
                            required
                            label="Account Label"
                            value={values.accountLabel}
                            onChange={(e) =>
                                setValues((prev) => ({
                                    ...prev,
                                    accountLabel: e.target.value,
                                }))
                            }
                            disabled={loading}
                            InputLabelProps={{ shrink: true }}
                            helperText="Example: My MT5 account."
                            placeholder="Main MT5 account"
                        />
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                            select
                            fullWidth
                            label="Use Drawdown Limit"
                            value={values.useDrawdownLimit ? "yes" : "no"}
                            onChange={(e) =>
                                setValues((prev) => ({
                                    ...prev,
                                    useDrawdownLimit: e.target.value === "yes",
                                }))
                            }
                            disabled={loading}
                            InputLabelProps={{ shrink: true }}
                        >
                            <MenuItem value="yes">Yes</MenuItem>
                            <MenuItem value="no">No</MenuItem>
                        </TextField>
                    </Grid>

                    {values.useDrawdownLimit && (
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                                fullWidth
                                required
                                label="Max Drawdown %"
                                value={values.maxDrawdownPercent}
                                onChange={(e) =>
                                    setValues((prev) => ({
                                        ...prev,
                                        maxDrawdownPercent: e.target.value,
                                    }))
                                }
                                disabled={loading}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                    )}

                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                            select
                            fullWidth
                            label="Use Profit Limit"
                            value={values.useProfitLimit ? "yes" : "no"}
                            onChange={(e) =>
                                setValues((prev) => ({
                                    ...prev,
                                    useProfitLimit: e.target.value === "yes",
                                }))
                            }
                            disabled={loading}
                            InputLabelProps={{ shrink: true }}
                        >
                            <MenuItem value="yes">Yes</MenuItem>
                            <MenuItem value="no">No</MenuItem>
                        </TextField>
                    </Grid>

                    {values.useProfitLimit && (
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                                fullWidth
                                required
                                label="Max Profit %"
                                value={values.maxProfitPercent}
                                onChange={(e) =>
                                    setValues((prev) => ({
                                        ...prev,
                                        maxProfitPercent: e.target.value,
                                    }))
                                }
                                disabled={loading}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                    )}

                    {isEdit && (
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                                select
                                fullWidth
                                label="Status"
                                value={values.isActive ? "active" : "inactive"}
                                onChange={(e) =>
                                    setValues((prev) => ({
                                        ...prev,
                                        isActive: e.target.value === "active",
                                    }))
                                }
                                disabled={loading}
                                InputLabelProps={{ shrink: true }}
                            >
                                <MenuItem value="active">Active</MenuItem>
                                <MenuItem value="inactive">Inactive</MenuItem>
                            </TextField>
                        </Grid>
                    )}
                </Grid>

                <Divider />

                <Stack
                    direction="row"
                    spacing={1.5}
                    justifyContent="flex-end"
                    flexWrap="wrap"
                    useFlexGap
                >
                    <Button
                        variant="outlined"
                        color="inherit"
                        onClick={handleCancel}
                        disabled={loading}
                        sx={{
                            textTransform: "none",
                            fontWeight: 800,
                            minWidth: 120,
                            borderRadius: 999,
                        }}
                    >
                        Cancel
                    </Button>

                    <Button
                        type="submit"
                        variant="contained"
                        disabled={!canSubmit}
                        sx={{
                            textTransform: "none",
                            fontWeight: 900,
                            minWidth: 140,
                            borderRadius: 999,
                        }}
                    >
                        {isEdit ? "Save changes" : "Add account"}
                    </Button>
                </Stack>
            </Stack>
        </Box>
    );
}