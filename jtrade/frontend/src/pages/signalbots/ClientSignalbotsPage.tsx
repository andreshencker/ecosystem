import * as React from "react";
import {
    Box, Button, Chip, Divider, IconButton, MenuItem, Stack, Switch, TextField, Tooltip, Typography,
} from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/Add";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { FormDrawer } from "@/components/shared/FormDrawer";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingButton } from "@/components/shared/LoadingButton";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import CopyableCode from "@/components/shared/CopyableCode";
import {
    AccountFields, ExecutionFields,
    emptyAccountValues, accountValuesFrom, accountPayload, accountValid,
    defaultExecValues, execValuesFrom, execPayload,
    type AccountValues, type ExecValues,
} from "@/components/domain/signalbots/SignalbotFields";

import {
    useAddExecution, useAvailableChannels, useCreateSignalbot, useDeleteSignalbot, useProductChannels,
    useRemoveExecution, useRotateSignalbotToken, useSignalbots, useUpdateExecution, useUpdateSignalbot,
} from "@/hooks/api/useSignalbots";
import { useMarketplaceProducts } from "@/hooks/api/useProducts";
import type { Signalbot, SymbolExecution } from "@/types/signalbot";

/** This page is the client surface for the first-party Signal Bot (MT5). Each row = one MT5 account. */
const PRODUCT_KEY = "signal-bot-mt5";

const accountName = (b: Signalbot) => b.accountLabel?.trim() || b.accountRef?.trim() || "Account";

const limitsLabel = (b: Signalbot) => {
    const parts: string[] = [];
    if (b.useDrawdownLimit) parts.push(`Drawdown ${b.maxDrawdownPercent}%`);
    if (b.useProfitLimit) parts.push(`Profit ${b.maxProfitPercent}%`);
    return parts.join(" · ") || "—";
};

export default function ClientSignalbotsPage() {
    const q = useSignalbots();
    const productsQ = useMarketplaceProducts();
    const bots = q.data ?? [];
    const products = productsQ.data ?? [];

    // The single native product this page manages accounts for.
    const product = React.useMemo(
        () => products.find((p) => p.key === PRODUCT_KEY) ?? products.find((p) => p.native) ?? null,
        [products],
    );

    const createMut = useCreateSignalbot();
    const updateMut = useUpdateSignalbot();
    const rotateMut = useRotateSignalbotToken();
    const deleteMut = useDeleteSignalbot();
    const addExecMut = useAddExecution();
    const updateExecMut = useUpdateExecution();
    const removeExecMut = useRemoveExecution();

    // ── new account ──
    const [creating, setCreating] = React.useState(false);
    const [newAcct, setNewAcct] = React.useState<AccountValues>(emptyAccountValues);
    const [newChannelId, setNewChannelId] = React.useState("");
    const [newExec, setNewExec] = React.useState<ExecValues>(defaultExecValues);
    const patchNewAcct = (patch: Partial<AccountValues>) => setNewAcct((s) => ({ ...s, ...patch }));
    const patchNewExec = (patch: Partial<ExecValues>) => setNewExec((s) => ({ ...s, ...patch }));
    const newChannelsQ = useProductChannels(creating ? product?._id : undefined);
    const newChannels = newChannelsQ.data ?? [];

    const openCreate = () => {
        setNewAcct(emptyAccountValues);
        setNewChannelId("");
        setNewExec(defaultExecValues);
        setCreating(true);
    };
    const submitCreate = async () => {
        if (!product || !accountValid(newAcct)) return;
        const created = await createMut.mutateAsync({ productId: product._id, ...accountPayload(newAcct) });
        if (newChannelId) {
            await addExecMut.mutateAsync({ id: created._id, data: { channelId: newChannelId, ...execPayload(newExec) } });
        }
        setCreating(false);
    };

    // ── detail ──
    const [openId, setOpenId] = React.useState<string | null>(null);
    const bot = openId ? bots.find((b) => b._id === openId) ?? null : null;
    const [acct, setAcct] = React.useState<AccountValues>(emptyAccountValues);
    const patchAcct = (patch: Partial<AccountValues>) => setAcct((s) => ({ ...s, ...patch }));
    React.useEffect(() => {
        if (bot) setAcct(accountValuesFrom(bot));
    }, [bot]);
    const saveAccount = () => {
        if (bot && accountValid(acct)) updateMut.mutate({ id: bot._id, data: accountPayload(acct) });
    };

    const [pendingDelete, setPendingDelete] = React.useState<Signalbot | null>(null);

    // ── add / edit symbol ──
    const channelsQ = useAvailableChannels(bot?._id);
    const channels = channelsQ.data ?? [];
    const [symDrawer, setSymDrawer] = React.useState<null | { mode: "add" | "edit"; channelId: string }>(null);
    const [exec, setExec] = React.useState<ExecValues>(defaultExecValues);
    const patchExec = (patch: Partial<ExecValues>) => setExec((s) => ({ ...s, ...patch }));
    const openAddSym = () => {
        const avail = channels.find((c) => !c.alreadyAdded);
        setSymDrawer({ mode: "add", channelId: avail?.channelId ?? "" });
        setExec(defaultExecValues);
    };
    const openEditSym = (e: SymbolExecution) => {
        setSymDrawer({ mode: "edit", channelId: e.channelId });
        setExec(execValuesFrom(e));
    };
    const submitSym = async () => {
        if (!bot || !symDrawer?.channelId) return;
        if (symDrawer.mode === "add") {
            await addExecMut.mutateAsync({ id: bot._id, data: { channelId: symDrawer.channelId, ...execPayload(exec) } });
        } else {
            await updateExecMut.mutateAsync({ id: bot._id, channelId: symDrawer.channelId, data: execPayload(exec) });
        }
        setSymDrawer(null);
    };

    const columns: GridColDef[] = [
        { field: "accountRef", headerName: "Account", width: 150, valueGetter: (_v, row: Signalbot) => row.accountRef ?? "—" },
        { field: "accountLabel", headerName: "Label", flex: 1, minWidth: 140, valueGetter: (_v, row: Signalbot) => row.accountLabel ?? "—" },
        {
            field: "canTrade", headerName: "Trading", width: 100,
            renderCell: (p) => <Chip size="small" variant="outlined" color={p.value ? "success" : "default"} label={p.value ? "On" : "Off"} />,
        },
        { field: "limits", headerName: "Limits", width: 190, sortable: false, valueGetter: (_v, row: Signalbot) => limitsLabel(row) },
        {
            field: "isActive", headerName: "Status", width: 110,
            renderCell: (p) => <Chip size="small" variant="outlined" color={p.value ? "success" : "default"} label={p.value ? "Active" : "Paused"} />,
        },
        { field: "symbolExecutions", headerName: "Symbols", width: 90, valueGetter: (_v, row: Signalbot) => row.symbolExecutions.length },
    ];

    const channelName = (channelId: string) => {
        const c = channels.find((x) => x.channelId === channelId);
        return c ? `${c.symbol} ${c.timeframe}` : channelId;
    };

    return (
        <>
            <PageHeader
                title="My accounts"
                count={bots.length}
                subtitle="MT5 accounts connected to the Signal Bot, and how each one trades."
                actions={
                    <LoadingButton
                        variant="contained" startIcon={<AddIcon />} onClick={openCreate}
                        disabled={!product}
                        sx={{ textTransform: "none", fontWeight: 700 }}
                    >
                        New account
                    </LoadingButton>
                }
            />

            <DataTable<Signalbot>
                columns={columns}
                rows={bots}
                total={bots.length}
                page={0}
                pageSize={50}
                onPageChange={() => {}}
                onPageSizeChange={() => {}}
                loading={q.isFetching}
                getRowId={(row) => row._id}
                onRowClick={(row) => setOpenId(row._id)}
                rowActions={(row) => (
                    <>
                        <Tooltip title="Edit">
                            <IconButton size="small" onClick={() => setOpenId(row._id)}>
                                <EditOutlinedIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                            <IconButton size="small" color="error" onClick={() => setPendingDelete(row)}>
                                <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </>
                )}
                error={q.isError ? (q.error as Error) : null}
                emptyState={<EmptyState title="No accounts yet" description="Connect an MT5 account to start receiving signals." />}
                mobileCardConfig={{
                    primaryText: (row) => row.accountRef ?? "—",
                    secondaryText: (row) => row.accountLabel ?? "—",
                    badge: (row) => <Chip size="small" color={row.isActive ? "success" : "default"} label={row.isActive ? "Active" : "Paused"} />,
                    fields: [
                        { field: "canTrade", label: "Trading", render: (v) => (v ? "On" : "Off") },
                        { field: "symbolExecutions", label: "Symbols", render: (v) => String((v as unknown[]).length) },
                    ],
                }}
            />

            {/* ── new account ── */}
            <FormDrawer open={creating} onClose={() => setCreating(false)} title="New account" width={560}>
                <Stack spacing={2.5}>
                    <Divider textAlign="left"><Typography variant="caption" fontWeight={700} color="text.secondary">ACCOUNT</Typography></Divider>
                    <AccountFields values={newAcct} onChange={patchNewAcct} disabled={createMut.isPending} />

                    <Divider textAlign="left"><Typography variant="caption" fontWeight={700} color="text.secondary">SYMBOL</Typography></Divider>
                    <TextField
                        select label="Channel" value={newChannelId} fullWidth size="small" InputLabelProps={{ shrink: true }}
                        helperText="Optional — you can add symbols later from the account."
                        onChange={(e) => setNewChannelId(e.target.value)}
                    >
                        <MenuItem value=""><em>None for now</em></MenuItem>
                        {newChannels.map((c) => (
                            <MenuItem key={c.channelId} value={c.channelId}>{c.symbol} {c.timeframe} · {c.indicatorName}</MenuItem>
                        ))}
                    </TextField>
                    {newChannelId && (
                        <ExecutionFields values={newExec} onChange={patchNewExec} disabled={createMut.isPending} />
                    )}

                    <Stack direction="row" justifyContent="flex-end" spacing={1.5}>
                        <Button variant="outlined" color="inherit" onClick={() => setCreating(false)} sx={{ textTransform: "none", fontWeight: 800 }}>Cancel</Button>
                        <LoadingButton variant="contained" loading={createMut.isPending || addExecMut.isPending} disabled={!product || !accountValid(newAcct)}
                            onClick={submitCreate} sx={{ textTransform: "none", fontWeight: 800 }}>Create</LoadingButton>
                    </Stack>
                </Stack>
            </FormDrawer>

            {/* ── detail ── */}
            <FormDrawer
                open={!!bot} onClose={() => setOpenId(null)}
                title={bot ? accountName(bot) : "Account"}
                width={560}
            >
                {bot && (
                    <Stack spacing={3}>
                        <Box>
                            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                                <Switch size="small" checked={bot.isActive}
                                    onChange={(e) => updateMut.mutate({ id: bot._id, data: { isActive: e.target.checked } })} />
                                <Typography variant="body2">{bot.isActive ? "Active" : "Paused"}</Typography>
                            </Stack>
                            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
                                EA token — put this in your EA config
                            </Typography>
                            <CopyableCode value={bot.token} label="token" full />
                            <LoadingButton
                                variant="outlined" color="warning" size="small" startIcon={<AutorenewIcon />}
                                loading={rotateMut.isPending} onClick={() => rotateMut.mutate(bot._id)}
                                sx={{ mt: 1, textTransform: "none", fontWeight: 700 }}
                            >
                                Rotate token
                            </LoadingButton>
                        </Box>

                        <Divider />

                        <Box>
                            <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1.5 }}>Account settings</Typography>
                            <AccountFields values={acct} onChange={patchAcct} disabled={updateMut.isPending} showStatus />
                            <LoadingButton variant="contained" size="small" loading={updateMut.isPending}
                                disabled={!accountValid(acct)} onClick={saveAccount}
                                sx={{ mt: 2, textTransform: "none", fontWeight: 700 }}>
                                Save
                            </LoadingButton>
                        </Box>

                        <Divider />

                        <Box>
                            <Stack direction="row" alignItems="center" justifyContent="space-between"
                                sx={{ mb: 1.5, flexWrap: "wrap", rowGap: 1 }}>
                                <Typography variant="subtitle2" fontWeight={800}>Symbols ({bot.symbolExecutions.length})</Typography>
                                <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={openAddSym}
                                    disabled={channels.length > 0 && channels.every((c) => c.alreadyAdded)}
                                    sx={{ textTransform: "none", fontWeight: 700 }}>
                                    Add symbol
                                </Button>
                            </Stack>
                            {bot.symbolExecutions.length === 0 ? (
                                <Typography variant="caption" color="text.disabled">No symbols yet.</Typography>
                            ) : (
                                <Stack spacing={1}>
                                    {bot.symbolExecutions.map((e) => (
                                        <Box key={e.channelId} sx={{
                                            display: "flex", alignItems: "center", gap: 0.5,
                                            border: "1px solid", borderColor: "divider", borderRadius: 2,
                                            pl: 1.5, pr: 0.5, py: 0.5,
                                        }}>
                                            <Box sx={{ minWidth: 0, flex: 1 }}>
                                                <Typography variant="body2" fontWeight={700} fontFamily="monospace" noWrap>
                                                    {e.symbol}{" "}
                                                    <Box component="span" sx={{ color: "text.secondary", fontWeight: 500 }}>{e.timeFrame}</Box>
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">Risk {e.riskPercent}%</Typography>
                                            </Box>
                                            <Switch size="small" checked={e.isActive}
                                                onChange={(ev) => updateExecMut.mutate({ id: bot._id, channelId: e.channelId, data: { isActive: ev.target.checked } })} />
                                            <IconButton size="small" aria-label="Edit symbol" onClick={() => openEditSym(e)}>
                                                <EditOutlinedIcon fontSize="small" />
                                            </IconButton>
                                            <IconButton size="small" aria-label="Remove symbol"
                                                onClick={() => removeExecMut.mutate({ id: bot._id, channelId: e.channelId })}>
                                                <DeleteOutlineIcon fontSize="small" />
                                            </IconButton>
                                        </Box>
                                    ))}
                                </Stack>
                            )}
                        </Box>

                        <Divider />
                        <Button variant="text" color="error" startIcon={<DeleteOutlineIcon />} onClick={() => setPendingDelete(bot)}
                            sx={{ alignSelf: "flex-start", textTransform: "none", fontWeight: 700 }}>
                            Delete account
                        </Button>
                    </Stack>
                )}
            </FormDrawer>

            {/* ── add / edit symbol ── */}
            <FormDrawer
                open={!!symDrawer} onClose={() => setSymDrawer(null)}
                title={symDrawer?.mode === "edit" ? "Edit symbol" : "Add symbol"}
                width={520}
            >
                {bot && symDrawer && (
                    <Stack spacing={2.5}>
                        {symDrawer.mode === "add" ? (
                            <TextField
                                select label="Channel" value={symDrawer.channelId} fullWidth size="small" InputLabelProps={{ shrink: true }}
                                helperText="Symbol · timeframe published by the product's indicator."
                                onChange={(e) => setSymDrawer({ ...symDrawer, channelId: e.target.value })}
                            >
                                {channels.filter((c) => !c.alreadyAdded).map((c) => (
                                    <MenuItem key={c.channelId} value={c.channelId}>{c.symbol} {c.timeframe} · {c.indicatorName}</MenuItem>
                                ))}
                            </TextField>
                        ) : (
                            <Typography variant="body1" fontWeight={700} fontFamily="monospace">{channelName(symDrawer.channelId)}</Typography>
                        )}

                        <ExecutionFields values={exec} onChange={patchExec}
                            disabled={addExecMut.isPending || updateExecMut.isPending} />

                        <Stack direction="row" justifyContent="flex-end" spacing={1.5}>
                            <Button variant="outlined" color="inherit" onClick={() => setSymDrawer(null)} sx={{ textTransform: "none", fontWeight: 800 }}>Cancel</Button>
                            <LoadingButton variant="contained" loading={addExecMut.isPending || updateExecMut.isPending}
                                disabled={!symDrawer.channelId} onClick={submitSym}
                                sx={{ textTransform: "none", fontWeight: 800 }}>
                                {symDrawer.mode === "edit" ? "Save" : "Add"}
                            </LoadingButton>
                        </Stack>
                    </Stack>
                )}
            </FormDrawer>

            <ConfirmDialog
                open={!!pendingDelete}
                title="Delete account"
                description={pendingDelete ? `The Signal Bot config for account ${pendingDelete.accountRef ?? "—"} will be removed.` : undefined}
                confirmLabel="Delete"
                danger
                loading={deleteMut.isPending}
                onConfirm={async () => { if (pendingDelete) { await deleteMut.mutateAsync(pendingDelete._id); setPendingDelete(null); setOpenId(null); } }}
                onCancel={() => setPendingDelete(null)}
            />
        </>
    );
}
