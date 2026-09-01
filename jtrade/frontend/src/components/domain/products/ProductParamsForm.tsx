import * as React from "react";
import { FormControlLabel, MenuItem, Stack, Switch, TextField, Typography } from "@mui/material";

import type { ProductParam, ProductParamRepeat } from "@/types/products";

type Values = Record<string, unknown>;

/**
 * Renders the client-facing form for a set of product params. Reused by the
 * provider's preview and (later) the client's real config screen.
 */
export default function ProductParamsForm({
    params,
    repeat,
    values,
    onChange,
    disabled = false,
}: {
    params: ProductParam[];
    /** Which subset to render — "once" (account) or "per-symbol". */
    repeat: ProductParamRepeat;
    values: Values;
    onChange: (key: string, value: unknown) => void;
    disabled?: boolean;
}) {
    const shown = params.filter((p) => p.repeat === repeat);

    const groups = React.useMemo(() => {
        const map = new Map<string, ProductParam[]>();
        for (const p of shown) {
            const g = p.group || "";
            if (!map.has(g)) map.set(g, []);
            map.get(g)!.push(p);
        }
        return [...map.entries()];
    }, [shown]);

    if (shown.length === 0) {
        return <Typography variant="caption" color="text.disabled">No fields.</Typography>;
    }

    const field = (p: ProductParam) => {
        const v = values[p.key];
        const label = p.label + (p.required ? " *" : "");

        if (p.type === "boolean") {
            return (
                <FormControlLabel
                    key={p.key}
                    control={
                        <Switch
                            size="small" disabled={disabled}
                            checked={v === true}
                            onChange={(e) => onChange(p.key, e.target.checked)}
                        />
                    }
                    label={label}
                />
            );
        }
        if (p.type === "list") {
            return (
                <TextField
                    key={p.key} select size="small" fullWidth disabled={disabled}
                    label={label} value={v ?? ""} InputLabelProps={{ shrink: true }}
                    onChange={(e) => onChange(p.key, e.target.value)}
                >
                    {p.options.map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                </TextField>
            );
        }
        const isNumber = p.type === "number";
        const range = isNumber && (p.min != null || p.max != null)
            ? `${p.min ?? "–"} to ${p.max ?? "–"}`
            : " ";
        return (
            <TextField
                key={p.key} size="small" fullWidth disabled={disabled}
                label={label} type={isNumber ? "number" : "text"}
                value={v ?? ""} InputLabelProps={{ shrink: true }}
                helperText={range}
                onChange={(e) => onChange(p.key, isNumber ? Number(e.target.value) : e.target.value)}
            />
        );
    };

    return (
        <Stack spacing={2.5}>
            {groups.map(([g, list]) => (
                <Stack key={g || "_"} spacing={1.5}>
                    {g && (
                        <Typography variant="caption" fontWeight={700} color="text.secondary" textTransform="uppercase">
                            {g}
                        </Typography>
                    )}
                    {list.map(field)}
                </Stack>
            ))}
        </Stack>
    );
}

/** Seed a values object from the params' defaults. */
export function defaultValues(params: ProductParam[], repeat?: ProductParamRepeat): Values {
    const out: Values = {};
    for (const p of params) {
        if (repeat && p.repeat !== repeat) continue;
        out[p.key] = p.defaultValue ?? (p.type === "boolean" ? false : "");
    }
    return out;
}
