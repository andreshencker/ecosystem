// src/modules/users/hooks/useProfile.ts
import {useCallback, useEffect, useState} from "react";
import toast from "react-hot-toast";

import {useAuth} from "@/modules/core/auth/hooks/useAuth";
import {updateMyProfileApi} from "../api/users";
import {changePassword as changePasswordApi} from "@/modules/core/auth/api/auth";

export type ProfileValues = {
    firstName: string;
    lastName: string;
    email: string;
};

export type ChangePasswordValues = {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
};

export default function useProfile() {
    const {user: authUser} = useAuth();

    const [profile, setProfile] = useState<ProfileValues>({
        firstName: "",
        lastName: "",
        email: "",
    });

    const [loadingProfile, setLoadingProfile] = useState(false);
    const [savingProfile, setSavingProfile] = useState(false);
    const [savingPassword, setSavingPassword] = useState(false);

    // Cargar datos iniciales desde el usuario logueado
    useEffect(() => {
        if (!authUser) return;
        setProfile({
            firstName: authUser.firstName ?? "",
            lastName: authUser.lastName ?? "",
            email: authUser.email ?? "",
        });
    }, [authUser]);

    // Actualizar perfil (PATCH /users/me)
    const updateProfile = useCallback(
        async (values: ProfileValues) => {
            try {
                setSavingProfile(true);
                const updated = await updateMyProfileApi({
                    firstName: values.firstName,
                    lastName: values.lastName,
                    email: values.email,
                });

                setProfile({
                    firstName: updated.firstName ?? "",
                    lastName: updated.lastName ?? "",
                    email: updated.email ?? "",
                });

                toast.success("Profile updated successfully");
            } catch (err: any) {
                console.error("Error updating profile", err);
                const msg =
                    err?.response?.data?.message ??
                    err?.message ??
                    "Failed to update profile";
                toast.error(msg);
                throw err;
            } finally {
                setSavingProfile(false);
            }
        },
        []
    );

    // Cambiar contraseña (PATCH /auth/password)
    const changePassword = useCallback(
        async (values: ChangePasswordValues) => {
            if (values.newPassword !== values.confirmPassword) {
                toast.error("New password and confirmation do not match");
                return;
            }

            try {
                setSavingPassword(true);

                // Ajusta las keys si tu DTO usa otros nombres
                await changePasswordApi({
                    currentPassword: values.currentPassword,
                    newPassword: values.newPassword,
                } as any);

                toast.success("Password changed successfully");
            } catch (err: any) {
                console.error("Error changing password", err);
                const msg =
                    err?.response?.data?.message ??
                    err?.message ??
                    "Failed to change password";
                toast.error(msg);
                throw err;
            } finally {
                setSavingPassword(false);
            }
        },
        []
    );

    return {
        profile,
        setProfile,
        loadingProfile,
        savingProfile,
        savingPassword,
        updateProfile,
        changePassword,
        authUser,
    };
}