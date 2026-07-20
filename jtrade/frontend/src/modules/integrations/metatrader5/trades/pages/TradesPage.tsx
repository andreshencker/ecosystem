import * as React from "react";
import {Alert, Box, Button, Divider, Paper, Stack, Typography} from "@mui/material";

import TradesTable from "../components/TradesTable";
import TradesSymbolSelect from "../components/SymbolSelect";
import TradesSummaryCards from "../components/TradesSummaryCards";
import TradesChartsPanel from "../components/TradesChartsPanel";
import {useMt5Trades} from "../hooks/useMt5Trades";
import {getActivePlatformFromStorage} from "../utils/getActivePlatform";

const ALL = "__ALL__";
const TOPBAR_H = 64; // cambia si tu topbar es otra altura

export default function TradesPage() {
    const {trades, fetchByPlatform} = useMt5Trades();

    const activePlatform = React.useMemo(() => getActivePlatformFromStorage(), []);
    const userPlatformId = activePlatform?.linkId ?? null;

    const [symbol, setSymbol] = React.useState<string>(ALL);

    const symbolOptions = React.useMemo(() => {
        const list = (trades.data ?? []).map((t) => t.symbol).filter(Boolean);
        return Array.from(new Set(list)).sort();
    }, [trades.data]);

    const filteredRows = React.useMemo(() => {
        const all = trades.data ?? [];
        if (symbol === ALL) return all;
        return all.filter((t) => t.symbol === symbol);
    }, [trades.data, symbol]);

    React.useEffect(() => {
        if (symbol === ALL) return;
        if (!symbolOptions.includes(symbol)) setSymbol(ALL);
    }, [symbolOptions, symbol]);

    const handleRefresh = React.useCallback(() => {
        if (!userPlatformId) return;
        fetchByPlatform(userPlatformId);
    }, [userPlatformId, fetchByPlatform]);

    React.useEffect(() => {
        handleRefresh();
    }, [handleRefresh]);

    const panelSx = {
        borderRadius: 3,
        border: "1px solid",
        borderColor: "divider",
        boxShadow: "none",
        overflow: "hidden",
        minHeight: 0,
    } as const;

    const sectionHeaderSx = {
        px: 2,
        pt: 2,
        pb: 1.5,
    } as const;

    return (
        <Box
            sx={{
                p: 2,
                height: {md: `calc(100vh - ${TOPBAR_H}px)`},
                overflow: {md: "hidden"},
            }}
        >
            <Stack spacing={2} sx={{height: "100%", minHeight: 0}}>
                {!userPlatformId && (
                    <Alert severity="warning">
                        No active platform found in localStorage. Please select a platform again.
                    </Alert>
                )}
                {trades.error && <Alert severity="error">{trades.error}</Alert>}

                {/* OVERVIEW */}
                <Paper sx={panelSx}>
                    <Box sx={sectionHeaderSx}>
                        <Stack
                            direction={{xs: "column", sm: "row"}}
                            alignItems={{xs: "flex-start", sm: "center"}}
                            justifyContent="space-between"
                            gap={2}
                        >
                            <Box>
                                <Typography variant="h6" fontWeight={700}>
                                    Overview
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Quick summary based on the current filter
                                </Typography>
                            </Box>

                            <Stack direction="row" spacing={1} alignItems="center">
                                <TradesSymbolSelect
                                    value={symbol}
                                    options={symbolOptions}
                                    onChange={setSymbol}
                                    label="Symbol"
                                />
                                <Button
                                    variant="contained"
                                    onClick={handleRefresh}
                                    disabled={!userPlatformId || trades.loading}
                                    sx={{textTransform: "none", fontWeight: 700}}
                                >
                                    Refresh
                                </Button>
                            </Stack>
                        </Stack>
                    </Box>

                    <Divider/>

                    <Box sx={{px: 2, py: 2}}>
                        <TradesSummaryCards rows={filteredRows} loading={trades.loading}/>
                    </Box>
                </Paper>

                {/* LOWER SECTION */}
                <Box
                    sx={{
                        flex: 1,
                        minHeight: 0,
                        display: "grid",
                        gap: 2,
                        gridTemplateColumns: {xs: "1fr", md: "5fr 7fr"},
                        alignItems: "stretch",
                    }}
                >
                    {/* Trades */}
                    <Paper sx={panelSx}>
                        <Box sx={sectionHeaderSx}>
                            <Typography variant="h6" fontWeight={700}>
                                Trades
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Scroll to view more
                            </Typography>
                        </Box>

                        <Divider/>

                        <Box
                            sx={{
                                p: 2,
                                height: {xs: 520, md: "100%"},
                                overflow: "auto",
                                minHeight: 0,
                            }}
                        >
                            {trades.loading ? (
                                <Typography variant="body2" color="text.secondary">
                                    Loading trades…
                                </Typography>
                            ) : (
                                <TradesTable rows={filteredRows}/>
                            )}
                        </Box>
                    </Paper>

                    {/* Charts */}
                    <Paper sx={panelSx}>
                        <Box sx={sectionHeaderSx}>
                            <Typography variant="h6" fontWeight={700}>
                                Charts
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Preview (dummy)
                            </Typography>
                        </Box>

                        <Divider/>

                        <Box
                            sx={{
                                p: 2,
                                height: {xs: 520, md: "100%"},
                                overflow: "auto",
                                minHeight: 0,
                            }}
                        >
                            <TradesChartsPanel/>
                        </Box>
                    </Paper>
                </Box>
            </Stack>
        </Box>
    );
}