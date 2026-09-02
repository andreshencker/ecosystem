import * as React from "react";
import { Box, CircularProgress, Stack, Typography } from "@mui/material";

import SignalsFilters, {
    type SignalRangeValue,
} from "@/old/modules/core/signals/components/SignalsFilters";
import AdminSignalsTable from "@/old/modules/core/signals/components/AdminSignalsTable";

import { useAdminSignals } from "@/old/modules/core/signals/hooks/useSignals";
import type {
    AdminSignal,
    AdminSignalsParams,
    SignalFilterOption,
} from "@/old/modules/core/signals/types/signals";

function uniqueSorted(values: string[]): SignalFilterOption[] {
    return [...new Set(values.filter(Boolean))]
        .sort((a, b) => a.localeCompare(b))
        .map((value) => ({ label: value, value }));
}

function toDateInputValue(date: Date) {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function buildDateRangeFromPreset(range: SignalRangeValue) {
    const now = new Date();
    const from = new Date();

    if (range === "7d") {
        from.setDate(now.getDate() - 7);
        return {
            dateFrom: toDateInputValue(from),
            dateTo: toDateInputValue(now),
        };
    }

    if (range === "15d") {
        from.setDate(now.getDate() - 15);
        return {
            dateFrom: toDateInputValue(from),
            dateTo: toDateInputValue(now),
        };
    }

    if (range === "30d") {
        from.setDate(now.getDate() - 30);
        return {
            dateFrom: toDateInputValue(from),
            dateTo: toDateInputValue(now),
        };
    }

    return {
        dateFrom: "",
        dateTo: "",
    };
}

export default function AdminSignalsHistoryPage() {
    const [symbol, setSymbol] = React.useState("");
    const [timeFrame, setTimeFrame] = React.useState("");
    const [indicatorId, setIndicatorId] = React.useState("");

    const [range, setRange] = React.useState<SignalRangeValue>("7d");
    const [lastHours, setLastHours] = React.useState("");
    const [dateFrom, setDateFrom] = React.useState("");
    const [dateTo, setDateTo] = React.useState("");

    const queryParams = React.useMemo<AdminSignalsParams>(() => {
        const params: AdminSignalsParams = {
            symbol: symbol || undefined,
            timeFrame: timeFrame || undefined,
            indicatorId: indicatorId || undefined,
        };

        if (lastHours.trim()) {
            params.lastHours = lastHours.trim();
            return params;
        }

        if (range === "custom") {
            params.dateFrom = dateFrom || undefined;
            params.dateTo = dateTo || undefined;
            return params;
        }

        const presetDates = buildDateRangeFromPreset(range);
        params.dateFrom = presetDates.dateFrom || undefined;
        params.dateTo = presetDates.dateTo || undefined;

        return params;
    }, [symbol, timeFrame, indicatorId, range, lastHours, dateFrom, dateTo]);

    const { data: rows = [], isLoading, isFetching } = useAdminSignals(queryParams);

    const signalRows = rows as AdminSignal[];

    const symbolOptions = React.useMemo(() => {
        return uniqueSorted(signalRows.map((row) => row.symbol));
    }, [signalRows]);

    const timeFrameOptions = React.useMemo(() => {
        return uniqueSorted(signalRows.map((row) => row.timeFrame));
    }, [signalRows]);

    const indicatorOptions = React.useMemo(() => {
        const map = new Map<string, SignalFilterOption>();

        signalRows.forEach((row) => {
            const id = row.indicator?.id;
            const name = row.indicator?.name;

            if (id && name) {
                map.set(id, { label: name, value: id });
            }
        });

        return [...map.values()].sort((a, b) => a.label.localeCompare(b.label));
    }, [signalRows]);

    const handleChangeRange = (value: SignalRangeValue) => {
        setRange(value);
        setLastHours("");

        if (value !== "custom") {
            setDateFrom("");
            setDateTo("");
        }
    };

    const handleChangeLastHours = (value: string) => {
        setLastHours(value);

        if (value.trim()) {
            setDateFrom("");
            setDateTo("");
        }
    };

    const handleReset = () => {
        setSymbol("");
        setTimeFrame("");
        setIndicatorId("");
        setRange("7d");
        setLastHours("");
        setDateFrom("");
        setDateTo("");
    };

    if (isLoading) {
        return (
            <Box
                sx={{
                    height: "100%",
                    minHeight: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box
            sx={{
                width: "100%",
                height: "100%",
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                px: { xs: 1.5, sm: 2, lg: 3 },
                py: { xs: 2, sm: 3 },
                boxSizing: "border-box",
            }}
        >
            <Stack spacing={2.5} sx={{ flex: 1, minHeight: 0 }}>
                <Box sx={{ flexShrink: 0 }}>
                    <Typography variant="h4" fontWeight={900} sx={{ mb: 0.5 }}>
                        Admin Signals History
                    </Typography>

                    <Typography variant="body2" color="text.secondary">
                        Monitor all generated signals and review who created them.
                    </Typography>
                </Box>

                <Box sx={{ flexShrink: 0 }}>
                    <SignalsFilters
                        title="History filters"
                        subtitle="Filter signals by symbol, timeframe, indicator, quick range or custom hours."
                        symbol={symbol}
                        timeFrame={timeFrame}
                        indicatorId={indicatorId}
                        range={range}
                        lastHours={lastHours}
                        dateFrom={dateFrom}
                        dateTo={dateTo}
                        symbolOptions={symbolOptions}
                        timeFrameOptions={timeFrameOptions}
                        indicatorOptions={indicatorOptions}
                        onChangeSymbol={setSymbol}
                        onChangeTimeFrame={setTimeFrame}
                        onChangeIndicatorId={setIndicatorId}
                        onChangeRange={handleChangeRange}
                        onChangeLastHours={handleChangeLastHours}
                        onChangeDateFrom={setDateFrom}
                        onChangeDateTo={setDateTo}
                        onReset={handleReset}
                    />
                </Box>

                <Box
                    sx={{
                        flex: 1,
                        minHeight: 0,
                        overflow: "hidden",
                    }}
                >
                    <AdminSignalsTable rows={signalRows} loading={isFetching} />
                </Box>
            </Stack>
        </Box>
    );
}