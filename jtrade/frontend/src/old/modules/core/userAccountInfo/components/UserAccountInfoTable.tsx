import * as React from "react";

import {
    Box,
    Button,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
    useMediaQuery,
    useTheme,
} from "@mui/material";

import StatusChip from "@/old/app/common/components/StatusChip";
import DeleteConfirmButton from "@/old/app/common/components/ConfirmDeleteButton";

import type { UserAccountInfo } from "../types/userAccountInfo";

type Props = {
    rows?: UserAccountInfo[];
    loading?: boolean;
    onEdit?: (row: UserAccountInfo) => void;
    onDelete?: (row: UserAccountInfo) => void;
};

function fmtNumber(value: any, digits = 2) {
    const num = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(num)) return "-";
    return num.toFixed(digits);
}

function getProjectName(row: UserAccountInfo) {
    return (
        row.userProjectPlatform?.projectCodePlatform?.codeProject?.name ??
        row.indicatorProject?.projectCodePlatform?.codeProject?.name ??
        "-"
    );
}

function getPlatformName(row: UserAccountInfo) {
    return (
        row.userProjectPlatform?.projectCodePlatform?.platform?.name ??
        row.indicatorProject?.projectCodePlatform?.platform?.name ??
        "-"
    );
}

function getRuntimeMode(row: UserAccountInfo) {
    return (
        row.userProjectPlatform?.projectCodePlatform?.runtimeMode ??
        row.indicatorProject?.projectCodePlatform?.runtimeMode ??
        "-"
    );
}

function getIndicatorName(row: UserAccountInfo) {
    return (
        row.indicatorProject?.indicator?.key ??
        row.indicatorProject?.indicator?.name ??
        "-"
    );
}

function renderDrawdownEnabled(row: UserAccountInfo) {
    return row.useDrawdownLimit ? "Yes" : "No";
}

function renderDrawdownPercent(row: UserAccountInfo) {
    if (!row.useDrawdownLimit) return "-";
    return `${fmtNumber(row.maxDrawdownPercent, 2)}%`;
}

function renderProfitEnabled(row: UserAccountInfo) {
    return row.useProfitLimit ? "Yes" : "No";
}

function renderProfitPercent(row: UserAccountInfo) {
    if (!row.useProfitLimit) return "-";
    return `${fmtNumber(row.maxProfitPercent, 2)}%`;
}

function ProjectPlatformCell({ row }: { row: UserAccountInfo }) {
    return (
        <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" fontWeight={900} noWrap>
                {getProjectName(row)}
            </Typography>

            <Typography variant="caption" color="text.secondary" noWrap>
                {getPlatformName(row)} · {getRuntimeMode(row)}
            </Typography>
        </Box>
    );
}

export default function UserAccountInfoTable({
                                                 rows = [],
                                                 loading,
                                                 onEdit,
                                                 onDelete,
                                             }: Props) {
    const theme = useTheme();
    const isDark = theme.palette.mode === "dark";
    const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
    const isTablet = useMediaQuery(theme.breakpoints.between("sm", "lg"));

    const renderActions = (row: UserAccountInfo) => (
        <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            justifyContent="flex-end"
        >
            <Button
                size="small"
                variant={isDark ? "outlined" : "contained"}
                color="inherit"
                onClick={() => onEdit?.(row)}
                sx={{
                    textTransform: "none",
                    fontWeight: 800,
                    borderRadius: 3,
                    px: 1.8,
                    minWidth: 64,
                    ...(isDark && {
                        borderColor: "divider",
                        bgcolor: "rgba(255,255,255,0.02)",
                    }),
                }}
            >
                Edit
            </Button>

            <DeleteConfirmButton
                label="Delete"
                color="error"
                size="small"
                confirmTitle="Delete account info"
                confirmText="Are you sure you want to delete this account info?"
                description="This action cannot be undone."
                onConfirm={() => onDelete?.(row)}
            />
        </Stack>
    );

    if (isMobile || isTablet) {
        return (
            <Box
                sx={{
                    height: "100%",
                    minHeight: 0,
                    overflowY: "auto",
                    overflowX: "hidden",
                    pr: 0.5,
                    pb: 1,
                }}
            >
                <Stack spacing={1.5}>
                    {rows.map((row) => (
                        <Paper
                            key={row.id}
                            elevation={0}
                            sx={{
                                borderRadius: 3,
                                p: 1.5,
                                border: "1px solid",
                                borderColor: "divider",
                                bgcolor: "background.paper",
                            }}
                        >
                            <Stack spacing={1.3}>
                                <Stack
                                    direction="row"
                                    justifyContent="space-between"
                                    alignItems="flex-start"
                                    spacing={1.5}
                                >
                                    <Box sx={{ minWidth: 0, flex: 1 }}>
                                        <Typography variant="body2" fontWeight={900} noWrap>
                                            {row.accountLabel || "Account"}
                                        </Typography>

                                        <Typography variant="caption" color="text.secondary" noWrap>
                                            Ref: {row.accountRef ?? "-"}
                                        </Typography>
                                    </Box>

                                    <StatusChip
                                        label={row.isActive ? "Active" : "Inactive"}
                                        color={row.isActive ? "success" : "default"}
                                    />
                                </Stack>

                                <Box>
                                    <Typography variant="caption" color="text.secondary">
                                        Project / Platform
                                    </Typography>

                                    <ProjectPlatformCell row={row} />
                                </Box>

                                <Box>
                                    <Typography variant="caption" color="text.secondary">
                                        Indicator
                                    </Typography>

                                    <Typography variant="body2" fontWeight={800}>
                                        {getIndicatorName(row)}
                                    </Typography>
                                </Box>

                                <Box>
                                    <Typography variant="caption" color="text.secondary">
                                        Account Limits
                                    </Typography>

                                    <Typography variant="body2" fontWeight={800}>
                                        Drawdown: {renderDrawdownEnabled(row)} ·{" "}
                                        {renderDrawdownPercent(row)}
                                    </Typography>

                                    <Typography variant="body2" fontWeight={800}>
                                        Profit: {renderProfitEnabled(row)} ·{" "}
                                        {renderProfitPercent(row)}
                                    </Typography>
                                </Box>

                                <Box>{renderActions(row)}</Box>
                            </Stack>
                        </Paper>
                    ))}

                    {rows.length === 0 && !loading && (
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
                                No account info found.
                            </Typography>
                        </Paper>
                    )}
                </Stack>
            </Box>
        );
    }

    return (
        <TableContainer
            component={Paper}
            sx={{
                height: "100%",
                minHeight: 0,
                maxHeight: "100%",
                borderRadius: 5,
                overflowX: "auto",
                overflowY: "auto",
                boxShadow: "none",
                border: "1px solid",
                borderColor: "divider",
                bgcolor: "background.paper",
            }}
        >
            <Table
                stickyHeader
                size="medium"
                sx={{
                    minWidth: 1450,
                    tableLayout: "fixed",
                    "& .MuiTableCell-root": {
                        py: 1.7,
                        borderColor: "divider",
                    },
                    "& .MuiTableHead-root .MuiTableCell-root": {
                        fontWeight: 900,
                        bgcolor: "background.paper",
                    },
                }}
            >
                <TableHead>
                    <TableRow>
                        <TableCell sx={{ width: 260 }}>Project / Platform</TableCell>
                        <TableCell sx={{ width: 160 }}>Indicator</TableCell>
                        <TableCell sx={{ width: 160 }}>Account Ref</TableCell>
                        <TableCell sx={{ width: 220 }}>Account Label</TableCell>
                        <TableCell sx={{ width: 150 }}>Drawdown Limit</TableCell>
                        <TableCell sx={{ width: 150 }}>Max Drawdown %</TableCell>
                        <TableCell sx={{ width: 130 }}>Profit Limit</TableCell>
                        <TableCell sx={{ width: 130 }}>Max Profit %</TableCell>
                        <TableCell sx={{ width: 120 }}>Status</TableCell>
                        <TableCell sx={{ width: 170 }} align="center">
                            Actions
                        </TableCell>
                    </TableRow>
                </TableHead>

                <TableBody>
                    {rows.map((row) => (
                        <TableRow key={row.id} hover>
                            <TableCell>
                                <ProjectPlatformCell row={row} />
                            </TableCell>

                            <TableCell>
                                <Typography variant="body2" fontWeight={800} noWrap>
                                    {getIndicatorName(row)}
                                </Typography>
                            </TableCell>

                            <TableCell>
                                <Typography variant="body2" noWrap>
                                    {row.accountRef ?? "-"}
                                </Typography>
                            </TableCell>

                            <TableCell>
                                <Typography variant="body2" fontWeight={800} noWrap>
                                    {row.accountLabel ?? "-"}
                                </Typography>
                            </TableCell>

                            <TableCell>
                                <Typography variant="body2" fontWeight={800} noWrap>
                                    {renderDrawdownEnabled(row)}
                                </Typography>
                            </TableCell>

                            <TableCell>
                                <Typography variant="body2" fontWeight={800} noWrap>
                                    {renderDrawdownPercent(row)}
                                </Typography>
                            </TableCell>

                            <TableCell>
                                <Typography variant="body2" fontWeight={800} noWrap>
                                    {renderProfitEnabled(row)}
                                </Typography>
                            </TableCell>

                            <TableCell>
                                <Typography variant="body2" fontWeight={800} noWrap>
                                    {renderProfitPercent(row)}
                                </Typography>
                            </TableCell>

                            <TableCell>
                                <StatusChip
                                    label={row.isActive ? "Active" : "Inactive"}
                                    color={row.isActive ? "success" : "default"}
                                />
                            </TableCell>

                            <TableCell align="center">{renderActions(row)}</TableCell>
                        </TableRow>
                    ))}

                    {rows.length === 0 && !loading && (
                        <TableRow>
                            <TableCell colSpan={10}>
                                <Box sx={{ py: 4, textAlign: "center" }}>
                                    <Typography variant="body2" color="text.secondary">
                                        No account info found.
                                    </Typography>
                                </Box>
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </TableContainer>
    );
}