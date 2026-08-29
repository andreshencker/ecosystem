import { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import { queryClient } from "@/lib/queryClient";
import { AuthProvider } from "@/old/modules/core/auth/hooks/useAuth";
import { AppSessionProvider } from "@/old/app/context/AppSessionContext";
import { AppThemeProvider } from "@/old/app/common/theme/AppThemeProvider";
import { AppConfigProvider } from "@/old/app/providers/AppConfigProvider";

export default function Providers({ children }: { children: ReactNode }) {
    return (
        <BrowserRouter>
            <AppConfigProvider>
              <AppThemeProvider>
                <QueryClientProvider client={queryClient}>
                    <AuthProvider>
                        <AppSessionProvider>
                            {children}

                            <Toaster
                                position="top-right"
                                toastOptions={{
                                    style: {
                                        background: "#111214",
                                        color: "#E6E6E6",
                                        border: "1px solid #22242A",
                                        boxShadow: "0 8px 24px rgba(0,0,0,0.45)",
                                    },
                                    success: {
                                        iconTheme: { primary: "var(--app-primary)", secondary: "#111214" },
                                    },
                                    error: {
                                        iconTheme: { primary: "#F03D3D", secondary: "#111214" },
                                    },
                                }}
                            />
                        </AppSessionProvider>
                    </AuthProvider>
                </QueryClientProvider>
              </AppThemeProvider>
            </AppConfigProvider>
        </BrowserRouter>
    );
}
