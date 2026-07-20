import * as React from "react";
import {
    Box,
    Button,
    Grid,
    IconButton,
    InputAdornment,
    MenuItem,
    Paper,
    TextField,
    Typography,
} from "@mui/material";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import type { SignalFilterOption } from "@/modules/core/signals/types/signals";

export type SignalRangeValue = "" | "7d" | "15d" | "30d" | "custom";

type Props = {
    symbol: string;
    timeFrame: string;
    indicatorId: string;
    range: SignalRangeValue;
    lastHours: string;
    dateFrom: string;
    dateTo: string;
    symbolOptions?: SignalFilterOption[];
    timeFrameOptions?: SignalFilterOption[];
    indicatorOptions?: SignalFilterOption[];
    onChangeSymbol: (value: string) => void;
    onChangeTimeFrame: (value: string) => void;
    onChangeIndicatorId: (value: string) => void;
    onChangeRange: (value: SignalRangeValue) => void;
    onChangeLastHours: (value: string) => void;
    onChangeDateFrom: (value: string) => void;
    onChangeDateTo: (value: string) => void;
    onReset?: () => void;
    title?: string;
    subtitle?: string;
};

const RANGE_OPTIONS: { label: string; value: SignalRangeValue }[] = [
    { label: "All ranges", value: "" },
    { label: "Last 7 days", value: "7d" },
    { label: "Last 15 days", value: "15d" },
    { label: "Last 30 days", value: "30d" },
    { label: "Custom", value: "custom" },
];

const baseFieldSx = {
    width: {
        xs: "100%",
        sm: 220,
        md: 220,
        lg: 220,
        xl: 220,
    },
    minWidth: {
        xs: 0,
        sm: 220,
        md: 220,
        lg: 220,
        xl: 220,
    },
};

const rangeFieldSx = {
    width: {
        xs: "100%",
        sm: 220,
        md: 220,
        lg: 200,
        xl: 180,
    },
    minWidth: {
        xs: 0,
        sm: 220,
        md: 220,
        lg: 200,
        xl: 180,
    },
};

const shortFieldSx = {
    width: {
        xs: "100%",
        sm: 220,
        md: 220,
        lg: 190,
        xl: 170,
    },
    minWidth: {
        xs: 0,
        sm: 220,
        md: 220,
        lg: 190,
        xl: 170,
    },
};

export default function SignalsFilters({
                                           symbol,
                                           timeFrame,
                                           indicatorId,
                                           range,
                                           lastHours,
                                           dateFrom,
                                           dateTo,
                                           symbolOptions = [],
                                           timeFrameOptions = [],
                                           indicatorOptions = [],
                                           onChangeSymbol,
                                           onChangeTimeFrame,
                                           onChangeIndicatorId,
                                           onChangeRange,
                                           onChangeLastHours,
                                           onChangeDateFrom,
                                           onChangeDateTo,
                                           onReset,
                                           title = "Filters",
                                           subtitle = "Filter signals by symbol, timeframe, indicator, quick range or custom hours.",
                                       }: Props) {
    const showCustomDates = range === "custom" && !lastHours.trim();

    return (
        <Paper
            elevation={0}
            sx={{
                borderRadius: 4,
                p: { xs: 1.5, sm: 2, md: 2.5 },
                border: "1px solid",
                borderColor: "divider",
                width: "100%",
                overflow: "hidden",
            }}
        >
            <Typography variant="h6" fontWeight={900} sx={{ mb: 0.5 }}>
                {title}
            </Typography>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {subtitle}
            </Typography>

            <Grid container spacing={2} alignItems="flex-start">
                <Grid item xs={12} sm={6} lg="auto">
                    <TextField
                        select
                        fullWidth
                        size="small"
                        label="Symbol"
                        value={symbol}
                        onChange={(e) => onChangeSymbol(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        sx={baseFieldSx}
                    >
                        <MenuItem value="">All symbols</MenuItem>
                        {symbolOptions.map((opt) => (
                            <MenuItem key={opt.value} value={opt.value}>
                                {opt.label}
                            </MenuItem>
                        ))}
                    </TextField>
                </Grid>

                <Grid item xs={12} sm={6} lg="auto">
                    <TextField
                        select
                        fullWidth
                        size="small"
                        label="Timeframe"
                        value={timeFrame}
                        onChange={(e) => onChangeTimeFrame(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        sx={baseFieldSx}
                    >
                        <MenuItem value="">All timeframes</MenuItem>
                        {timeFrameOptions.map((opt) => (
                            <MenuItem key={opt.value} value={opt.value}>
                                {opt.label}
                            </MenuItem>
                        ))}
                    </TextField>
                </Grid>

                <Grid item xs={12} sm={6} lg="auto">
                    <TextField
                        select
                        fullWidth
                        size="small"
                        label="Indicator"
                        value={indicatorId}
                        onChange={(e) => onChangeIndicatorId(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        sx={baseFieldSx}
                    >
                        <MenuItem value="">All indicators</MenuItem>
                        {indicatorOptions.map((opt) => (
                            <MenuItem key={opt.value} value={opt.value}>
                                {opt.label}
                            </MenuItem>
                        ))}
                    </TextField>
                </Grid>

                <Grid item xs={12} sm={6} lg="auto">
                    <TextField
                        select
                        fullWidth
                        size="small"
                        label="Range"
                        value={range}
                        onChange={(e) => onChangeRange(e.target.value as SignalRangeValue)}
                        InputLabelProps={{ shrink: true }}
                        helperText="Quick predefined ranges"
                        sx={rangeFieldSx}
                    >
                        {RANGE_OPTIONS.map((opt) => (
                            <MenuItem key={opt.value} value={opt.value}>
                                {opt.label}
                            </MenuItem>
                        ))}
                    </TextField>
                </Grid>

                <Grid item xs={12} sm={6} lg="auto">
                    <TextField
                        fullWidth
                        size="small"
                        type="number"
                        label="Last hours"
                        value={lastHours}
                        onChange={(e) => onChangeLastHours(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        inputProps={{ min: 1, step: 1 }}
                        helperText="Overrides date range"
                        sx={shortFieldSx}
                        InputProps={{
                            endAdornment: lastHours ? (
                                <InputAdornment position="end">
                                    <IconButton
                                        size="small"
                                        edge="end"
                                        onClick={() => onChangeLastHours("")}
                                        aria-label="clear last hours"
                                    >
                                        <ClearRoundedIcon fontSize="small" />
                                    </IconButton>
                                </InputAdornment>
                            ) : null,
                        }}
                    />
                </Grid>

                {showCustomDates && (
                    <>
                        <Grid item xs={12} sm={6} lg="auto">
                            <TextField
                                type="date"
                                fullWidth
                                size="small"
                                label="From"
                                value={dateFrom}
                                onChange={(e) => onChangeDateFrom(e.target.value)}
                                InputLabelProps={{ shrink: true }}
                                sx={shortFieldSx}
                            />
                        </Grid>

                        <Grid item xs={12} sm={6} lg="auto">
                            <TextField
                                type="date"
                                fullWidth
                                size="small"
                                label="To"
                                value={dateTo}
                                onChange={(e) => onChangeDateTo(e.target.value)}
                                InputLabelProps={{ shrink: true }}
                                sx={shortFieldSx}
                            />
                        </Grid>
                    </>
                )}

                <Grid item xs={12} sm={6} lg="auto">
                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            height: "100%",
                            pt: { xs: 0, lg: "2px" },
                        }}
                    >
                        <Button
                            variant="outlined"
                            onClick={onReset}
                            sx={{
                                textTransform: "none",
                                fontWeight: 800,
                                width: {
                                    xs: "100%",
                                    sm: 220,
                                    md: 220,
                                    lg: 180,
                                },
                                minWidth: {
                                    xs: 0,
                                    sm: 220,
                                    md: 220,
                                    lg: 180,
                                },
                                height: 40,
                                whiteSpace: "nowrap",
                            }}
                        >
                            Reset filters
                        </Button>
                    </Box>
                </Grid>
            </Grid>
        </Paper>
    );
}