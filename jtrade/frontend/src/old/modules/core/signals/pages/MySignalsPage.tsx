import * as React from "react";
import { Box, CircularProgress, Stack, Typography } from "@mui/material";

import SignalsFilters, {
    type SignalRangeValue,
} from "@/old/modules/core/signals/components/SignalsFilters";
import ClientSignalsTable from "@/old/modules/core/signals/components/ClientSignalsTable";

import { useClientSignals } from "@/old/modules/core/signals/hooks/useSignals";
import { useMySymbolExecutions } from "@/old/modules/core/symbolExecution/hooks/useSymbolExecutions";

import type {
    ClientSignal,
    ClientSignalsParams,
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

export default function MySignalsPage() {
    const [symbol, setSymbol] = React.useState("");
    const [timeFrame, setTimeFrame] = React.useState("");
    const [indicatorId, setIndicatorId] = React.useState("");

    const [range, setRange] = React.useState<SignalRangeValue>("");
    const [lastHours, setLastHours] = React.useState("");
    const [dateFrom, setDateFrom] = React.useState("");
    const [dateTo, setDateTo] = React.useState("");

    const {
        data: executions = [],
        isLoading: executionsLoading,
        isFetching: executionsFetching,
    } = useMySymbolExecutions();

    const queryParams = React.useMemo<ClientSignalsParams>(() => {
        const params: ClientSignalsParams = {
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

        if (range === "7d" || range === "15d" || range === "30d") {
            const presetDates = buildDateRangeFromPreset(range);
            params.dateFrom = presetDates.dateFrom || undefined;
            params.dateTo = presetDates.dateTo || undefined;
        }

        return params;
    }, [symbol, timeFrame, indicatorId, range, lastHours, dateFrom, dateTo]);

    const {
        data: rows = [],
        isLoading: signalsLoading,
        isFetching: signalsFetching,
    } = useClientSignals(queryParams);

    const signalRows = rows as ClientSignal[];

    const symbolOptions = React.useMemo(() => {
        const values =
            (executions as any[])
                ?.map((item) => item?.alertGroup?.symbol)
                ?.filter(Boolean) ?? [];

        return uniqueSorted(values);
    }, [executions]);

    const timeFrameOptions = React.useMemo(() => {
        const values =
            (executions as any[])
                ?.map((item) => item?.alertGroup?.timeFrame)
                ?.filter(Boolean) ?? [];

        return uniqueSorted(values);
    }, [executions]);

    const indicatorOptions = React.useMemo(() => {
        const map = new Map<string, SignalFilterOption>();

        (executions as any[]).forEach((item) => {
            const id =
                item?.alertGroup?.indicator?.id ??
                item?.alertGroup?.indicatorId ??
                null;

            const name = item?.alertGroup?.indicator?.name ?? null;

            if (id && name) {
                map.set(String(id), {
                    label: String(name),
                    value: String(id),
                });
            }
        });

        return [...map.values()].sort((a, b) => a.label.localeCompare(b.label));
    }, [executions]);

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
        setRange("");
        setLastHours("");
        setDateFrom("");
        setDateTo("");
    };

    if (executionsLoading || signalsLoading) {
        return (
            <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box
            sx={{
                width: "100%",
                minHeight: "100%",
                px: { xs: 1.5, sm: 2, lg: 3 },
                py: { xs: 2, sm: 3 },
                boxSizing: "border-box",
                overflowX: "hidden",
            }}
        >
            <Stack spacing={2.5}>
                <Box>
                    <Typography variant="h4" fontWeight={900} sx={{ mb: 0.5 }}>
                        My Signals
                    </Typography>

                    <Typography variant="body2" color="text.secondary">
                        Review your signal history and filter by symbol, timeframe and indicator.
                    </Typography>
                </Box>

                <SignalsFilters
                    title="Signal filters"
                    subtitle="Use the filters below to narrow your signal history."
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

                <ClientSignalsTable
                    rows={signalRows}
                    loading={signalsFetching || executionsFetching}
                />
            </Stack>
        </Box>
    );
}