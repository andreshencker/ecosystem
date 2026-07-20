// FILE: src/modules/alerts/components/AlertForm.tsx

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
    AlertGroupRow,
    CreateAlertDto,
    IndicatorProjectOption,
    SymbolOption,
} from "../types/alerts";

export type AlertFormValues =
    CreateAlertDto;

type Props = {
    initial?: AlertGroupRow | null;

    loading?: boolean;

    indicatorProjectOptions?: IndicatorProjectOption[];

    symbolOptions?: SymbolOption[];

    onSubmit: (
        values: AlertFormValues,
    ) => void | Promise<void>;

    onCancel?: () => void;
};

const DEFAULT_VALUES: AlertFormValues =
    {
        indicatorProjectId: "",
        symbolId: "",
        timeframe: "M15",
        isActive: true,
    };

const TIMEFRAME_OPTIONS = [
    "M1",
    "M5",
    "M15",
    "M30",
    "H1",
    "H4",
    "D1",
    "W1",
];

export default function AlertForm({
                                      initial,
                                      loading = false,

                                      indicatorProjectOptions = [],
                                      symbolOptions = [],

                                      onSubmit,
                                      onCancel,
                                  }: Props) {
    const isEditing = !!initial;

    const [values, setValues] =
        React.useState<AlertFormValues>({
            indicatorProjectId:
                initial?.indicatorProjectId ??
                "",

            symbolId:
                initial?.symbolId ?? "",

            timeframe:
                initial?.timeFrame ??
                "M15",

            isActive:
                initial?.isActive ??
                true,
        });

    React.useEffect(() => {
        setValues({
            indicatorProjectId:
                initial?.indicatorProjectId ??
                "",

            symbolId:
                initial?.symbolId ??
                "",

            timeframe:
                initial?.timeFrame ??
                "M15",

            isActive:
                initial?.isActive ??
                true,
        });
    }, [initial]);

    const handleChange =
        (field: keyof AlertFormValues) =>
            (
                event: React.ChangeEvent<HTMLInputElement>,
            ) => {
                const value =
                    field === "isActive"
                        ? (
                            event.target as HTMLInputElement
                        ).checked
                        : event.target.value;

                setValues((prev) => ({
                    ...prev,
                    [field]:
                        value as any,
                }));
            };

    const canSubmit =
        !!values.indicatorProjectId &&
        !!values.symbolId &&
        !!values.timeframe.trim() &&
        !loading;

    const handleSubmit = async (
        event: React.FormEvent,
    ) => {
        event.preventDefault();

        if (!canSubmit) {
            return;
        }

        await onSubmit({
            indicatorProjectId:
            values.indicatorProjectId,

            symbolId:
            values.symbolId,

            timeframe:
                values.timeframe
                    .trim()
                    .toUpperCase(),

            isActive:
            values.isActive,
        });

        if (!isEditing) {
            setValues(
                DEFAULT_VALUES,
            );
        }
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

                border:
                    "1px solid",

                borderColor:
                    "divider",

                bgcolor:
                    "background.paper",

                p: {
                    xs: 1.5,
                    sm: 2,
                    md: 2.5,
                },

                overflow:
                    "hidden",
            }}
        >
            <Stack spacing={2.5}>
                {/* HEADER */}
                <Box>
                    <Typography
                        variant="h5"
                        fontWeight={900}
                    >
                        {isEditing
                            ? "Edit alert pair"
                            : "Create alert pair"}
                    </Typography>

                    <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                            mt: 0.5,
                        }}
                    >
                        {isEditing
                            ? "Update the alert group configuration."
                            : "Create a BUY + SELL alert pair for one symbol and timeframe."}
                    </Typography>
                </Box>

                <Divider />

                {/* FORM */}
                <Grid
                    container
                    spacing={2}
                >
                    {/* INDICATOR PROJECT */}
                    <Grid
                        size={{ xs: 12 }}
                    >
                        <TextField
                            select
                            fullWidth
                            required
                            label="Indicator project"
                            value={
                                values.indicatorProjectId
                            }
                            onChange={handleChange(
                                "indicatorProjectId",
                            )}
                            disabled={
                                isEditing ||
                                loading
                            }
                            InputLabelProps={{
                                shrink: true,
                            }}
                            helperText={
                                isEditing
                                    ? "Indicator project cannot be changed while editing."
                                    : "Select the project/platform/indicator relation."
                            }
                        >
                            {indicatorProjectOptions.length ===
                            0 ? (
                                <MenuItem
                                    value=""
                                    disabled
                                >
                                    No indicator projects
                                    available
                                </MenuItem>
                            ) : (
                                indicatorProjectOptions.map(
                                    (
                                        option,
                                    ) => (
                                        <MenuItem
                                            key={
                                                option.id
                                            }
                                            value={
                                                option.id
                                            }
                                        >
                                            {
                                                option.name
                                            }

                                            {option.isActive ===
                                            false
                                                ? " — inactive"
                                                : ""}
                                        </MenuItem>
                                    ),
                                )
                            )}
                        </TextField>
                    </Grid>

                    {/* SYMBOL */}
                    <Grid
                        size={{
                            xs: 12,
                            sm: 6,
                        }}
                    >
                        <TextField
                            select
                            fullWidth
                            required
                            label="Symbol"
                            value={
                                values.symbolId
                            }
                            onChange={handleChange(
                                "symbolId",
                            )}
                            disabled={loading}
                            InputLabelProps={{
                                shrink: true,
                            }}
                            helperText="Select a symbol from your provider catalog."
                        >
                            {symbolOptions.length ===
                            0 ? (
                                <MenuItem
                                    value=""
                                    disabled
                                >
                                    No symbols
                                    available
                                </MenuItem>
                            ) : (
                                symbolOptions.map(
                                    (
                                        option,
                                    ) => (
                                        <MenuItem
                                            key={
                                                option.id
                                            }
                                            value={
                                                option.id
                                            }
                                        >
                                            {
                                                option.symbol
                                            }

                                            {option.isActive ===
                                            false
                                                ? " — inactive"
                                                : ""}
                                        </MenuItem>
                                    ),
                                )
                            )}
                        </TextField>
                    </Grid>

                    {/* TIMEFRAME */}
                    <Grid
                        size={{
                            xs: 12,
                            sm: 6,
                        }}
                    >
                        <TextField
                            select
                            fullWidth
                            required
                            label="Timeframe"
                            value={
                                values.timeframe
                            }
                            onChange={handleChange(
                                "timeframe",
                            )}
                            disabled={loading}
                            InputLabelProps={{
                                shrink: true,
                            }}
                        >
                            {TIMEFRAME_OPTIONS.map(
                                (
                                    tf,
                                ) => (
                                    <MenuItem
                                        key={
                                            tf
                                        }
                                        value={
                                            tf
                                        }
                                    >
                                        {
                                            tf
                                        }
                                    </MenuItem>
                                ),
                            )}
                        </TextField>
                    </Grid>

                    {/* ACTIVE */}
                    <Grid
                        size={{ xs: 12 }}
                    >
                        <FormControlLabel
                            sx={{ m: 0 }}
                            label="Active"
                            control={
                                <Switch
                                    size="small"
                                    checked={
                                        !!values.isActive
                                    }
                                    onChange={handleChange(
                                        "isActive",
                                    )}
                                    disabled={
                                        loading
                                    }
                                />
                            }
                        />
                    </Grid>
                </Grid>

                <Divider />

                {/* ACTIONS */}
                <Stack
                    direction="row"
                    spacing={1.5}
                    justifyContent="flex-end"
                >
                    <Button
                        variant="outlined"
                        color="inherit"
                        onClick={
                            handleCancel
                        }
                        disabled={loading}
                        sx={{
                            textTransform:
                                "none",

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
                        disabled={
                            !canSubmit
                        }
                        sx={{
                            textTransform:
                                "none",

                            fontWeight: 900,

                            minWidth: 140,

                            borderRadius: 999,
                        }}
                    >
                        {isEditing
                            ? "Save changes"
                            : "Create pair"}
                    </Button>
                </Stack>
            </Stack>
        </Box>
    );
}