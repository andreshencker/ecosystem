// src/trades/components/TradesTable.tsx
import * as React from "react";
import {Box, Chip, Divider, Paper, Stack, Typography, useTheme,} from "@mui/material";

import StatusChip from "@/app/common/components/StatusChip";
import type {Trade} from "../types/trades";

type Props = {
    rows: Trade[];
    height?: number | string; // e.g. 520, "70vh"
};

function formatNumber(n: unknown, digits = 2) {
    if (typeof n !== "number" || Number.isNaN(n)) return "—";
    return n.toFixed(digits);
}

function formatPrice(n: unknown) {
    if (typeof n !== "number" || Number.isNaN(n)) return "—";
    const digits = n < 10 ? 5 : 2;
    return n.toFixed(digits);
}

function formatTime(iso: string) {
    try {
        return new Date(iso).toLocaleString();
    } catch {
        return iso;
    }
}

function sideChip(action: Trade["action"]) {
    const isBuy = action === "BUY";
    return (
        <Chip
            size="small"
            label={action}
            sx={{
                textTransform: "uppercase",
                fontWeight: 800,
                borderRadius: 999,
                bgcolor: isBuy ? "rgba(0,200,83,0.15)" : "rgba(244,67,54,0.15)",
                color: isBuy ? "success.main" : "error.main",
                border: "1px solid",
                borderColor: isBuy
                    ? "rgba(0,200,83,0.25)"
                    : "rgba(244,67,54,0.25)",
            }}
        />
    );
}

function statusPill(status: Trade["status"]) {
    const map: Record<string, { label: string; color: any }> = {
        OPENED: {label: "OPENED", color: "info"},
        CLOSED: {label: "CLOSED", color: "success"},
        EXECUTED: {label: "EXECUTED", color: "default"},
    };
    const s = map[status] ?? {label: String(status), color: "default"};
    return <StatusChip label={s.label} color={s.color} dense/>;
}

function calcRR(t: Trade): number | null {
    const {action, entry, sl, tp} = t;
    if (![entry, sl, tp].every((x) => typeof x === "number")) return null;

    const risk = action === "BUY" ? entry - sl : sl - entry;
    const reward = action === "BUY" ? tp - entry : entry - tp;

    if (risk <= 0 || reward <= 0) return null;
    return reward / risk;
}

function calcNetPL(t: Trade): number | null {
    const profit = typeof t.profit === "number" ? t.profit : 0;
    const commission = typeof t.commission === "number" ? t.commission : 0;
    const swap = typeof t.swap === "number" ? t.swap : 0;

    const hasAny =
        typeof t.profit === "number" ||
        typeof t.commission === "number" ||
        typeof t.swap === "number";

    if (!hasAny) return null;
    return profit - commission - swap;
}

function RowKV({k, v}: { k: string; v: React.ReactNode }) {
    return (
        <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="caption" color="text.secondary">
                {k}
            </Typography>
            <Typography variant="body2" fontWeight={700}>
                {v}
            </Typography>
        </Stack>
    );
}

export default function TradesTable({rows, height = "70vh"}: Props) {
    const theme = useTheme();

    if (!rows.length) {
        return (
            <Paper
                elevation={0}
                sx={{
                    borderRadius: 3,
                    p: 2,
                    border: "1px dashed",
                    borderColor: "divider",
                    textAlign: "center",
                }}
            >
                <Typography variant="body2" color="text.secondary">
                    No trades found.
                </Typography>
            </Paper>
        );
    }

    return (
        <Paper
            elevation={0}
            sx={{
                borderRadius: 3,
                border: "1px solid",
                borderColor: "divider",
                bgcolor: theme.palette.background.paper,
                overflow: "hidden",
            }}
        >
            {/* Contenedor con altura fija + scroll */}
            <Box
                sx={{
                    height,
                    overflowY: "auto",
                    p: 1.5,
                }}
            >
                {/* ✅ UNA SOLA COLUMNA SIEMPRE */}
                <Stack spacing={1.5}>
                    {rows.map((t) => {
                        const rr = calcRR(t);
                        const net = calcNetPL(t);

                        return (
                            <Paper
                                key={t.id}
                                elevation={0}
                                sx={{
                                    borderRadius: 3,
                                    p: 1.5,
                                    border: "1px solid",
                                    borderColor: "divider",
                                    bgcolor: "transparent",
                                }}
                            >
                                {/* Header */}
                                <Stack
                                    direction="row"
                                    alignItems="center"
                                    justifyContent="space-between"
                                    spacing={1}
                                >
                                    <Box sx={{minWidth: 0}}>
                                        <Typography variant="body2" fontWeight={800} noWrap>
                                            {t.symbol}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary" noWrap>
                                            {formatTime(t.timestamp)}
                                        </Typography>
                                    </Box>

                                    <Stack direction="row" spacing={1} alignItems="center">
                                        {sideChip(t.action)}
                                        {statusPill(t.status)}
                                    </Stack>
                                </Stack>

                                <Divider sx={{my: 1.2}}/>

                                <Stack spacing={0.9}>
                                    <RowKV k="Lot" v={formatNumber(t.lot, 2)}/>
                                    <RowKV k="Entry" v={formatPrice(t.entry)}/>
                                    <RowKV k="SL" v={formatPrice(t.sl)}/>
                                    <RowKV k="TP" v={formatPrice(t.tp)}/>

                                    <Divider sx={{my: 0.4}}/>

                                    <RowKV k="R:R" v={rr == null ? "—" : rr.toFixed(2)}/>

                                    <RowKV
                                        k="Net P/L"
                                        v={
                                            <Typography
                                                component="span"
                                                variant="body2"
                                                fontWeight={900}
                                                color={
                                                    net == null
                                                        ? "text.secondary"
                                                        : net >= 0
                                                            ? "success.main"
                                                            : "error.main"
                                                }
                                            >
                                                {net == null ? "—" : net.toFixed(2)}
                                            </Typography>
                                        }
                                    />

                                    <RowKV
                                        k="Commission"
                                        v={
                                            typeof t.commission === "number"
                                                ? t.commission.toFixed(2)
                                                : "—"
                                        }
                                    />
                                    <RowKV
                                        k="Swap"
                                        v={
                                            typeof t.swap === "number"
                                                ? t.swap.toFixed(2)
                                                : "—"
                                        }
                                    />

                                    <Divider sx={{my: 0.4}}/>

                                    <RowKV k="Ticket" v={t.ticket ?? "—"}/>
                                </Stack>
                            </Paper>
                        );
                    })}
                </Stack>
            </Box>
        </Paper>
    );
}