// src/modules/userPlatforms/components/PlatformOnboardingSection.tsx
import * as React from "react";
import { Box, Typography } from "@mui/material";

import AvailablePlatformSelect from "@/modules/core/userPlatforms/components/AvailablePlatformSelect";
import PlatformOnboardingFormSwitcher from "@/modules/core/userPlatforms/components/UserPlatformOnboardingSwitcher";

import type { Platform } from "@/modules/core/platforms/types/platforms";

function getId(x: any): string {
    return String(x?.id ?? x?._id ?? "");
}

type Props = {
    /** userPlatforms del usuario (listMine) */
    myRows: any[];

    /** catálogo de plataformas (ideal: supported=true) */
    catalog: Platform[];

    /** loading global (para deshabilitar select) */
    loading?: boolean;

    /** cuando se completa onboarding: refrescar data afuera */
    onDone?: () => void | Promise<void>;
};

export default function PlatformOnboardingSection({
                                                      myRows,
                                                      catalog,
                                                      loading,
                                                      onDone,
                                                  }: Props) {
    // 1) active/supported catalog (doble filtro por seguridad)
    const activeSupportedPlatforms = React.useMemo(() => {
        return (catalog ?? []).filter(
            (p: any) => p?.isActive === true && p?.isSupported === true
        );
    }, [catalog]);

    // 2) owned ids (por platformId o por platform populado)
    const ownedPlatformIds = React.useMemo(() => {
        const set = new Set<string>();

        (myRows ?? []).forEach((up: any) => {
            // normal: up.platformId (ObjectId string)
            if (up?.platformId) set.add(String(up.platformId));

            // respaldo: up.platform populated
            const pid = getId(up?.platform);
            if (pid) set.add(pid);
        });

        return set;
    }, [myRows]);

    // 3) missing platforms (del catálogo) que no están en owned
    const missingPlatforms = React.useMemo(() => {
        return (activeSupportedPlatforms ?? []).filter((p: any) => {
            const pid = getId(p);
            return pid && !ownedPlatformIds.has(pid);
        }) as Platform[];
    }, [activeSupportedPlatforms, ownedPlatformIds]);

    // 4) counts (para mostrar stats arriba)
    const counts = React.useMemo(() => {
        return {
            activeSupportedCount: activeSupportedPlatforms.length,
            ownedCount: (myRows ?? []).length,
            missingCount: missingPlatforms.length,
            hasAll: missingPlatforms.length === 0,
        };
    }, [activeSupportedPlatforms.length, myRows?.length, missingPlatforms.length]);

    // 5) selection local al componente
    const [selectedPlatformId, setSelectedPlatformId] = React.useState<string>("");

    const selectedPlatform = React.useMemo(() => {
        if (!selectedPlatformId) return null;
        return (
            (missingPlatforms as any[]).find((p) => getId(p) === selectedPlatformId) ??
            null
        );
    }, [selectedPlatformId, missingPlatforms]);

    return (
        <Box sx={{ mb: 3 }}>
            {/* Stats */}
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                Supported active platforms: <b>{counts.activeSupportedCount}</b> · Your
                platforms: <b>{counts.ownedCount}</b> · Available to add:{" "}
                <b>{counts.missingCount}</b>
            </Typography>

            {/* Select only missing */}
            <AvailablePlatformSelect
                options={missingPlatforms}
                value={selectedPlatformId}
                onChange={(id) => setSelectedPlatformId(id)}
                disabled={!!loading}
            />

            {/* If user selects "" => no form */}
            {selectedPlatformId ? (
                <PlatformOnboardingFormSwitcher
                    platform={selectedPlatform as any}
                    onDone={async () => {
                        // refrescar afuera
                        await onDone?.();
                        // reset local
                        setSelectedPlatformId("");
                    }}
                />
            ) : null}
        </Box>
    );
}