import * as React from "react";
import { Box, Divider, Stack, TextField, Typography } from "@mui/material";

import type { Product, ProductPresentation } from "@/types/products";
import { LabeledField } from "@/components/shared/FieldLabelWithHelp";

const HELP = {
    fullDescription: (
        <>
            The main pitch on the Marketplace listing page. Explain what the product is, who it is for,
            and why it is worth buying — a few short paragraphs.
            <br />
            <em>Example: “Blade Signals turns the Blade indicator into a hands-off trading system…”</em>
        </>
    ),
    whatItDoes: (
        <>
            One or two sentences on the core job the product does for the customer.
            <br />
            <em>Example: “Detects opportunities with the Blade indicator and turns each one into a BUY
            or SELL order on your MT5 account.”</em>
        </>
    ),
    howItWorks: (
        <>
            A short step-by-step of the mechanism, at a level a customer understands. Numbered lines
            work well.
            <br />
            <em>Example: “1. The indicator monitors the market. 2. A valid setup generates a signal.
            3. The signal reaches your account. 4. The trade is opened and managed.”</em>
        </>
    ),
    howToUse: (
        <>
            What the customer actually does to get started and run it day to day.
            <br />
            <em>Example: “Buy the product, connect an MT5 account, choose your symbols and risk, then
            let it run — you only monitor performance.”</em>
        </>
    ),
    whatYouReceive: (
        <>
            Exactly what the buyer gets: signals, an EA file, dashboard access, a private channel,
            updates… Be concrete.
            <br />
            <em>Example: “Live Blade signals on the covered symbols, automatic order execution on your
            MT5 account, and a full history of every signal and result.”</em>
        </>
    ),
    features: (
        <>
            The selling points, one per line — keep each one short. At least one is required and they
            appear as a bulleted list on the listing.
            <br />
            <em>Example: “Real-time signal delivery / Automatic MT5 execution / Configurable risk per
            trade”.</em>
        </>
    ),
    requirements: (
        <>
            What the customer needs before they can use the product, one per line.
            <br />
            <em>Example: “An MT5 account with a broker that allows automation / A VPS or always-on
            machine / Enough balance for your risk settings”.</em>
        </>
    ),
    limitations: (
        <>
            Honest caveats and disclaimers, one per line. Being upfront builds trust and reduces
            refund requests.
            <br />
            <em>Example: “Past performance does not guarantee future results / Signal frequency
            depends on market conditions / Trading involves risk of loss”.</em>
        </>
    ),
    documentationUrl: "Optional. A link to setup docs or a knowledge base for this product.",
    supportUrl: "Optional. Where buyers get help — a form, an email page, a Discord invite, a ticket system.",
    videoUrl: "Optional. A demo or walkthrough video (YouTube, Vimeo…) shown on the listing.",
};

const linesToArray = (v: string) => v.split("\n").map((s) => s.trim()).filter(Boolean);
const arrayToLines = (v?: string[]) => (v ?? []).join("\n");

type FormState = {
    fullDescription: string;
    whatItDoes: string;
    howItWorks: string;
    howToUse: string;
    whatYouReceive: string;
    features: string;
    requirements: string;
    limitations: string;
    documentationUrl: string;
    supportUrl: string;
    videoUrl: string;
};

const EMPTY: FormState = {
    fullDescription: "", whatItDoes: "", howItWorks: "", howToUse: "", whatYouReceive: "",
    features: "", requirements: "", limitations: "",
    documentationUrl: "", supportUrl: "", videoUrl: "",
};

export function usePresentationForm(product: Product | null) {
    const [state, setState] = React.useState<FormState>(EMPTY);

    React.useEffect(() => {
        const p = product?.presentation ?? {};
        setState({
            fullDescription: p.fullDescription ?? "",
            whatItDoes: p.whatItDoes ?? "",
            howItWorks: p.howItWorks ?? "",
            howToUse: p.howToUse ?? "",
            whatYouReceive: p.whatYouReceive ?? "",
            features: arrayToLines(p.features),
            requirements: arrayToLines(p.requirements),
            limitations: arrayToLines(p.limitations),
            documentationUrl: p.documentationUrl ?? "",
            supportUrl: p.supportUrl ?? "",
            videoUrl: p.videoUrl ?? "",
        });
    }, [product]);

    const set = <K extends keyof FormState>(k: K, v: string) => setState((s) => ({ ...s, [k]: v }));

    const valid =
        state.fullDescription.trim().length > 0 &&
        state.whatYouReceive.trim().length > 0 &&
        linesToArray(state.features).length > 0;

    const payload = (): Partial<ProductPresentation> => ({
        fullDescription: state.fullDescription.trim(),
        whatItDoes: state.whatItDoes.trim(),
        howItWorks: state.howItWorks.trim(),
        howToUse: state.howToUse.trim(),
        whatYouReceive: state.whatYouReceive.trim(),
        features: linesToArray(state.features),
        requirements: linesToArray(state.requirements),
        limitations: linesToArray(state.limitations),
        documentationUrl: state.documentationUrl.trim(),
        supportUrl: state.supportUrl.trim(),
        videoUrl: state.videoUrl.trim(),
    });

    return { state, set, valid, payload };
}

export default function PresentationStep({ form }: { form: ReturnType<typeof usePresentationForm> }) {
    const { state, set } = form;

    return (
        <Stack spacing={2.5} sx={{ maxWidth: 720 }}>
            <Typography variant="body2" color="text.secondary">
                Commercial content only — this is what a customer reads before buying. It is not the
                technical configuration screen (that comes later, with the Product Version).
            </Typography>

            <LabeledField label="Full description" required help={HELP.fullDescription}>
                <TextField
                    hiddenLabel fullWidth value={state.fullDescription} multiline minRows={4}
                    onChange={(e) => set("fullDescription", e.target.value)}
                />
            </LabeledField>
            <LabeledField label="What it does" help={HELP.whatItDoes}>
                <TextField
                    hiddenLabel fullWidth value={state.whatItDoes} multiline minRows={2}
                    onChange={(e) => set("whatItDoes", e.target.value)}
                />
            </LabeledField>
            <LabeledField label="How it works" help={HELP.howItWorks}>
                <TextField
                    hiddenLabel fullWidth value={state.howItWorks} multiline minRows={2}
                    onChange={(e) => set("howItWorks", e.target.value)}
                />
            </LabeledField>
            <LabeledField label="How to use it" help={HELP.howToUse}>
                <TextField
                    hiddenLabel fullWidth value={state.howToUse} multiline minRows={2}
                    onChange={(e) => set("howToUse", e.target.value)}
                />
            </LabeledField>
            <LabeledField label="What the client receives" required help={HELP.whatYouReceive}>
                <TextField
                    hiddenLabel fullWidth value={state.whatYouReceive} multiline minRows={2}
                    onChange={(e) => set("whatYouReceive", e.target.value)}
                />
            </LabeledField>

            <Divider />

            <LabeledField label="Features" required help={HELP.features}>
                <TextField
                    hiddenLabel fullWidth value={state.features} multiline minRows={3}
                    onChange={(e) => set("features", e.target.value)}
                    helperText="One per line. At least one required."
                />
            </LabeledField>
            <LabeledField label="Requirements" help={HELP.requirements}>
                <TextField
                    hiddenLabel fullWidth value={state.requirements} multiline minRows={2}
                    onChange={(e) => set("requirements", e.target.value)}
                    helperText="One per line. Optional."
                />
            </LabeledField>
            <LabeledField label="Limitations / important considerations" help={HELP.limitations}>
                <TextField
                    hiddenLabel fullWidth value={state.limitations} multiline minRows={2}
                    onChange={(e) => set("limitations", e.target.value)}
                    helperText="One per line. Optional."
                />
            </LabeledField>

            <Divider />
            <Typography variant="subtitle2" fontWeight={800}>Links (optional)</Typography>
            <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
                <LabeledField label="Documentation URL" help={HELP.documentationUrl}>
                    <TextField hiddenLabel fullWidth value={state.documentationUrl}
                        onChange={(e) => set("documentationUrl", e.target.value)} />
                </LabeledField>
                <LabeledField label="Support URL" help={HELP.supportUrl}>
                    <TextField hiddenLabel fullWidth value={state.supportUrl}
                        onChange={(e) => set("supportUrl", e.target.value)} />
                </LabeledField>
                <LabeledField label="Video / demo URL" help={HELP.videoUrl}>
                    <TextField hiddenLabel fullWidth value={state.videoUrl}
                        onChange={(e) => set("videoUrl", e.target.value)} />
                </LabeledField>
            </Box>

            <Typography variant="caption" color="text.secondary">
                * Required to complete this step.
            </Typography>
        </Stack>
    );
}
