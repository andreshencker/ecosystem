// src/app/common/pages/client/binance/BinanceDashboard.tsx
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

const sampleData = [
    {time: "10:00", price: 30000, volume: 150},
    {time: "11:00", price: 31050, volume: 200},  // sube un poco
    {time: "12:00", price: 29500, volume: 400},  // caída fuerte + volumen alto
    {time: "13:00", price: 32500, volume: 500},  // subida fuerte + mucho volumen
    {time: "14:00", price: 31800, volume: 220},  // corrección leve
    {time: "15:00", price: 34000, volume: 600},  // rally alcista con volumen alto
    {time: "16:00", price: 28000, volume: 800},  // caída brusca, pánico
    {time: "17:00", price: 29000, volume: 350},  // rebote leve
    {time: "18:00", price: 31000, volume: 450},  // recuperación con más volumen
    {time: "19:00", price: 33000, volume: 700},  // sube con fuerza
];

const balances = [
    {asset: "BTC", amount: 0.5, value: 15750},
    {asset: "ETH", amount: 10, value: 18000},
    {asset: "BNB", amount: 20, value: 6000},
];

const COLORS = ["#0088FE", "#00C49F", "#FFBB28"];

export default function BinanceDashboard() {
    const pieData = balances.map((b) => ({name: b.asset, value: b.value}));

    return (
        <Box
            sx={{
                width: "100%",
                height: "100vh",
                p: 2,
                boxSizing: "border-box",
                overflow: "auto",
                backgroundColor: "background.default",
            }}
        >
            <Box sx={{mb: 2}}>
                <Typography variant="subtitle1" color="text.secondary">
                    Overview of your crypto assets
                </Typography>
            </Box>

            <Stack direction={{xs: "column", md: "row"}} spacing={2} sx={{height: "calc(100% - 80px)"}}>
                <Card sx={{flex: 2, display: "flex", flexDirection: "column"}}>
                    <CardContent sx={{flex: 1}}>
                        <Typography variant="h6" mb={2}>
                            Price Trend (Last Hours)
                        </Typography>
                        <ResponsiveContainer width="100%" height={200}>
                            <LineChart data={sampleData}>
                                <XAxis dataKey="time"/>
                                <YAxis/>
                                <Tooltip/>
                                <Line type="monotone" dataKey="price" stroke="#4caf50" dot={false}/>
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                    <CardContent sx={{flex: 1}}>
                        <Typography variant="h6" mb={2}>
                            Trading Volume (Bar Chart)
                        </Typography>
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={sampleData}>
                                <XAxis dataKey="time"/>
                                <YAxis/>
                                <Tooltip/>
                                <Bar dataKey="volume" fill="#8884d8"/>
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                    <CardContent>
                        <Typography variant="h6" mb={1}>
                            Portfolio Distribution
                        </Typography>
                        <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={60}
                                    fill="#8884d8"
                                    dataKey="value"
                                    label
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]}/>
                                    ))}
                                </Pie>
                                <Legend/>
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Stack spacing={2} flex={1}>
                    <Card>
                        <CardContent>
                            <Typography variant="subtitle2" color="text.secondary">
                                BTC Value
                            </Typography>
                            <Typography variant="h5">$31,500</Typography>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent>
                            <Typography variant="subtitle2" color="text.secondary">
                                ETH Value
                            </Typography>
                            <Typography variant="h5">$1,800</Typography>
                        </CardContent>
                    </Card>

                    <Card sx={{flex: 1, display: "flex", flexDirection: "column"}}>
                        <CardContent>
                            <Typography variant="h6" mb={1}>
                                Balances
                            </Typography>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Asset</TableCell>
                                        <TableCell align="right">Amount</TableCell>
                                        <TableCell align="right">Value</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {balances.map((b) => (
                                        <TableRow key={b.asset}>
                                            <TableCell>{b.asset}</TableCell>
                                            <TableCell align="right">{b.amount}</TableCell>
                                            <TableCell align="right">${b.value.toLocaleString()}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </Stack>
            </Stack>
        </Box>
    );
}