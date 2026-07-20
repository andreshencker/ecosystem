import * as React from "react";

import {
    Box,
    Button,
    Divider,
    FormControlLabel,
    Stack,
    Switch,
    TextField,
    Typography,
} from "@mui/material";

import type { CreateSymbolDto, SymbolItem } from "../types/symbols";

export type SymbolFormValues = CreateSymbolDto;

type Props = {
    initial?: SymbolItem | null;
    loading?: boolean;
    companyProviderId: string;
    onSubmit: (values: SymbolFormValues) => void | Promise<void>;
    onCancel?: () => void;
};

const DEFAULT_VALUES: SymbolFormValues = {
    companyProviderId: "",
    symbol: "",
    isActive: true,
};

export default function SymbolForm({
                                       initial,
                                       loading,
                                       companyProviderId,
                                       onSubmit,
                                       onCancel,
                                   }: Props) {
    const isEditing = !!initial;

    const [values, setValues] =
        React.useState<SymbolFormValues>({
            ...DEFAULT_VALUES,
            companyProviderId,
        });

    React.useEffect(() => {
        if (!initial) {
            setValues({
                ...DEFAULT_VALUES,
                companyProviderId,
            });
            return;
        }

        setValues({
            companyProviderId:
                initial.companyProviderId ?? companyProviderId,
            symbol: initial.symbol ?? "",
            isActive: initial.isActive ?? true,
        });
    }, [initial, companyProviderId]);

    const canSubmit =
        !!values.companyProviderId &&
        !!values.symbol.trim() &&
        !loading;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!canSubmit) return;

        await onSubmit({
            companyProviderId: values.companyProviderId,
            symbol: values.symbol.trim().toUpperCase(),
            isActive: values.isActive,
        });

        if (!isEditing) {
            setValues({
                ...DEFAULT_VALUES,
                companyProviderId,
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
                        {isEditing ? "Edit symbol" : "Create symbol"}
                    </Typography>

                    <Typography variant="body2" color="text.secondary">
                        Manage the provider symbol catalog.
                    </Typography>
                </Box>

                <Divider />

                <TextField
                    label="Symbol"
                    value={values.symbol}
                    onChange={(e) =>
                        setValues((prev) => ({
                            ...prev,
                            symbol: e.target.value.toUpperCase(),
                        }))
                    }
                    fullWidth
                    required
                    disabled={loading}
                    placeholder="EURUSD"
                    InputLabelProps={{ shrink: true }}
                    helperText="Example: EURUSD, XAUUSD, BTCUSD"
                />

                <FormControlLabel
                    sx={{ m: 0 }}
                    control={
                        <Switch
                            size="small"
                            checked={!!values.isActive}
                            disabled={loading}
                            onChange={(e) =>
                                setValues((prev) => ({
                                    ...prev,
                                    isActive: e.target.checked,
                                }))
                            }
                        />
                    }
                    label={values.isActive ? "Active" : "Inactive"}
                />

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
                        sx={{ textTransform: "none", fontWeight: 900 }}
                    >
                        {isEditing ? "Save changes" : "Create"}
                    </Button>
                </Stack>
            </Stack>
        </Box>
    );
}