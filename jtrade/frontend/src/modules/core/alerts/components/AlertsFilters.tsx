import * as React from "react";

import {
    Button,
    MenuItem,
    Paper,
    Stack,
    TextField,
} from "@mui/material";

export type AlertsFiltersValue = {
    indicatorId: string;
    symbol: string;
    timeframe: string;
    isActive: boolean | null;
};

const DEFAULTS: AlertsFiltersValue = {
    indicatorId: "",
    symbol: "",
    timeframe: "",
    isActive: null,
};

type Props = {
    value: AlertsFiltersValue;
    indicators?: {
        id: string;
        name: string;
        key?: string;
    }[];
    symbols?: string[];
    timeframes?: string[];
    onChange: (next: AlertsFiltersValue) => void;
    onClear: () => void;
};

const fieldSx = {
    width: {
        xs: "100%",
        sm: 220,
        md: 240,
    },
};

export default function AlertsFilters({
                                          value,
                                          indicators = [],
                                          symbols = [],
                                          timeframes = [],
                                          onChange,
                                          onClear,
                                      }: Props) {
    return (
        <Paper
            elevation={0}
            sx={{
                mt: 1,
                mb: 2,
                p: { xs: 1.5, sm: 2 },
                borderRadius: 3,
                border: "1px solid",
                borderColor: "divider",
            }}
        >
            <Stack
                direction={{ xs: "column", lg: "row" }}
                spacing={2}
                alignItems={{ xs: "stretch", lg: "center" }}
            >
                <TextField
                    select
                    label="Indicator"
                    value={value.indicatorId}
                    onChange={(event) =>
                        onChange({
                            ...value,
                            indicatorId: event.target.value,
                            symbol: "",
                            timeframe: "",
                        })
                    }
                    size="small"
                    sx={{
                        width: {
                            xs: "100%",
                            sm: 300,
                            md: 360,
                        },
                    }}
                    InputLabelProps={{ shrink: true }}
                >
                    <MenuItem value="">All indicators</MenuItem>

                    {indicators.map((item) => (
                        <MenuItem key={item.id} value={item.id}>
                            {item.name}
                        </MenuItem>
                    ))}
                </TextField>

                <TextField
                    select
                    label="Symbol"
                    value={value.symbol}
                    onChange={(event) =>
                        onChange({
                            ...value,
                            symbol: event.target.value,
                            timeframe: "",
                        })
                    }
                    size="small"
                    sx={fieldSx}
                    InputLabelProps={{ shrink: true }}
                >
                    <MenuItem value="">All symbols</MenuItem>

                    {symbols.map((symbol) => (
                        <MenuItem key={symbol} value={symbol}>
                            {symbol}
                        </MenuItem>
                    ))}
                </TextField>

                <TextField
                    select
                    label="Timeframe"
                    value={value.timeframe}
                    onChange={(event) =>
                        onChange({
                            ...value,
                            timeframe: event.target.value,
                        })
                    }
                    size="small"
                    sx={fieldSx}
                    InputLabelProps={{ shrink: true }}
                >
                    <MenuItem value="">All timeframes</MenuItem>

                    {timeframes.map((tf) => (
                        <MenuItem key={tf} value={tf}>
                            {tf}
                        </MenuItem>
                    ))}
                </TextField>

                <TextField
                    select
                    label="Status"
                    value={
                        value.isActive === null
                            ? "all"
                            : value.isActive
                                ? "active"
                                : "inactive"
                    }
                    onChange={(event) => {
                        const next = event.target.value;

                        onChange({
                            ...value,
                            isActive: next === "all" ? null : next === "active",
                        });
                    }}
                    size="small"
                    sx={fieldSx}
                    InputLabelProps={{ shrink: true }}
                >
                    <MenuItem value="all">All</MenuItem>
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="inactive">Inactive</MenuItem>
                </TextField>

                <Button
                    variant="outlined"
                    color="inherit"
                    onClick={onClear}
                    sx={{
                        textTransform: "none",
                        fontWeight: 700,
                        minWidth: {
                            xs: "100%",
                            lg: 120,
                        },
                    }}
                >
                    Clear
                </Button>
            </Stack>
        </Paper>
    );
}

export { DEFAULTS as ALERTS_FILTERS_DEFAULTS };