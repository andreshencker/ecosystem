// src/modules/integrations/metatrader5/pages/MetatraderDashboard.tsx
import React from "react";
import {
    Box,
    Card,
    CardContent,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Typography,
} from "@mui/material";
import {
    Bar,
    BarChart,
    Cell,
    Legend,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

/* =======================
   Dummy MT5 data
======================= */

const equityData = [
    {time: "10:00", equity: 10000},
    {time: "11:00", equity: 10120},
    {time: "12:00", equity: 9950},
    {time: "13:00", equity: 10380},
    {time: "14:00", equity: 10240},
    {time: "15:00", equity: 10550},
];

const volumeData = [
    {hour: "10", volume: 3},
    {hour: "11", volume: 6},
    {hour: "12", volume: 9},
    {hour: "13", volume: 12},
    {hour: "14", volume: 7},
    {hour: "15", volume: 10},
];

const pnlBySymbol = [
    {name: "EURUSD", value: 1200},
    {name: "GBPUSD", value: 600},
    {name: "XAUUSD", value: 900},
    {name: "NAS100", value: 300},
];

const symbolStats = [
    {symbol: "EURUSD", trades: 12, pnl: 1200, volume: 3.2},
    {symbol: "GBPUSD", trades: 8, pnl: 600, volume: 2.1},
    {symbol: "XAUUSD", trades: 5, pnl: 900, volume: 1.5},
    {symbol: "NAS100", trades: 3, pnl: 300, volume: 0.8},
];

const COLORS = ["#4caf50", "#2196f3", "#ff9800", "#9c27b0"];

/* =======================
   Component
======================= */

export default function MetatraderDashboard() {
    return (
        <Box sx={{p: 2}}>
            <Stack spacing={2}>
                {/* ===== Header ===== */}
                <Box>
                    <Typography variant="h5" fontWeight={800}>
                        MetaTrader 5 – Dashboard
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Overview of your trading performance (dummy data)
                    </Typography>
                </Box>

                {/* ===== Main layout ===== */}
                <Stack direction={{xs: "column", md: "row"}} spacing={2}>
                    {/* LEFT – Charts */}
                    <Stack spacing={2} flex={3}>
                        {/* Equity Curve */}
                        <Card>
                            <CardContent>
                                <Typography fontWeight={700} mb={2}>
                                    Equity Curve
                                </Typography>
                                <ResponsiveContainer width="100%" height={220}>
                                    <LineChart data={equityData}>
                                        <XAxis dataKey="time"/>
                                        <YAxis/>
                                        <Tooltip/>
                                        <Line
                                            type="monotone"
                                            dataKey="equity"
                                            stroke="#4caf50"
                                            strokeWidth={2}
                                            dot={false}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        {/* Volume by Hour */}
                        <Card>
                            <CardContent>
                                <Typography fontWeight={700} mb={2}>
                                    Trades Volume by Hour
                                </Typography>
                                <ResponsiveContainer width="100%" height={220}>
                                    <BarChart data={volumeData}>
                                        <XAxis dataKey="hour"/>
                                        <YAxis/>
                                        <Tooltip/>
                                        <Bar dataKey="volume" fill="#2196f3" radius={[6, 6, 0, 0]}/>
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </Stack>

                    {/* RIGHT – Metrics + Pie */}
                    <Stack spacing={2} flex={2}>
                        {/* Metrics */}
                        <Stack direction="row" spacing={2}>
                            <Card sx={{flex: 1}}>
                                <CardContent>
                                    <Typography variant="caption" color="text.secondary">
                                        Net P/L
                                    </Typography>
                                    <Typography variant="h5" fontWeight={800} color="success.main">
                                        $3,000
                                    </Typography>
                                </CardContent>
                            </Card>

                            <Card sx={{flex: 1}}>
                                <CardContent>
                                    <Typography variant="caption" color="text.secondary">
                                        Win Rate
                                    </Typography>
                                    <Typography variant="h5" fontWeight={800}>
                                        62%
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Stack>

                        {/* Pie Chart */}
                        <Card>
                            <CardContent>
                                <Typography fontWeight={700} mb={2}>
                                    PnL by Symbol
                                </Typography>
                                <ResponsiveContainer width="100%" height={220}>
                                    <PieChart>
                                        <Pie
                                            data={pnlBySymbol}
                                            dataKey="value"
                                            nameKey="name"
                                            outerRadius={80}
                                            label
                                        >
                                            {pnlBySymbol.map((_, i) => (
                                                <Cell key={i} fill={COLORS[i % COLORS.length]}/>
                                            ))}
                                        </Pie>
                                        <Tooltip/>
                                        <Legend/>
                                    </PieChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </Stack>
                </Stack>

                {/* ===== Table ===== */}
                <Card>
                    <CardContent>
                        <Typography fontWeight={700} mb={2}>
                            Symbol Performance
                        </Typography>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Symbol</TableCell>
                                    <TableCell align="right">Trades</TableCell>
                                    <TableCell align="right">PnL</TableCell>
                                    <TableCell align="right">Volume</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {symbolStats.map((row) => (
                                    <TableRow key={row.symbol}>
                                        <TableCell>{row.symbol}</TableCell>
                                        <TableCell align="right">{row.trades}</TableCell>
                                        <TableCell align="right">${row.pnl}</TableCell>
                                        <TableCell align="right">{row.volume}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </Stack>
        </Box>
    );
}