import * as React from "react";
import { Box, Button, Divider, Stack, TextField, Typography } from "@mui/material";

type Props = {
    loading?: boolean;
    onSubmit: (symbols: string[]) => void | Promise<void>;
    onCancel?: () => void;
};

const parse = (raw: string) =>
    [...new Set(raw.split(/[\s,]+/).map((s) => s.trim().toUpperCase()).filter(Boolean))];

export default function BulkSymbolForm({ loading, onSubmit, onCancel }: Props) {
    const [text, setText] = React.useState("");
    const symbols = parse(text);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!symbols.length || loading) return;
        await onSubmit(symbols);
    };

    return (
        <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={2.5}>
                <Box>
                    <Typography variant="h5" fontWeight={900} sx={{ mb: 0.5 }}>Bulk add symbols</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Paste symbols separated by commas, spaces or new lines. Existing ones are skipped.
                    </Typography>
                </Box>

                <Divider />

                <TextField
                    value={text} onChange={(e) => setText(e.target.value)}
                    fullWidth multiline minRows={6} InputLabelProps={{ shrink: true }}
                    label="Symbols" placeholder={"EURUSD\nGBPUSD\nBTCUSD, ETHUSD"}
                    helperText={`${symbols.length} unique symbol${symbols.length === 1 ? "" : "s"} detected`}
                />

                <Divider />

                <Stack direction="row" justifyContent="flex-end" spacing={1.5}>
                    <Button variant="outlined" color="inherit" onClick={onCancel} disabled={loading}
                        sx={{ textTransform: "none", fontWeight: 800 }}>
                        Cancel
                    </Button>
                    <Button type="submit" variant="contained" disabled={!symbols.length || loading}
                        sx={{ textTransform: "none", fontWeight: 800 }}>
                        Add {symbols.length || ""}
                    </Button>
                </Stack>
            </Stack>
        </Box>
    );
}
