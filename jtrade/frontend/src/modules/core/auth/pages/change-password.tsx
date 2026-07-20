// src/auth/pages/change-password.tsx
import React from "react";
import ChangePasswordForm from "../components/ChangePasswordForm";

export default function ChangePasswordPage() {
    return (
        <div className="min-h-screen bg-dark accent-rows">
            <main className="container section">
                <h1 className="h1">Change password</h1>
                <p className="muted">Update your password for better security.</p>
                <div className="mt-6">
                    <ChangePasswordForm/>
                </div>
            </main>
        </div>
    );
}