import * as React from "react";
import { Box, Button, Divider, FormControlLabel, Stack, Switch, TextField, Typography } from "@mui/material";

import type { CreateSymbolPayload, SymbolItem } from "@/types/symbol";

type Props = {
    initial?: SymbolItem | null;
    loading?: boolean;
    onSubmit: (values: CreateSymbolPayload) => void | Promise<void>;
    onCancel?: () => void;
};

const norm = (v: string) => v.trim().toUpperCase();
const parseAliases = (v: string) => [...new Set(v.split(/[\s,]+/).map(norm).filter(Boolean))];

export default function SymbolForm({ initial, loading, onSubmit, onCancel }: Props) {
    const isEditing = !!initial;
    const [symbol, setSymbol] = React.useState("");
    const [aliases, setAliases] = React.useState("");
    const [isActive, setIsActive] = React.useState(true);

    React.useEffect(() => {
        setSymbol(initial?.symbol ?? "");
        setAliases((initial?.aliases ?? []).join(", "));
        setIsActive(initial?.isActive ?? true);
    }, [initial]);

    const canSubmit = norm(symbol).length >= 1 && !loading;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canSubmit) return;
        await onSubmit({ symbol: norm(symbol), aliases: parseAliases(aliases), isActive });
    };

    return (
        <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={2.5}>
                <Box>
                    <Typography variant="h5" fontWeight={900} sx={{ mb: 0.5 }}>
                        {isEditing ? "Edit symbol" : "New symbol"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Symbols are stored uppercase and must be unique within your organization.
                    </Typography>
                </Box>

                <Divider />

                <TextField
                    label="Symbol" value={symbol}
                    onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                    fullWidth required InputLabelProps={{ shrink: true }}
                    placeholder="EURUSD"
                />

                <TextField
                    label="Aliases" value={aliases} onChange={(e) => setAliases(e.target.value)}
                    fullWidth InputLabelProps={{ shrink: true }}
                    placeholder="EUR/USD, FX:EURUSD"
                    helperText="Optional. Comma or space separated — how other platforms name the same instrument."
                />

                <FormControlLabel
                    control={<Switch size="small" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />}
                    label={isActive ? "Active" : "Inactive"}
                />

                <Divider />

                <Stack direction="row" justifyContent="flex-end" spacing={1.5}>
                    <Button variant="outlined" color="inherit" onClick={onCancel} disabled={loading}
                        sx={{ textTransform: "none", fontWeight: 800 }}>
                        Cancel
                    </Button>
                    <Button type="submit" variant="contained" disabled={!canSubmit}
                        sx={{ textTransform: "none", fontWeight: 800 }}>
                        {isEditing ? "Save changes" : "Add symbol"}
                    </Button>
                </Stack>
            </Stack>
        </Box>
    );
}
