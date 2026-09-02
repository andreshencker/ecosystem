import * as React from "react";
import { Alert, Box, Card, CircularProgress, Divider, MenuItem, Stack, Tab, Tabs, TextField, Typography } from "@mui/material";

import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingButton } from "@/components/shared/LoadingButton";
import { ErrorState } from "@/components/shared/ErrorState";
import { useCurrentOrganization, useUpdateOrganizationMutation } from "@/hooks/api/useOrganization";
import type { Organization, OrganizationPatch } from "@/types/organization";

type FieldKey = keyof Organization;

const TAB_FIELDS: FieldKey[][] = [
    ["name", "entityType", "legalName", "tagline", "timezone", "copyrightText", "disclaimerShort", "disclaimerLong", "logoIconUrl", "logoFullUrl"],
    ["officialEmail", "supportEmail", "supportPhoneCountryCode", "supportPhoneNumber", "supportHours", "addressLine1", "addressLine2", "addressCity", "addressState", "addressPostalCode", "addressCountry"],
    ["bankAccountHolder", "bankName", "bankAccountNumber", "bankSwiftBic", "bankCountry", "usdtWalletAddress", "usdtNetwork"],
    ["websiteUrl", "apiBaseUrl", "helpCenterUrl", "privacyPolicyUrl", "termsUrl", "unsubscribeUrl", "facebook", "instagram", "linkedin", "x", "youtube", "tiktok", "whatsapp", "telegram"],
];

const TABS = ["General", "Contact & Address", "Payment", "Web & Social"];
const USDT_NETWORKS = ["TRC20", "ERC20", "BEP20"] as const;

const gridSx = { display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2.5 } as const;
const fullSpan = { gridColumn: "1 / -1" } as const;

export default function MyOrganizationPage() {
    const q = useCurrentOrganization();
    const update = useUpdateOrganizationMutation();
    const [tab, setTab] = React.useState(0);
    const [form, setForm] = React.useState<Record<string, string>>({});

    React.useEffect(() => {
        if (!q.data) return;
        const next: Record<string, string> = {};
        for (const key of Object.keys(q.data) as FieldKey[]) {
            const value = q.data[key];
            if (typeof value === "string") next[key] = value;
        }
        setForm(next);
    }, [q.data]);

    const set = (key: string, value: string) => setForm((current) => ({ ...current, [key]: value }));

    const saveTab = async () => {
        const patch: OrganizationPatch = {};
        for (const key of TAB_FIELDS[tab]) patch[key] = form[key] ?? "";
        await update.mutateAsync(patch);
    };

    if (q.isLoading) {
        return <><PageHeader title="My Organization" /><Box display="flex" justifyContent="center" py={8}><CircularProgress /></Box></>;
    }
    if (q.isError || !q.data) {
        return <><PageHeader title="My Organization" /><ErrorState title="Could not load your organization" description="Make sure your session has an active Grapifly organization, then retry." /></>;
    }

    const org = q.data;

    const field = (key: string, label: string, opts: { multiline?: boolean; rows?: number; type?: string; placeholder?: string; full?: boolean } = {}) => (
        <TextField
            key={key}
            label={label}
            value={form[key] ?? ""}
            onChange={(e) => set(key, e.target.value)}
            fullWidth size="small" type={opts.type}
            multiline={opts.multiline} rows={opts.rows} placeholder={opts.placeholder}
            InputLabelProps={{ shrink: true }}
            sx={opts.full ? fullSpan : undefined}
        />
    );

    const saveButton = (
        <LoadingButton variant="contained" onClick={saveTab} loading={update.isPending} sx={{ textTransform: "none", fontWeight: 700 }}>
            Save {TABS[tab]}
        </LoadingButton>
    );

    return (
        <>
            <PageHeader
                title="My Organization"
                subtitle={`Profile for ${org.name}. Switch organization from the sidebar. Only owners and admins can save changes.`}
                actions={saveButton}
            />

            <Card variant="outlined">
                <Tabs value={tab} onChange={(_e, v) => setTab(v)} variant="scrollable" scrollButtons="auto" sx={{ borderBottom: 1, borderColor: "divider", px: 1 }}>
                    {TABS.map((label) => <Tab key={label} label={label} sx={{ textTransform: "none", fontWeight: 600 }} />)}
                </Tabs>

                <Box p={3}>
                    {tab === 0 && (
                        <Box sx={gridSx}>
                            {field("name", "Organization name")}
                            <TextField select label="Type" value={form.entityType ?? "company"} onChange={(e) => set("entityType", e.target.value)} fullWidth size="small" InputLabelProps={{ shrink: true }}>
                                <MenuItem value="company">Company</MenuItem>
                                <MenuItem value="individual">Individual</MenuItem>
                            </TextField>
                            {field("legalName", "Legal name")}
                            {field("tagline", "Tagline")}
                            {field("timezone", "Timezone")}
                            <TextField label="Organization key" value={org.slug} fullWidth size="small" InputProps={{ readOnly: true }} InputLabelProps={{ shrink: true }} />
                            {field("logoIconUrl", "Icon logo URL", { type: "url", placeholder: "https://" })}
                            {field("logoFullUrl", "Full logo URL", { type: "url", placeholder: "https://" })}
                            {field("copyrightText", "Copyright text")}
                            {field("disclaimerShort", "Short disclaimer", { multiline: true, rows: 2, full: true })}
                            {field("disclaimerLong", "Long disclaimer", { multiline: true, rows: 4, full: true })}
                            {org.logoFullUrl && (
                                <Box component="img" src={org.logoFullUrl} alt="Logo" sx={{ ...fullSpan, maxWidth: 220, height: 44, objectFit: "contain", border: "1px solid", borderColor: "divider", borderRadius: 1 }} />
                            )}
                        </Box>
                    )}

                    {tab === 1 && (
                        <Box sx={gridSx}>
                            {field("officialEmail", "Official email", { type: "email" })}
                            {field("supportEmail", "Support email", { type: "email" })}
                            {field("supportPhoneCountryCode", "Support phone country code", { placeholder: "+61" })}
                            {field("supportPhoneNumber", "Support phone number")}
                            {field("supportHours", "Support hours")}
                            {field("addressLine1", "Address line 1")}
                            {field("addressLine2", "Address line 2")}
                            {field("addressCity", "City")}
                            {field("addressState", "State / Province")}
                            {field("addressPostalCode", "Postal code")}
                            {field("addressCountry", "Country")}
                        </Box>
                    )}

                    {tab === 2 && (
                        <Box sx={gridSx}>
                            <Typography variant="body2" color="text.secondary" sx={fullSpan}>
                                Where this organization receives money for what it sells. A USDT wallet and its network must be set together.
                            </Typography>
                            {field("bankAccountHolder", "Bank account holder")}
                            {field("bankName", "Bank name")}
                            {field("bankAccountNumber", "Account number / IBAN")}
                            {field("bankSwiftBic", "SWIFT / BIC")}
                            {field("bankCountry", "Bank country")}
                            <Box />
                            {field("usdtWalletAddress", "USDT wallet address")}
                            <TextField select label="USDT network" value={form.usdtNetwork ?? ""} onChange={(e) => set("usdtNetwork", e.target.value)} fullWidth size="small" InputLabelProps={{ shrink: true }}>
                                <MenuItem value="">Select network…</MenuItem>
                                {USDT_NETWORKS.map((n) => <MenuItem key={n} value={n}>{n}</MenuItem>)}
                            </TextField>
                        </Box>
                    )}

                    {tab === 3 && (
                        <Box sx={gridSx}>
                            {field("websiteUrl", "Website", { type: "url", placeholder: "https://" })}
                            {field("apiBaseUrl", "API base URL", { type: "url", placeholder: "https://" })}
                            {field("helpCenterUrl", "Help center", { type: "url", placeholder: "https://" })}
                            {field("privacyPolicyUrl", "Privacy policy", { type: "url", placeholder: "https://" })}
                            {field("termsUrl", "Terms and conditions", { type: "url", placeholder: "https://" })}
                            {field("unsubscribeUrl", "Unsubscribe URL", { type: "url", placeholder: "https://" })}
                            {field("facebook", "Facebook", { type: "url", placeholder: "https://" })}
                            {field("instagram", "Instagram", { type: "url", placeholder: "https://" })}
                            {field("linkedin", "LinkedIn", { type: "url", placeholder: "https://" })}
                            {field("x", "X", { type: "url", placeholder: "https://" })}
                            {field("youtube", "YouTube", { type: "url", placeholder: "https://" })}
                            {field("tiktok", "TikTok", { type: "url", placeholder: "https://" })}
                            {field("whatsapp", "WhatsApp", { type: "url", placeholder: "https://" })}
                            {field("telegram", "Telegram", { type: "url", placeholder: "https://" })}
                        </Box>
                    )}

                    <Divider sx={{ my: 3 }} />
                    <Stack direction="row" justifyContent="flex-end">{saveButton}</Stack>
                    {update.isError && <Alert severity="error" sx={{ mt: 2 }}>Changes could not be saved.</Alert>}
                </Box>
            </Card>
        </>
    );
}
