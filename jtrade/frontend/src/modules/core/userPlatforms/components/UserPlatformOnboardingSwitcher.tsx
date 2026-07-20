// src/modules/userPlatforms/components/PlatformOnboardingFormSwitcher.tsx
import * as React from "react";
import { Box, Typography } from "@mui/material";

import type { Platform } from "@/modules/core/platforms/types/platforms";

import BinanceOnboardingForm from "@/modules/integrations/onboard/components/BinanceOnboardingForm";
import MetatraderOnboardingForm from "@/modules/integrations/onboard/components/MetatraderOnboardingForm";

type Props = {
    platform: Platform | null;
    onDone?: () => void | Promise<void>;
};

function normalizePlatformName(p: Platform): string {
    const raw = String((p as any).code ?? p.name ?? "").trim().toLowerCase();
    if (raw === "metatrader5" || raw === "metatrader 5" || raw === "meta trader 5") return "mt5";
    return raw;
}

export default function PlatformOnboardingFormSwitcher({ platform, onDone }: Props) {
    if (!platform) return null;

    const key = normalizePlatformName(platform);

    if (key === "binance") {
        return (
            <Box sx={{ mt: 2 }}>
                <BinanceOnboardingForm platform={platform} onDone={onDone ?? (async () => {})} />
            </Box>
        );
    }

    if (key === "mt5") {
        return (
            <Box sx={{ mt: 2 }}>
                <MetatraderOnboardingForm platform={platform} onDone={onDone ?? (async () => {})} />
            </Box>
        );
    }

    return (
        <Box sx={{ mt: 2, p: 2, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
            <Typography variant="subtitle2" fontWeight={700}>
                {platform.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                This platform doesn’t have an onboarding form yet.
            </Typography>
        </Box>
    );
}