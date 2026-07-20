// src/modules/integrations/onboard/components/BinanceOnboardingForm.tsx
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
    TextField,
    Typography,
} from "@mui/material";

import type { Platform } from "@/modules/core/platforms/types/platforms";

import {
    createMyUserPlatform,
    changeMyUserPlatformStatus,
} from "@/modules/core/userPlatforms/api/userPlatforms";

import type {
    CreateMyUserPlatformPayload,
    UserPlatform,
} from "@/modules/core/userPlatforms/types/userPlatforms";

import { createBinanceAccount } from "@/modules/integrations/binance/binanceAccount/api/binanceAccounts";
import type { CreateBinanceAccountDto } from "@/modules/integrations/binance/binanceAccount/types/binanceAccounts";

type Props = {
    platform: Platform;
    onDone: () => void | Promise<void>;
};

// helper: usa id o _id según venga del backend
function getPlatformId(p: Platform): string {
    return String((p as any)._id ?? (p as any).id ?? "");
}

/** Formulario visual de credenciales Binance (MUI) */
function BinanceCredentialsForm(props: {
    disabled?: boolean;
    onSubmit: (payload: {
        description: string;
        apiKey: string;
        apiSecret: string;
    }) => void;
}) {
    const { disabled, onSubmit } = props;

    const [description, setDescription] = useState("");
    const [apiKey, setApiKey] = useState("");
    const [apiSecret, setApiSecret] = useState("");

    const canSubmit =
        !!description.trim() && !!apiKey.trim() && !!apiSecret.trim() && !disabled;

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!canSubmit) return;

        onSubmit({
            description: description.trim(),
            apiKey: apiKey.trim(),
            apiSecret: apiSecret.trim(),
        });
    };

    return (
        <Box component="form" onSubmit={submit}>
            <Card
                sx={{
                    borderRadius: 3,
                    boxShadow: "0 18px 45px rgba(15,23,42,0.35)",
                }}
            >
                <CardHeader
                    title={
                        <Typography variant="h6" fontWeight={600}>
                            Connect Binance
                        </Typography>
                    }
                    subheader={
                        <Typography variant="body2" sx={{ opacity: 0.7 }}>
                            Enter your API credentials to connect your Binance account.
                        </Typography>
                    }
                />

                <CardContent>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <TextField
                            label="Label *"
                            placeholder="e.g., Personal"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            size="small"
                            fullWidth
                            disabled={disabled}
                            required
                        />

                        <TextField
                            label="API Key *"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            size="small"
                            fullWidth
                            autoComplete="off"
                            disabled={disabled}
                            required
                        />

                        <TextField
                            label="API Secret *"
                            type="password"
                            value={apiSecret}
                            onChange={(e) => setApiSecret(e.target.value)}
                            size="small"
                            fullWidth
                            autoComplete="off"
                            disabled={disabled}
                            required
                        />
                    </Box>
                </CardContent>

                <CardActions sx={{ px: 3, pb: 3 }}>
                    <Button
                        type="submit"
                        variant="contained"
                        color="primary"
                        fullWidth
                        disabled={!canSubmit}
                    >
                        {disabled ? "Connecting…" : "Connect"}
                    </Button>
                </CardActions>
            </Card>
        </Box>
    );
}

/**
 * Flujo de onboarding para Binance:
 *  - Crea userPlatform (status pending en backend)
 *  - Crea credenciales Binance asociadas al userPlatform
 *  - Marca la relación como "connected"
 *  - Llama onDone() al terminar
 */
const BinanceOnboardingForm: React.FC<Props> = ({ platform, onDone }) => {
    const isBinance = useMemo(() => {
        const raw = String(platform.code ?? platform.name ?? "")
            .trim()
            .toLowerCase();
        return raw === "binance";
    }, [platform]);

    const createUP = useMutation({
        mutationFn: async (dto: CreateMyUserPlatformPayload) => {
            return await createMyUserPlatform(dto);
        },
    });

    const createBinance = useMutation({
        mutationFn: async (payload: {
            userPlatformId: string;
            description: string;
            apiKey: string;
            apiSecret: string;
        }) => {
            const dto: CreateBinanceAccountDto = {
                userPlatformId: payload.userPlatformId,
                description: payload.description,
                apiKey: payload.apiKey,
                apiSecret: payload.apiSecret,
                isActive: true,
            };
            return await createBinanceAccount(dto);
        },
    });

    const loading = createUP.isPending || createBinance.isPending;

    const ensureUserPlatform = async (): Promise<UserPlatform> => {
        const platformId = getPlatformId(platform);
        if (!platformId) throw new Error("Missing platform id for Binance");

        const dto: CreateMyUserPlatformPayload = {
            platformId,
            isDefault: true,
        };

        return await createUP.mutateAsync(dto);
    };

    const submitBinance = async (payload: {
        description: string;
        apiKey: string;
        apiSecret: string;
    }) => {
        try {
            // 1) Asegurar userPlatform
            const up = await ensureUserPlatform();
            const upId = String((up as any).id ?? (up as any)._id ?? "");
            if (!upId) throw new Error("Invalid userPlatform id");

            // 2) Crear credenciales asociadas a ese userPlatform
            await createBinance.mutateAsync({
                userPlatformId: upId,
                description: payload.description,
                apiKey: payload.apiKey,
                apiSecret: payload.apiSecret,
            });

            // 3) Marcar como conectada (tu endpoint requiere payload {status})
            await changeMyUserPlatformStatus(upId, { status: "connected" });

            toast.success("Binance connected!");
            await onDone();
        } catch (err: any) {
            const msg =
                err?.response?.data?.message || err?.message || "Failed to connect";
            toast.error(msg);
        }
    };

    if (!isBinance) {
        return <Typography>Invalid platform for Binance onboarding.</Typography>;
    }

    return <BinanceCredentialsForm disabled={loading} onSubmit={submitBinance} />;
};

export default BinanceOnboardingForm;