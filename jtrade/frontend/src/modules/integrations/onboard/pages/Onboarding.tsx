// src/modules/integrations/onboard/pages/Onboarding.tsx
import React from "react";

import OnboardingIntro from "../components/OnboardingIntro";
import PlatformOnboardingSwitcher from "../components/PlatformOnboardingSwitcher";
import {useApp} from "@/app/context/AppSessionContext";

const ClientOnboardingPage: React.FC = () => {
    const {missingPlatforms, ready, booting} = useApp();

    const loading = !ready || booting;

    // Normalmente missingPlatforms ya tiene el subconjunto correcto;
    // si por alguna razón está vacío pero el usuario no tiene nada conectado,
    // podemos caer al catálogo completo.
    const selectablePlatforms =
        missingPlatforms && missingPlatforms.length > 0
            ? missingPlatforms
            : missingPlatforms ?? [];

    return (
        <section className="section container">
            <div className="auth-grid">
                <div>
                    <div className="badge badge-purple" style={{marginBottom: 12}}>
                        CLIENT
                    </div>

                    <OnboardingIntro
                        title="Let’s connect your account"
                        subtitle="Choose a supported platform to link your account and start trading with JTrade."
                        tag="h1"
                    />
                </div>

                {/* Selector + formulario de onboarding */}
                <div style={{marginTop: 32}}>
                    <PlatformOnboardingSwitcher
                        mode="onboarding"
                        platforms={selectablePlatforms}
                        loading={loading}
                    />
                </div>
            </div>
        </section>
    );
};

export default ClientOnboardingPage;