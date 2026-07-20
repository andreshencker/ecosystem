// src/trades/components/TradesSymbolSelect.tsx
import * as React from "react";
import {Box, FormControl, InputLabel, MenuItem, Select} from "@mui/material";

type Props = {
    value: string;
    options: string[];
    onChange: (value: string) => void;
    label?: string;
};

export default function TradesSymbolSelect({
                                               value,
                                               options,
                                               onChange,
                                               label = "Symbol",
                                           }: Props) {
    return (
        <Box sx={{minWidth: 180}}>
            <FormControl fullWidth size="small">
                <InputLabel>{label}</InputLabel>
                <Select
                    label={label}
                    value={value}
                    onChange={(e) => onChange(String(e.target.value))}
                >
                    <MenuItem value="__ALL__">All</MenuItem>
                    {options.map((s) => (
                        <MenuItem key={s} value={s}>
                            {s}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>
        </Box>
    );
}