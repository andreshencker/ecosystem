// src/trades/components/TradesSummaryCards.tsx
import * as React from "react";
import {Box, Paper, Stack, Typography} from "@mui/material";
import type {Trade} from "../types/trades";

type Props = {
    rows: Trade[];
    loading?: boolean;
};

function n(v: any): number {
    const x = Number(v);
    return Number.isFinite(x) ? x : 0;
}

function format2(x: number): string {
    return x.toFixed(2);
}

export default function TradesSummaryCards({rows, loading}: Props) {
    const metrics = React.useMemo(() => {
        const totalTrades = rows.length;

        const totalProfit = rows.reduce((acc, t) => acc + n(t.profit), 0);
        const totalCommission = rows.reduce((acc, t) => acc + n(t.commission), 0);
        const totalSwap = rows.reduce((acc, t) => acc + n(t.swap), 0);

        // Net P/L = profit - commission - swap
        const totalNet = totalProfit - totalCommission - totalSwap;

        const wins = rows.filter((t) => n(t.profit) > 0).length;
        const losses = rows.filter((t) => n(t.profit) < 0).length;

        // win rate SOLO con trades cerrados (si quieres). Por ahora, por total:
        const denom = totalTrades;
        const winRate = denom > 0 ? (wins / denom) * 100 : 0;

        return {
            totalTrades,
            totalCommission,
            totalSwap,
            totalNet,
            wins,
            losses,
            winRate,
        };
    }, [rows]);

    const StatCard = ({
                          title,
                          value,
                          helper,
                          emphasize,
                      }: {
        title: string;
        value: string;
        helper?: string;
        emphasize?: "pos" | "neg" | "neutral";
    }) => (
        <Paper
            elevation={0}
            sx={{
                flex: "0 0 auto",
                width: {xs: 190, sm: 210, md: 230}, // ✅ ancho fijo por tarjeta (compacto)
                borderRadius: 3,
                border: "1px solid",
                borderColor: "divider",
                px: 1.5,
                py: 1.25,
                boxShadow: "none",
                bgcolor: "background.paper",
            }}
        >
            <Typography variant="caption" color="text.secondary" sx={{lineHeight: 1.2}}>
                {title}
            </Typography>

            <Typography
                variant="h6"
                fontWeight={900}
                sx={{
                    mt: 0.25,
                    lineHeight: 1.15,
                    color:
                        emphasize === "pos"
                            ? "success.main"
                            : emphasize === "neg"
                                ? "error.main"
                                : "text.primary",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                }}
            >
                {loading ? "—" : value}
            </Typography>

            {helper ? (
                <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                        display: "block",
                        mt: 0.25,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        opacity: 0.9,
                    }}
                >
                    {helper}
                </Typography>
            ) : (
                <Box sx={{height: 16}}/> // ✅ reserva espacio para alinear alturas
            )}
        </Paper>
    );

    return (
        <Box
            sx={{
                display: "flex",
                gap: 1.25,
                overflowX: "auto",
                overflowY: "hidden",
                pb: 0.5,
                WebkitOverflowScrolling: "touch",
                "&::-webkit-scrollbar": {height: 8},
            }}
        >
            <StatCard
                title="Total Net P/L"
                value={format2(metrics.totalNet)}
                emphasize={metrics.totalNet >= 0 ? "pos" : "neg"}
                helper="profit - commission - swap"
            />

            <StatCard
                title="Total Commission"
                value={format2(metrics.totalCommission)}
                emphasize={metrics.totalCommission > 0 ? "neg" : "neutral"}
            />

            <StatCard
                title="Total Swap"
                value={format2(metrics.totalSwap)}
                emphasize={metrics.totalSwap < 0 ? "neg" : "neutral"}
            />

            <StatCard title="Trades" value={String(metrics.totalTrades)}/>

            <Paper
                elevation={0}
                sx={{
                    flex: "0 0 auto",
                    width: {xs: 190, sm: 210, md: 230},
                    borderRadius: 3,
                    border: "1px solid",
                    borderColor: "divider",
                    px: 1.5,
                    py: 1.25,
                    boxShadow: "none",
                    bgcolor: "background.paper",
                }}
            >
                <Typography variant="caption" color="text.secondary" sx={{lineHeight: 1.2}}>
                    Win rate
                </Typography>

                <Typography variant="h6" fontWeight={900} sx={{mt: 0.25, lineHeight: 1.15}}>
                    {loading ? "—" : `${metrics.winRate.toFixed(1)}%`}
                </Typography>

                <Stack direction="row" spacing={1} sx={{mt: 0.25}}>
                    <Typography variant="caption" color="text.secondary">
                        W: {loading ? "—" : metrics.wins}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        L: {loading ? "—" : metrics.losses}
                    </Typography>
                </Stack>
            </Paper>
        </Box>
    );
}