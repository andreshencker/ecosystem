import React from "react";
import ReactDOM from "react-dom/client";
import Providers from "@/old/app/providers/Providers";
import AppRouter from "@/old/app/routing/AppRouter";
import "@/old/app/styles/globals.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <Providers>
            <AppRouter />
        </Providers>
    </React.StrictMode>
);