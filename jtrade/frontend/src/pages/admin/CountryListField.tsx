import * as React from "react";
import {
    Autocomplete,
    Box,
    Button,
    Checkbox,
    IconButton,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from "@mui/material";
import CheckBoxOutlineBlankIcon from "@mui/icons-material/CheckBoxOutlineBlank";
import CheckBoxIcon from "@mui/icons-material/CheckBox";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

import {
    STRIPE_CONNECT_COUNTRIES,
    countryName,
    type CountryOption,
} from "@/constants/stripeConnectCountries";

const icon = <CheckBoxOutlineBlankIcon fontSize="small" />;
const checkedIcon = <CheckBoxIcon fontSize="small" />;

/** Parse the comma-joined settings string into an ordered, de-duped list of codes. */
function parse(value: string): string[] {
    const seen = new Set<string>();
    return value
        .split(/[,\s]+/)
        .map((c) => c.trim().toUpperCase())
        .filter((c) => c && !seen.has(c) && (seen.add(c), true));
}

interface Props {
    label: string;
    required?: boolean;
    /** Backend-provided guidance for this setting. */
    help?: string;
    /** Comma-joined ISO codes, e.g. "US, GB". */
    value: string;
    onChange: (next: string) => void;
}

/**
 * Country picker for a `country-list` setting: a multi-select of every country
 * Stripe Connect supports, plus a table of the ones currently chosen.
 * Emits the same comma-joined string the rest of the form expects.
 */
export function CountryListField({ label, required, help, value, onChange }: Props) {
    const selectedCodes = React.useMemo(() => parse(value), [value]);
    const selectedOptions = React.useMemo(
        () =>
            selectedCodes.map(
                (code) =>
                    STRIPE_CONNECT_COUNTRIES.find((c) => c.code === code) ?? { code, name: countryName(code) },
            ),
        [selectedCodes],
    );

    const emit = (codes: string[]) => onChange(codes.join(", "));

    const removeCode = (code: string) => emit(selectedCodes.filter((c) => c !== code));

    const allCodes = React.useMemo(() => STRIPE_CONNECT_COUNTRIES.map((c) => c.code), []);
    const allSelected = selectedCodes.length >= allCodes.length &&
        allCodes.every((c) => selectedCodes.includes(c));

    const unknown = selectedOptions.filter((o) => !STRIPE_CONNECT_COUNTRIES.some((c) => c.code === o.code));

    return (
        <Box>
            <Autocomplete<CountryOption, true, false, false>
                multiple
                disableCloseOnSelect
                options={STRIPE_CONNECT_COUNTRIES}
                value={selectedOptions}
                getOptionLabel={(o) => `${o.name} (${o.code})`}
                isOptionEqualToValue={(a, b) => a.code === b.code}
                onChange={(_e, next) => emit(next.map((o) => o.code))}
                renderOption={(props, option, { selected }) => {
                    const { key, ...rest } = props as React.HTMLAttributes<HTMLLIElement> & { key: string };
                    return (
                        <li key={key} {...rest}>
                            <Checkbox icon={icon} checkedIcon={checkedIcon} style={{ marginRight: 8 }} checked={selected} />
                            {option.name} ({option.code})
                        </li>
                    );
                }}
                renderInput={(params) => (
                    <TextField
                        {...params}
                        label={label}
                        required={required}
                        size="small"
                        placeholder={selectedCodes.length ? "" : "Search countries…"}
                        helperText={
                            help
                                ? `${help} Only countries Stripe Connect can onboard are listed.`
                                : "Only countries Stripe Connect can onboard are listed."
                        }
                    />
                )}
                renderTags={() => null}
            />

            <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ flexGrow: 1 }}>
                    {selectedCodes.length} of {allCodes.length} selected
                </Typography>
                <Button
                    size="small"
                    onClick={() => emit(allCodes)}
                    disabled={allSelected}
                >
                    Select all
                </Button>
                <Button
                    size="small"
                    color="inherit"
                    onClick={() => emit([])}
                    disabled={selectedCodes.length === 0}
                >
                    Clear
                </Button>
            </Stack>

            <TableContainer sx={{ mt: 1, border: 1, borderColor: "divider", borderRadius: 1 }}>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ width: 72 }}>Code</TableCell>
                            <TableCell>Country</TableCell>
                            <TableCell sx={{ width: 56 }} align="right" />
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {selectedOptions.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={3}>
                                    <Typography variant="body2" color="text.secondary" sx={{ py: 0.5 }}>
                                        No countries selected yet.
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        )}
                        {selectedOptions.map((o) => {
                            const isUnknown = unknown.some((u) => u.code === o.code);
                            return (
                                <TableRow key={o.code}>
                                    <TableCell>{o.code}</TableCell>
                                    <TableCell>
                                        {o.name}
                                        {isUnknown && (
                                            <Typography component="span" variant="caption" color="warning.main" sx={{ ml: 1 }}>
                                                not supported by Stripe Connect
                                            </Typography>
                                        )}
                                    </TableCell>
                                    <TableCell align="right">
                                        <IconButton size="small" aria-label={`Remove ${o.name}`} onClick={() => removeCode(o.code)}>
                                            <DeleteOutlineIcon fontSize="small" />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
}
