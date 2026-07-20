import * as React from "react";

import {
    Box,
    Button,
    Divider,
    Grid,
    MenuItem,
    Stack,
    TextField,
    Typography,
} from "@mui/material";

import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";

import {
    useCreateMySymbolExecution,
    useUpdateMySymbolExecution,
} from "../hooks/useSymbolExecutions";

import { useAlertGroups } from "@/modules/core/alerts/hooks/useAlerts";

type AlertGroupOption = {
    groupId: string;
    symbol: string;
    timeFrame: string;
    indicatorProjectId: string;
    isActive?: boolean;
};

type Props = {
    mode?: "create" | "edit";
    userAccountInfoId: string;
    accountIndicatorProjectId: string;
    initial?: any;
    onSuccess?: () => void;
    onCancel?: () => void;
};

function parseNumber(raw: string) {
    const value = String(raw ?? "").trim().replace(",", ".");
    if (!value) return NaN;

    const number = Number(value);
    return Number.isFinite(number) ? number : NaN;
}

function uniqueSorted(values: string[]) {
    return [...new Set(values.filter(Boolean))].sort((a, b) =>
        a.localeCompare(b),
    );
}

function getGroupIndicatorProjectId(group: any) {
    return String(
        group?.indicatorProjectId ??
        group?.indicatorProject?.id ??
        group?.indicatorProject?._id ??
        "",
    );
}

export default function SymbolExecutionForm({
                                                mode = "create",
                                                userAccountInfoId,
                                                accountIndicatorProjectId,
                                                initial,
                                                onSuccess,
                                                onCancel,
                                            }: Props) {
    const create = useCreateMySymbolExecution();
    const update = useUpdateMySymbolExecution();

    const isEdit = mode === "edit";

    const { data: alertGroupsResp, isLoading: alertLoading } = useAlertGroups();

    const alertGroups: any[] = React.useMemo(() => {
        if (!alertGroupsResp) return [];
        if (Array.isArray(alertGroupsResp)) return alertGroupsResp;
        if (Array.isArray((alertGroupsResp as any).data)) {
            return (alertGroupsResp as any).data;
        }
        return [];
    }, [alertGroupsResp]);

    const [alertGroupId, setAlertGroupId] = React.useState("");
    const [selectedSymbol, setSelectedSymbol] = React.useState("");
    const [selectedTimeFrame, setSelectedTimeFrame] = React.useState("");

    const [contractSize, setContractSize] = React.useState("1");
    const [riskPercent, setRiskPercent] = React.useState("1");

    const [useStopLoss, setUseStopLoss] = React.useState(true);
    const [stopDistancePips, setStopDistancePips] = React.useState("0");

    const [useTakeProfit, setUseTakeProfit] = React.useState(true);
    const [returnRatio, setReturnRatio] = React.useState("2");

    const [useTrailingStop, setUseTrailingStop] = React.useState(false);
    const [atrPeriod, setAtrPeriod] = React.useState("14");
    const [atrMultiplier, setAtrMultiplier] = React.useState("1.5");

    const [useBreakEven, setUseBreakEven] = React.useState(true);
    const [closeTradesOnWeekend, setCloseTradesOnWeekend] =
        React.useState(false);

    const [isActive, setIsActive] = React.useState(true);

    const alertOptions: AlertGroupOption[] = React.useMemo(() => {
        const accountIpId = String(accountIndicatorProjectId ?? "").trim();

        return (alertGroups ?? [])
            .map((group) => {
                const indicatorProjectId = getGroupIndicatorProjectId(group);

                return {
                    groupId: String(group?.groupId ?? group?.id ?? ""),
                    symbol: String(group?.symbol ?? ""),
                    timeFrame: String(group?.timeFrame ?? ""),
                    indicatorProjectId,
                    isActive: group?.isActive,
                };
            })
            .filter((group) => {
                if (!group.groupId) return false;
                if (!group.symbol) return false;
                if (!group.timeFrame) return false;
                if (group.isActive === false) return false;
                if (!accountIpId) return false;

                return group.indicatorProjectId === accountIpId;
            });
    }, [alertGroups, accountIndicatorProjectId]);

    const symbolOptions = React.useMemo(() => {
        return uniqueSorted(alertOptions.map((item) => item.symbol));
    }, [alertOptions]);

    const timeFrameOptions = React.useMemo(() => {
        if (!selectedSymbol) return [];

        return uniqueSorted(
            alertOptions
                .filter((item) => item.symbol === selectedSymbol)
                .map((item) => item.timeFrame),
        );
    }, [alertOptions, selectedSymbol]);

    React.useEffect(() => {
        if (!initial) return;

        setAlertGroupId(String(initial.alertGroupId ?? ""));
        setSelectedSymbol(String(initial?.alertGroup?.symbol ?? ""));
        setSelectedTimeFrame(String(initial?.alertGroup?.timeFrame ?? ""));

        setContractSize(String(initial.contractSize ?? 1));
        setRiskPercent(String(initial.riskPercent ?? 1));

        setUseStopLoss(initial.useStopLoss !== false);
        setStopDistancePips(String(initial.stopDistancePips ?? 0));

        setUseTakeProfit(initial.useTakeProfit !== false);
        setReturnRatio(String(initial.returnRatio ?? 2));

        setUseTrailingStop(!!initial.useTrailingStop);
        setAtrPeriod(
            String(
                initial.atrPeriod && initial.atrPeriod !== 0
                    ? initial.atrPeriod
                    : 14,
            ),
        );
        setAtrMultiplier(
            String(
                initial.atrMultiplier && initial.atrMultiplier !== 0
                    ? initial.atrMultiplier
                    : 1.5,
            ),
        );

        setUseBreakEven(initial.useBreakEven !== false);
        setCloseTradesOnWeekend(!!initial.closeTradesOnWeekend);
        setIsActive(initial.isActive !== false);
    }, [initial]);

    React.useEffect(() => {
        if (isEdit) return;

        setSelectedSymbol("");
        setSelectedTimeFrame("");
        setAlertGroupId("");
    }, [accountIndicatorProjectId, userAccountInfoId, isEdit]);

    React.useEffect(() => {
        if (isEdit) return;

        if (!selectedSymbol || !selectedTimeFrame) {
            setAlertGroupId("");
            return;
        }

        const found = alertOptions.find(
            (item) =>
                item.symbol === selectedSymbol &&
                item.timeFrame === selectedTimeFrame,
        );

        setAlertGroupId(found?.groupId ?? "");
    }, [isEdit, selectedSymbol, selectedTimeFrame, alertOptions]);

    React.useEffect(() => {
        if (isEdit) return;

        if (!selectedSymbol) {
            setSelectedTimeFrame("");
            return;
        }

        if (!timeFrameOptions.includes(selectedTimeFrame)) {
            setSelectedTimeFrame("");
        }
    }, [isEdit, selectedSymbol, selectedTimeFrame, timeFrameOptions]);

    const pending = create.isPending || update.isPending;

    const symbolDisabled = isEdit || alertLoading || pending;

    const timeFrameDisabled =
        isEdit || alertLoading || pending || !selectedSymbol;

    const nContract = parseNumber(contractSize);
    const nRisk = parseNumber(riskPercent);
    const nStop = parseNumber(stopDistancePips);
    const nReturnRatio = parseNumber(returnRatio);
    const nAtrPeriod = parseNumber(atrPeriod);
    const nAtrMultiplier = parseNumber(atrMultiplier);

    const selectedAlertGroup = React.useMemo(() => {
        return alertOptions.find((item) => item.groupId === alertGroupId);
    }, [alertOptions, alertGroupId]);

    const disabled =
        alertLoading ||
        pending ||
        (!isEdit && (!userAccountInfoId || !alertGroupId)) ||
        !Number.isFinite(nContract) ||
        !Number.isFinite(nRisk) ||
        (useStopLoss && !Number.isFinite(nStop)) ||
        (useTakeProfit && !Number.isFinite(nReturnRatio)) ||
        (useTrailingStop &&
            (!Number.isFinite(nAtrPeriod) || !Number.isFinite(nAtrMultiplier)));

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();

        console.log("SUBSCRIPTION PAYLOAD DEBUG", {
            userAccountInfoId,
            alertGroupId,
            selectedSymbol,
            selectedTimeFrame,
            accountIndicatorProjectId,
            selectedAlertGroup,
            alertOptions,
        });

        const baseDto: any = {
            contractSize: nContract,
            riskPercent: nRisk,

            useStopLoss,
            stopDistancePips: useStopLoss ? nStop : 0,

            useTakeProfit,
            returnRatio: useTakeProfit ? nReturnRatio : 0,

            useTrailingStop,
            atrPeriod: useTrailingStop ? nAtrPeriod : 0,
            atrMultiplier: useTrailingStop ? nAtrMultiplier : 0,

            useBreakEven,
            closeTradesOnWeekend,
            isActive,
        };

        try {
            if (isEdit) {
                await update.mutateAsync({
                    id: initial.id,
                    dto: baseDto,
                });
            } else {
                await create.mutateAsync({
                    userAccountInfoId,
                    alertGroupId,
                    ...baseDto,
                });
            }

            onSuccess?.();
        } catch {
            // handled by hook
        }
    };

    return (
        <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{
                width: "100%",
                maxWidth: 680,
                mx: "auto",
                borderRadius: 4,
                border: "1px solid",
                borderColor: "divider",
                p: { xs: 1.5, sm: 2, md: 2.5 },
                bgcolor: "background.paper",
            }}
        >
            <Stack spacing={2.5}>
                <Stack
                    direction={{ xs: "column", sm: "row" }}
                    justifyContent="space-between"
                    alignItems={{ xs: "flex-start", sm: "center" }}
                    spacing={1.5}
                >
                    <Typography variant="h5" fontWeight={900}>
                        {isEdit ? "Edit subscription" : "Create subscription"}
                    </Typography>

                    <Button
                        size="small"
                        variant="outlined"
                        color="warning"
                        endIcon={<OpenInNewRoundedIcon fontSize="small" />}
                        onClick={() =>
                            window.open(
                                "https://www.myfxbook.com/forex-calculators/position-size",
                                "_blank",
                                "noopener,noreferrer",
                            )
                        }
                        sx={{
                            borderRadius: 999,
                            fontWeight: 900,
                            textTransform: "none",
                            whiteSpace: "nowrap",
                        }}
                    >
                        Open Risk Calculator
                    </Button>
                </Stack>

                <Divider />

                <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                            select
                            label="Symbol"
                            value={selectedSymbol}
                            onChange={(event) => setSelectedSymbol(event.target.value)}
                            fullWidth
                            required
                            disabled={symbolDisabled}
                            InputLabelProps={{ shrink: true }}
                        >
                            {!isEdit && <MenuItem value="">Select symbol</MenuItem>}

                            {symbolOptions.map((symbol) => (
                                <MenuItem key={symbol} value={symbol}>
                                    {symbol}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                            select
                            label="Timeframe"
                            value={selectedTimeFrame}
                            onChange={(event) => setSelectedTimeFrame(event.target.value)}
                            fullWidth
                            required
                            disabled={timeFrameDisabled}
                            InputLabelProps={{ shrink: true }}
                        >
                            {!isEdit && <MenuItem value="">Select timeframe</MenuItem>}

                            {timeFrameOptions.map((timeFrame) => (
                                <MenuItem key={timeFrame} value={timeFrame}>
                                    {timeFrame}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                            label="Contract size"
                            value={contractSize}
                            onChange={(event) => setContractSize(event.target.value)}
                            fullWidth
                            required
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                            label="Risk %"
                            value={riskPercent}
                            onChange={(event) => setRiskPercent(event.target.value)}
                            fullWidth
                            required
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                            select
                            label="Use Stop Loss"
                            value={useStopLoss ? "yes" : "no"}
                            onChange={(event) => setUseStopLoss(event.target.value === "yes")}
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                        >
                            <MenuItem value="yes">Yes</MenuItem>
                            <MenuItem value="no">No</MenuItem>
                        </TextField>
                    </Grid>

                    {useStopLoss && (
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                                label="Stop distance (pips)"
                                value={stopDistancePips}
                                onChange={(event) => setStopDistancePips(event.target.value)}
                                fullWidth
                                required
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                    )}

                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                            select
                            label="Use Take Profit"
                            value={useTakeProfit ? "yes" : "no"}
                            onChange={(event) =>
                                setUseTakeProfit(event.target.value === "yes")
                            }
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                        >
                            <MenuItem value="yes">Yes</MenuItem>
                            <MenuItem value="no">No</MenuItem>
                        </TextField>
                    </Grid>

                    {useTakeProfit && (
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                                label="Return ratio"
                                value={returnRatio}
                                onChange={(event) => setReturnRatio(event.target.value)}
                                fullWidth
                                required
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                    )}

                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                            select
                            label="Use Trailing Stop"
                            value={useTrailingStop ? "yes" : "no"}
                            onChange={(event) =>
                                setUseTrailingStop(event.target.value === "yes")
                            }
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                        >
                            <MenuItem value="yes">Yes</MenuItem>
                            <MenuItem value="no">No</MenuItem>
                        </TextField>
                    </Grid>

                    {useTrailingStop && (
                        <>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <TextField
                                    label="ATR Period"
                                    value={atrPeriod}
                                    onChange={(event) => setAtrPeriod(event.target.value)}
                                    fullWidth
                                    required
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>

                            <Grid size={{ xs: 12, sm: 6 }}>
                                <TextField
                                    label="ATR Multiplier"
                                    value={atrMultiplier}
                                    onChange={(event) => setAtrMultiplier(event.target.value)}
                                    fullWidth
                                    required
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>
                        </>
                    )}

                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                            select
                            label="Use Break Even"
                            value={useBreakEven ? "yes" : "no"}
                            onChange={(event) =>
                                setUseBreakEven(event.target.value === "yes")
                            }
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                        >
                            <MenuItem value="yes">Yes</MenuItem>
                            <MenuItem value="no">No</MenuItem>
                        </TextField>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                            select
                            label="Close trades on weekend"
                            value={closeTradesOnWeekend ? "yes" : "no"}
                            onChange={(event) =>
                                setCloseTradesOnWeekend(event.target.value === "yes")
                            }
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                        >
                            <MenuItem value="yes">Yes</MenuItem>
                            <MenuItem value="no">No</MenuItem>
                        </TextField>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                            select
                            label="Subscription status"
                            value={isActive ? "active" : "inactive"}
                            onChange={(event) =>
                                setIsActive(event.target.value === "active")
                            }
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                        >
                            <MenuItem value="active">Active</MenuItem>
                            <MenuItem value="inactive">Inactive</MenuItem>
                        </TextField>
                    </Grid>
                </Grid>

                <Divider />

                <Stack
                    direction="row"
                    justifyContent={{ xs: "stretch", sm: "flex-end" }}
                    spacing={1.5}
                    flexWrap="wrap"
                    useFlexGap
                >
                    <Button
                        variant="outlined"
                        color="warning"
                        onClick={onCancel}
                        disabled={pending}
                        sx={{
                            fontWeight: 900,
                            textTransform: "none",
                            minWidth: { xs: 100, sm: 120 },
                        }}
                    >
                        Cancel
                    </Button>

                    <Button
                        type="submit"
                        variant="contained"
                        color="warning"
                        disabled={disabled}
                        sx={{
                            fontWeight: 900,
                            textTransform: "none",
                            minWidth: { xs: 120, sm: 140 },
                        }}
                    >
                        {isEdit ? "Update" : "Subscribe"}
                    </Button>
                </Stack>
            </Stack>
        </Box>
    );
}