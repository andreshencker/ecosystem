// src/modules/integrations/onboard/components/MetatraderOnboardingForm.tsx
import React, { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import {
    Box,
    Button,
    Card,
    CardActions,
    CardContent,
    CardHeader,
    Typography,
} from "@mui/material";

import type { Platform } from "@/modules/core/platforms/types/platforms";

// ✅ usa las funciones reales del cliente (ME)
import {
    createMyUserPlatform,
    changeMyUserPlatformStatus,
} from "@/modules/core/userPlatforms/api/userPlatforms";

import type {
    CreateMyUserPlatformPayload,
    UserPlatform,
} from "@/modules/core/userPlatforms/types/userPlatforms";

type Props = {
    platform: Platform;
    onDone: () => void | Promise<void>;
};

function getPlatformId(p: Platform): string {
    return String((p as any)._id ?? (p as any).id ?? "");
}

function normalizePlatformName(p: Platform): string {
    const raw = String(p.code ?? p.name ?? "").trim().toLowerCase();
    if (
        raw === "metatrader5" ||
        raw === "metatrader 5" ||
        raw === "meta trader 5"
    )
        return "mt5";
    return raw;
}

const MetatraderOnboardingForm: React.FC<Props> = ({ platform, onDone }) => {
    const isMt5 = useMemo(
        () => normalizePlatformName(platform) === "mt5",
        [platform]
    );

    const createUP = useMutation({
        mutationFn: async (dto: CreateMyUserPlatformPayload) => {
            return await createMyUserPlatform(dto);
        },
    });

    const [statusLoading, setStatusLoading] = useState(false);
    const loading = createUP.isPending || statusLoading;

    const ensureUserPlatform = async (): Promise<UserPlatform> => {
        const platformId = getPlatformId(platform);
        if (!platformId) throw new Error("Missing platform id for MT5");

        const dto: CreateMyUserPlatformPayload = {
            platformId,
            isDefault: true,
        };

        return await createUP.mutateAsync(dto);
    };

    const handleConnect = async () => {
        if (loading) return;

        try {
            setStatusLoading(true);

            // 1) asegurar userPlatform
            const up = await ensureUserPlatform();
            const upId = String((up as any).id ?? (up as any)._id ?? "");
            if (!upId) throw new Error("Invalid userPlatform id");

            // 2) marcar connected (tu endpoint requiere payload {status})
            await changeMyUserPlatformStatus(upId, { status: "connected" });

            toast.success("MT5 connected!");
            await onDone();
        } catch (err: any) {
            const msg =
                err?.response?.data?.message || err?.message || "Failed to connect MT5";
            toast.error(msg);
        } finally {
            setStatusLoading(false);
        }
    };

    if (!isMt5) {
        return <Typography>Invalid platform for MT5 onboarding.</Typography>;
    }

    return (
        <Box>
            <Card sx={{ borderRadius: 3, boxShadow: "0 18px 45px rgba(15,23,42,0.35)" }}>
                <CardHeader
                    title={
                        <Typography variant="h6" fontWeight={600}>
                            Connect MetaTrader 5
                        </Typography>
                    }
                    subheader={
                        <Typography variant="body2" sx={{ opacity: 0.7 }}>
                            Trade hundreds of assets (forex, indices, CFDs and more) by connecting
                            your existing MT5 account with JTrade.
                        </Typography>
                    }
                />

                <CardContent>
                    <Typography variant="body2" sx={{ opacity: 0.8, mb: 1 }}>
                        • Use your preferred MT5 broker and keep trading where you are comfortable.
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.8, mb: 1 }}>
                        • Centralise your positions, performance and risk together with your other platforms in JTrade.
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.8 }}>
                        For now this connection is managed outside the app. Click the button below
                        once your MT5 setup is ready and we&apos;ll mark this integration as active.
                    </Typography>
                </CardContent>

                <CardActions sx={{ px: 3, pb: 3 }}>
                    <Button
                        variant="contained"
                        color="primary"
                        fullWidth
                        onClick={handleConnect}
                        disabled={loading}
                    >
                        {loading ? "Activating…" : "Mark as completed"}
                    </Button>
                </CardActions>
            </Card>
        </Box>
    );
};

export default MetatraderOnboardingForm;