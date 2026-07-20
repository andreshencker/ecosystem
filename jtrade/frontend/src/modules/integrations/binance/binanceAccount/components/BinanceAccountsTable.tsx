// src/modules/integrations/binance/binanceAccount/components/BinanceAccountsTable.tsx
import * as React from "react";
import {
    Avatar,
    Box,
    IconButton,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tooltip,
    Typography,
    useMediaQuery,
    useTheme,
} from "@mui/material";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import StarBorderRoundedIcon from "@mui/icons-material/StarBorderRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";

import type {BinanceAccount} from "@/modules/integrations/binance/binanceAccount/types/binanceAccounts";
import ConfirmDeleteButton from "@/app/common/components/ConfirmDeleteButton";
import StatusChip from "@/app/common/components/StatusChip";

type Props = {
    rows: BinanceAccount[];
    loading?: boolean;

    onRefresh?: () => void;
    onSetDefault?: (row: BinanceAccount) => void;
    onToggleActive?: (row: BinanceAccount) => void;
    onEdit?: (row: BinanceAccount) => void;
    onDelete?: (row: BinanceAccount) => void;
};

export default function BinanceAccountsTable({
                                                 rows,
                                                 loading,
                                                 onRefresh,
                                                 onSetDefault,
                                                 onToggleActive,
                                                 onEdit,
                                                 onDelete,
                                             }: Props) {
    const theme = useTheme();
    const isSmall = useMediaQuery(theme.breakpoints.down("sm"));

    // --- helpers ---

    const renderStatusChips = (row: BinanceAccount) => (
        <>
            <StatusChip
                label={row.isActive ? "Active" : "Inactive"}
                color={row.isActive ? "success" : "default"}
                dense
                onClick={onToggleActive ? () => onToggleActive(row) : undefined}
            />

            {row.isDefault && (
                <StatusChip label="Default" color="success" dense/>
            )}
        </>
    );

    const renderDefaultStar = (row: BinanceAccount) => {
        if (row.isDefault) {
            return (
                <Tooltip title="Default account">
          <span>
            <IconButton size="small" disabled>
              <StarRoundedIcon fontSize="small"/>
            </IconButton>
          </span>
                </Tooltip>
            );
        }

        if (!onSetDefault) {
            return (
                <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{opacity: 0.7}}
                >
                    —
                </Typography>
            );
        }

        return (
            <Tooltip title="Set as default">
                <IconButton size="small" onClick={() => onSetDefault(row)}>
                    <StarBorderRoundedIcon fontSize="small"/>
                </IconButton>
            </Tooltip>
        );
    };

    const renderActions = (row: BinanceAccount) => (
        <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            justifyContent="flex-end"
        >
            {onEdit && (
                <Tooltip title="Edit">
          <span>
            <IconButton size="small" onClick={() => onEdit(row)}>
              <EditRoundedIcon fontSize="small"/>
            </IconButton>
          </span>
                </Tooltip>
            )}

            {onDelete && (
                <ConfirmDeleteButton
                    size="small"
                    variant="outlined"
                    itemLabel={row.description || row.id}
                    label="Delete"
                    onConfirm={() => onDelete(row)}
                />
            )}
        </Stack>
    );

    const renderCreatedAt = (row: BinanceAccount) => (
        <Typography variant="body2">
            {row.createdAt
                ? new Date(row.createdAt).toLocaleDateString()
                : "—"}
        </Typography>
    );

    // --- render ---

    return (
        <Box>
            {/* Header */}
            <Box
                sx={{
                    mb: 1.5,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 1,
                }}
            >
                <Box>

                </Box>

                <Tooltip title="Reload">
          <span>
            <IconButton size="small" onClick={onRefresh} disabled={loading}>
              <RefreshRoundedIcon
                  fontSize="small"
                  sx={{
                      transform: loading ? "rotate(90deg)" : "none",
                      transition: "transform 0.2s ease-out",
                  }}
              />
            </IconButton>
          </span>
                </Tooltip>
            </Box>

            {/* MOBILE: cards */}
            {isSmall ? (
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
                                bgcolor: theme.palette.background.paper,
                            }}
                        >
                            {/* Header card */}
                            <Stack direction="row" spacing={1.5} alignItems="center">
                                <Avatar sx={{width: 32, height: 32}}>
                                    {row.description?.[0]?.toUpperCase() ?? "A"}
                                </Avatar>
                                <Box sx={{minWidth: 0, flex: 1}}>
                                    <Typography variant="body2" fontWeight={600} noWrap>
                                        {row.description || "No description"}
                                    </Typography>
                                    <Typography
                                        variant="caption"
                                        color="text.secondary"
                                        noWrap
                                    >
                                        ID: {row.id}
                                    </Typography>
                                </Box>

                                {/* estrella default */}
                                {renderDefaultStar(row)}
                            </Stack>

                            {/* chips */}
                            <Stack
                                direction="row"
                                flexWrap="wrap"
                                spacing={1}
                                rowGap={1}
                                sx={{mt: 1.2, mb: 1}}
                            >
                                {renderStatusChips(row)}

                                <StatusChip
                                    label={
                                        row.createdAt
                                            ? new Date(row.createdAt).toLocaleDateString()
                                            : "No date"
                                    }
                                    color="default"
                                    dense
                                />
                            </Stack>

                            {/* acciones */}
                            <Stack
                                direction="row"
                                justifyContent="flex-end"
                                alignItems="center"
                            >
                                {renderActions(row)}
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
                                You don’t have any Binance API accounts yet.
                            </Typography>
                        </Paper>
                    )}
                </Stack>
            ) : (
                // DESKTOP: tabla
                <TableContainer
                    component={Paper}
                    sx={{
                        borderRadius: 3,
                        overflowX: "auto",
                        boxShadow: "none",
                    }}
                >
                    <Table
                        size="medium"
                        sx={{
                            minWidth: 720,
                        }}
                    >
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{width: "35%"}}>Description</TableCell>
                                <TableCell sx={{width: "20%"}}>Status</TableCell>
                                <TableCell sx={{width: "15%"}}>Created at</TableCell>
                                <TableCell sx={{width: "10%"}} align="center">
                                    Default
                                </TableCell>
                                <TableCell sx={{width: "20%"}} align="right">
                                    Actions
                                </TableCell>
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    hover
                                    sx={{
                                        "&:last-of-type td, &:last-of-type th": {
                                            borderBottom: 0,
                                        },
                                    }}
                                >
                                    {/* Description */}
                                    <TableCell>
                                        <Typography variant="body2" fontWeight={600} noWrap>
                                            {row.description || "No description"}
                                        </Typography>
                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                            noWrap
                                        >
                                            ID: {row.id}
                                        </Typography>
                                    </TableCell>

                                    {/* Status */}
                                    <TableCell>
                                        <Stack
                                            direction="row"
                                            alignItems="center"
                                            spacing={1}
                                            flexWrap="wrap"
                                            rowGap={1}
                                        >
                                            {renderStatusChips(row)}
                                        </Stack>
                                    </TableCell>

                                    {/* Created at */}
                                    <TableCell>{renderCreatedAt(row)}</TableCell>

                                    {/* Default */}
                                    <TableCell align="center">
                                        {renderDefaultStar(row)}
                                    </TableCell>

                                    {/* Actions */}
                                    <TableCell align="right">{renderActions(row)}</TableCell>
                                </TableRow>
                            ))}

                            {rows.length === 0 && !loading && (
                                <TableRow>
                                    <TableCell colSpan={5}>
                                        <Box sx={{py: 4, textAlign: "center"}}>
                                            <Typography variant="body2" color="text.secondary">
                                                You don’t have any Binance API accounts yet.
                                            </Typography>
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Box>
    );
}