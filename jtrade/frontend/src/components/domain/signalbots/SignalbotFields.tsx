import * as React from "react";
import { Box, Button, MenuItem, TextField, Typography } from "@mui/material";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";

import type { Signalbot, SymbolExecution } from "@/types/signalbot";

/* ------------------------------------------------------------------ *
 *  Shared layout helpers
 * ------------------------------------------------------------------ */

/** Two-column responsive grid, same rhythm as the legacy account / execution forms. */
function FieldGrid({ children }: { children: React.ReactNode }) {
    return (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
            {children}
        </Box>
    );
}
function FullRow({ children }: { children: React.ReactNode }) {
    return <Box sx={{ gridColumn: { sm: "1 / -1" } }}>{children}</Box>;
}

function YesNo({
    label, value, onChange, disabled,
}: { label: string; value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
    return (
        <TextField
            select size="small" fullWidth label={label} disabled={disabled}
            value={value ? "yes" : "no"} InputLabelProps={{ shrink: true }}
            onChange={(e) => onChange(e.target.value === "yes")}
        >
            <MenuItem value="yes">Yes</MenuItem>
            <MenuItem value="no">No</MenuItem>
        </TextField>
    );
}

function NumberField({
    label, value, onChange, disabled, helperText, required,
}: { label: string; value: string; onChange: (v: string) => void; disabled?: boolean; helperText?: string; required?: boolean }) {
    return (
        <TextField
            size="small" fullWidth label={label} value={value} disabled={disabled} required={required}
            InputLabelProps={{ shrink: true }} helperText={helperText}
            onChange={(e) => onChange(e.target.value)}
        />
    );
}

function num(raw: string): number {
    const v = String(raw ?? "").trim().replace(",", ".");
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
}

/* ================================================================== *
 *  ACCOUNT  (from legacy user_account_info form)
 * ================================================================== */

export type AccountValues = {
    accountRef: string;
    accountLabel: string;
    canTrade: boolean;
    useDrawdownLimit: boolean;
    maxDrawdownPercent: string;
    useProfitLimit: boolean;
    maxProfitPercent: string;
    isActive: boolean;
};

export const emptyAccountValues: AccountValues = {
    accountRef: "",
    accountLabel: "",
    canTrade: true,
    useDrawdownLimit: false,
    maxDrawdownPercent: "0",
    useProfitLimit: false,
    maxProfitPercent: "0",
    isActive: true,
};

export function accountValuesFrom(bot: Signalbot): AccountValues {
    return {
        accountRef: bot.accountRef ?? "",
        accountLabel: bot.accountLabel ?? "",
        canTrade: bot.canTrade !== false,
        useDrawdownLimit: !!bot.useDrawdownLimit,
        maxDrawdownPercent: String(bot.maxDrawdownPercent ?? 0),
        useProfitLimit: !!bot.useProfitLimit,
        maxProfitPercent: String(bot.maxProfitPercent ?? 0),
        isActive: bot.isActive !== false,
    };
}

/** Payload for CreateSignalbotDto / UpdateSignalbotDto (no extra keys — backend forbids them). */
export function accountPayload(v: AccountValues, opts: { withStatus?: boolean } = {}): Record<string, unknown> {
    const p: Record<string, unknown> = {
        accountRef: v.accountRef.trim(),
        accountLabel: v.accountLabel.trim(),
        canTrade: v.canTrade,
        useDrawdownLimit: v.useDrawdownLimit,
        maxDrawdownPercent: v.useDrawdownLimit ? num(v.maxDrawdownPercent) : 0,
        useProfitLimit: v.useProfitLimit,
        maxProfitPercent: v.useProfitLimit ? num(v.maxProfitPercent) : 0,
    };
    if (opts.withStatus) p.isActive = v.isActive;
    return p;
}

export function accountValid(v: AccountValues): boolean {
    return v.accountRef.trim().length > 0 && v.accountLabel.trim().length > 0;
}

export function AccountFields({
    values, onChange, disabled, showStatus = false,
}: {
    values: AccountValues;
    onChange: (patch: Partial<AccountValues>) => void;
    disabled?: boolean;
    showStatus?: boolean;
}) {
    return (
        <FieldGrid>
            <TextField
                size="small" fullWidth required label="Account number" disabled={disabled}
                value={values.accountRef} InputLabelProps={{ shrink: true }}
                placeholder="709854" helperText="Trading account reference."
                onChange={(e) => onChange({ accountRef: e.target.value })}
            />
            <TextField
                size="small" fullWidth required label="Account label" disabled={disabled}
                value={values.accountLabel} InputLabelProps={{ shrink: true }}
                placeholder="Main MT5 account" helperText="Example: My MT5 account."
                onChange={(e) => onChange({ accountLabel: e.target.value })}
            />

            <YesNo label="Allow trading" value={values.canTrade} disabled={disabled}
                onChange={(v) => onChange({ canTrade: v })} />
            {showStatus ? (
                <TextField
                    select size="small" fullWidth label="Status" disabled={disabled}
                    value={values.isActive ? "active" : "inactive"} InputLabelProps={{ shrink: true }}
                    onChange={(e) => onChange({ isActive: e.target.value === "active" })}
                >
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="inactive">Inactive</MenuItem>
                </TextField>
            ) : <Box />}

            <YesNo label="Use drawdown limit" value={values.useDrawdownLimit} disabled={disabled}
                onChange={(v) => onChange({ useDrawdownLimit: v })} />
            {values.useDrawdownLimit
                ? <NumberField label="Max drawdown %" value={values.maxDrawdownPercent} required disabled={disabled}
                    onChange={(v) => onChange({ maxDrawdownPercent: v })} />
                : <Box />}

            <YesNo label="Use profit limit" value={values.useProfitLimit} disabled={disabled}
                onChange={(v) => onChange({ useProfitLimit: v })} />
            {values.useProfitLimit
                ? <NumberField label="Max profit %" value={values.maxProfitPercent} required disabled={disabled}
                    onChange={(v) => onChange({ maxProfitPercent: v })} />
                : <Box />}
        </FieldGrid>
    );
}

/* ================================================================== *
 *  EXECUTION  (from legacy symbol_executions form)
 * ================================================================== */

export type ExecValues = {
    contractSize: string;
    riskPercent: string;
    useStopLoss: boolean;
    stopDistancePips: string;
    useTakeProfit: boolean;
    returnRatio: string;
    useTrailingStop: boolean;
    atrPeriod: string;
    atrMultiplier: string;
    useBreakEven: boolean;
    closeTradesOnWeekend: boolean;
    isActive: boolean;
};

export const defaultExecValues: ExecValues = {
    contractSize: "1",
    riskPercent: "1",
    useStopLoss: true,
    stopDistancePips: "0",
    useTakeProfit: true,
    returnRatio: "2",
    useTrailingStop: false,
    atrPeriod: "14",
    atrMultiplier: "1.5",
    useBreakEven: true,
    closeTradesOnWeekend: false,
    isActive: true,
};

export function execValuesFrom(e: SymbolExecution): ExecValues {
    return {
        contractSize: String(e.contractSize ?? 1),
        riskPercent: String(e.riskPercent ?? 1),
        useStopLoss: e.useStopLoss !== false,
        stopDistancePips: String(e.stopDistancePips ?? 0),
        useTakeProfit: e.useTakeProfit !== false,
        returnRatio: String(e.returnRatio ?? 2),
        useTrailingStop: !!e.useTrailingStop,
        atrPeriod: String(e.atrPeriod || 14),
        atrMultiplier: String(e.atrMultiplier || 1.5),
        useBreakEven: e.useBreakEven !== false,
        closeTradesOnWeekend: !!e.closeTradesOnWeekend,
        isActive: e.isActive !== false,
    };
}

/** Payload for ExecutionDto / UpdateExecutionDto. */
export function execPayload(v: ExecValues): Record<string, unknown> {
    return {
        contractSize: num(v.contractSize),
        riskPercent: num(v.riskPercent),
        useStopLoss: v.useStopLoss,
        stopDistancePips: v.useStopLoss ? num(v.stopDistancePips) : 0,
        useTakeProfit: v.useTakeProfit,
        returnRatio: v.useTakeProfit ? num(v.returnRatio) : 0,
        useTrailingStop: v.useTrailingStop,
        atrPeriod: v.useTrailingStop ? num(v.atrPeriod) : 0,
        atrMultiplier: v.useTrailingStop ? num(v.atrMultiplier) : 0,
        useBreakEven: v.useBreakEven,
        closeTradesOnWeekend: v.closeTradesOnWeekend,
        isActive: v.isActive,
    };
}

export function ExecutionFields({
    values, onChange, disabled, showStatus = true,
}: {
    values: ExecValues;
    onChange: (patch: Partial<ExecValues>) => void;
    disabled?: boolean;
    showStatus?: boolean;
}) {
    return (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                <Button
                    size="small" variant="outlined" color="warning" endIcon={<OpenInNewRoundedIcon fontSize="small" />}
                    onClick={() => window.open("https://www.myfxbook.com/forex-calculators/position-size", "_blank", "noopener,noreferrer")}
                    sx={{ textTransform: "none", fontWeight: 700 }}
                >
                    Risk calculator
                </Button>
            </Box>

            <FieldGrid>
                <NumberField label="Contract size" value={values.contractSize} required disabled={disabled}
                    onChange={(v) => onChange({ contractSize: v })} />
                <NumberField label="Risk %" value={values.riskPercent} required disabled={disabled}
                    onChange={(v) => onChange({ riskPercent: v })} />

                <YesNo label="Use stop loss" value={values.useStopLoss} disabled={disabled}
                    onChange={(v) => onChange({ useStopLoss: v })} />
                {values.useStopLoss
                    ? <NumberField label="Stop distance (pips)" value={values.stopDistancePips} required disabled={disabled}
                        onChange={(v) => onChange({ stopDistancePips: v })} />
                    : <Box />}

                <YesNo label="Use take profit" value={values.useTakeProfit} disabled={disabled}
                    onChange={(v) => onChange({ useTakeProfit: v })} />
                {values.useTakeProfit
                    ? <NumberField label="Return ratio" value={values.returnRatio} required disabled={disabled}
                        onChange={(v) => onChange({ returnRatio: v })} />
                    : <Box />}

                <YesNo label="Use trailing stop" value={values.useTrailingStop} disabled={disabled}
                    onChange={(v) => onChange({ useTrailingStop: v })} />
                <Box />
                {values.useTrailingStop && (
                    <>
                        <NumberField label="ATR period" value={values.atrPeriod} required disabled={disabled}
                            onChange={(v) => onChange({ atrPeriod: v })} />
                        <NumberField label="ATR multiplier" value={values.atrMultiplier} required disabled={disabled}
                            onChange={(v) => onChange({ atrMultiplier: v })} />
                    </>
                )}

                <YesNo label="Use break even" value={values.useBreakEven} disabled={disabled}
                    onChange={(v) => onChange({ useBreakEven: v })} />
                <YesNo label="Close trades on weekend" value={values.closeTradesOnWeekend} disabled={disabled}
                    onChange={(v) => onChange({ closeTradesOnWeekend: v })} />

                {showStatus && (
                    <TextField
                        select size="small" fullWidth label="Status" disabled={disabled}
                        value={values.isActive ? "active" : "inactive"} InputLabelProps={{ shrink: true }}
                        onChange={(e) => onChange({ isActive: e.target.value === "active" })}
                    >
                        <MenuItem value="active">Active</MenuItem>
                        <MenuItem value="inactive">Inactive</MenuItem>
                    </TextField>
                )}
            </FieldGrid>

            <Typography variant="caption" color="text.disabled">
                Values are per symbol. Stop / take-profit / ATR inputs are ignored when their toggle is off.
            </Typography>
        </Box>
    );
}
