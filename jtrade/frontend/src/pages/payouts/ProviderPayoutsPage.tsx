import * as React from "react";
import { useSearchParams } from "react-router-dom";
import {
    Alert,
    Box,
    Card,
    CardContent,
    Chip,
    Divider,
    List,
    ListItem,
    ListItemText,
    MenuItem,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import PendingRoundedIcon from "@mui/icons-material/PendingRounded";
import ErrorRoundedIcon from "@mui/icons-material/ErrorRounded";
import toast from "react-hot-toast";

import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingButton } from "@/components/shared/LoadingButton";
import { EmptyState } from "@/components/shared/EmptyState";
import { QueryError } from "@/components/shared/QueryError";
import {
    usePaymentsOnboardingStatus,
    useRefreshPaymentMethod,
    useStartPaymentMethod,
} from "@/hooks/api/usePaymentsOnboarding";
import type {
    PaymentMethodStatus,
    ProviderPaymentMethod,
} from "@/types/payments-onboarding";

const STATUS_META: Record<
    PaymentMethodStatus,
    { label: string; color: "success" | "warning" | "error"; icon: React.ElementType }
> = {
    complete: { label: "Ready", color: "success", icon: CheckCircleRoundedIcon },
    pending: { label: "In progress", color: "warning", icon: PendingRoundedIcon },
    restricted: { label: "Needs attention", color: "error", icon: ErrorRoundedIcon },
};

function StatusChip({ status }: { status: PaymentMethodStatus }) {
    const meta = STATUS_META[status];
    const Icon = meta.icon;
    return (
        <Chip
            size="small"
            color={meta.color}
            variant="outlined"
            icon={<Icon sx={{ fontSize: 16 }} />}
            label={meta.label}
        />
    );
}

export default function ProviderPayoutsPage() {
    const [params, setParams] = useSearchParams();
    const [country, setCountry] = React.useState("");
    const status = usePaymentsOnboardingStatus();
    const start = useStartPaymentMethod();
    const refresh = useRefreshPaymentMethod();

    // Coming back from the gateway — re-check the method and clean the URL.
    React.useEffect(() => {
        if (params.get("from") !== "return" && params.get("from") !== "refresh") return;
        const method = params.get("method") ?? "stripe";
        refresh.mutate(method, {
            onSuccess: () => toast.success("Status updated."),
        });
        params.delete("from");
        params.delete("method");
        setParams(params, { replace: true });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const goToGateway = (method: string, extra?: { country?: string }) => {
        start.mutate(
            { method, ...extra },
            {
                onSuccess: (res) => {
                    window.location.href = res.onboardingUrl;
                },
            },
        );
    };

    const data = status.data;
    const stripe = data?.methods.find((m) => m.method === data.baseMethod);
    const extras = data?.methods.filter((m) => !m.isBase) ?? [];
    const busy = start.isPending || refresh.isPending;
    const countryChoices = data?.requiredCountryChoice ?? [];
    const needsCountry = countryChoices.length > 0;

    return (
        <>
            <PageHeader
                title="Payment methods"
                subtitle="Set up how your organization gets paid. Stripe is required; you can add more once it's ready."
            />

            {status.isLoading && <Typography color="text.secondary">Loading…</Typography>}
            {status.isError && (
                <QueryError
                    message={(status.error as Error)?.message ?? "Could not load your payment methods."}
                    onRetry={() => status.refetch()}
                />
            )}

            {data && !data.configReady && (
                <Alert severity="info" sx={{ maxWidth: 640 }}>
                    Payment methods aren't set up yet. An administrator needs to configure
                    them before you can connect your payouts.
                </Alert>
            )}

            {data && data.configReady && (
                <Stack spacing={2} maxWidth={640}>
                    {/* ── Stripe — the mandatory base ───────────────────────── */}
                    <Card variant="outlined">
                        <CardContent>
                            <Box display="flex" alignItems="center" justifyContent="space-between" gap={1} mb={1}>
                                <Box display="flex" alignItems="center" gap={1}>
                                    <Typography variant="subtitle1" fontWeight={600}>Stripe</Typography>
                                    <Chip size="small" label="Required" sx={{ bgcolor: "action.selected" }} />
                                </Box>
                                {stripe && <StatusChip status={stripe.status} />}
                            </Box>

                            {!stripe && (
                                <>
                                    <Typography variant="body2" color="text.secondary" mb={2}>
                                        Connect a Stripe account to receive payouts. Stripe will ask for your
                                        identity, a bank account and tax details.
                                    </Typography>
                                    <Stack direction="row" spacing={1} alignItems="flex-start">
                                        {needsCountry && (
                                            <TextField
                                                select
                                                label="Country"
                                                size="small"
                                                required
                                                value={country}
                                                onChange={(e) => setCountry(e.target.value)}
                                                helperText="Cannot be changed later"
                                                sx={{ width: 200 }}
                                            >
                                                {countryChoices.map((c) => (
                                                    <MenuItem key={c} value={c}>{c}</MenuItem>
                                                ))}
                                            </TextField>
                                        )}
                                        <LoadingButton
                                            variant="contained"
                                            loading={busy}
                                            disabled={needsCountry && !country}
                                            onClick={() =>
                                                goToGateway("stripe", needsCountry ? { country } : undefined)
                                            }
                                            sx={{ mt: 0.5 }}
                                        >
                                            Set up Stripe
                                        </LoadingButton>
                                    </Stack>
                                </>
                            )}

                            {stripe?.status === "pending" && (
                                <>
                                    <Typography variant="body2" color="text.secondary" mb={2}>
                                        Your Stripe setup isn't finished. Continue where you left off, or check
                                        again if you already completed it.
                                    </Typography>
                                    <Stack direction="row" spacing={1}>
                                        <LoadingButton variant="contained" loading={busy} onClick={() => goToGateway("stripe")}>
                                            Continue setup
                                        </LoadingButton>
                                        <LoadingButton
                                            variant="outlined"
                                            loading={refresh.isPending}
                                            onClick={() => refresh.mutate("stripe")}
                                        >
                                            I've finished — check
                                        </LoadingButton>
                                    </Stack>
                                </>
                            )}

                            {stripe?.status === "restricted" && (
                                <>
                                    <Alert severity="error" sx={{ mb: 2 }}>
                                        {stripe.disabledReason
                                            ? `Stripe restricted this account: ${stripe.disabledReason}.`
                                            : "Stripe restricted this account and needs more information."}
                                    </Alert>
                                    {stripe.requirementsDue.length > 0 && (
                                        <List dense disablePadding sx={{ mb: 2 }}>
                                            {stripe.requirementsDue.map((r) => (
                                                <ListItem key={r} disablePadding>
                                                    <ListItemText primary={r} primaryTypographyProps={{ variant: "body2" }} />
                                                </ListItem>
                                            ))}
                                        </List>
                                    )}
                                    <Stack direction="row" spacing={1}>
                                        <LoadingButton variant="contained" loading={busy} onClick={() => goToGateway("stripe")}>
                                            Fix in Stripe
                                        </LoadingButton>
                                        <LoadingButton variant="outlined" loading={refresh.isPending} onClick={() => refresh.mutate("stripe")}>
                                            Check again
                                        </LoadingButton>
                                    </Stack>
                                </>
                            )}

                            {stripe?.status === "complete" && (
                                <Box display="flex" alignItems="center" gap={1}>
                                    <CheckCircleRoundedIcon color="success" fontSize="small" />
                                    <Typography variant="body2" color="text.secondary">
                                        Stripe is ready — payouts can reach your account.
                                    </Typography>
                                </Box>
                            )}
                        </CardContent>
                    </Card>

                    {/* ── Extra methods (only once Stripe is ready) ─────────── */}
                    {data.canAddMore ? (
                        <>
                            <Divider textAlign="left">
                                <Typography variant="overline" color="text.secondary">More methods</Typography>
                            </Divider>

                            {extras.map((m: ProviderPaymentMethod) => (
                                <Card key={m.method} variant="outlined">
                                    <CardContent>
                                        <Box display="flex" alignItems="center" justifyContent="space-between" gap={1}>
                                            <Typography variant="subtitle1" fontWeight={600} textTransform="capitalize">
                                                {m.method}
                                            </Typography>
                                            <StatusChip status={m.status} />
                                        </Box>
                                        {m.status !== "complete" && (
                                            <Stack direction="row" spacing={1} mt={2}>
                                                <LoadingButton size="small" variant="contained" loading={busy} onClick={() => goToGateway(m.method)}>
                                                    Continue setup
                                                </LoadingButton>
                                                <LoadingButton size="small" variant="outlined" loading={refresh.isPending} onClick={() => refresh.mutate(m.method)}>
                                                    Check
                                                </LoadingButton>
                                            </Stack>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}

                            {data.availableToAdd.length > 0 ? (
                                data.availableToAdd.map((a) => (
                                    <Card key={a.method} variant="outlined" sx={{ borderStyle: "dashed" }}>
                                        <CardContent>
                                            <Box display="flex" alignItems="center" justifyContent="space-between" gap={1}>
                                                <Box>
                                                    <Typography variant="subtitle1" fontWeight={600}>{a.displayName}</Typography>
                                                    {a.description && (
                                                        <Typography variant="body2" color="text.secondary">{a.description}</Typography>
                                                    )}
                                                </Box>
                                                <LoadingButton variant="outlined" loading={busy} onClick={() => goToGateway(a.method)}>
                                                    Add
                                                </LoadingButton>
                                            </Box>
                                        </CardContent>
                                    </Card>
                                ))
                            ) : (
                                extras.length === 0 && (
                                    <Typography variant="body2" color="text.secondary">
                                        No other payment methods available right now.
                                    </Typography>
                                )
                            )}
                        </>
                    ) : (
                        <EmptyState
                            title="More methods unlock after Stripe"
                            description="Once your Stripe account is ready you'll be able to add other ways to get paid."
                        />
                    )}
                </Stack>
            )}
        </>
    );
}
