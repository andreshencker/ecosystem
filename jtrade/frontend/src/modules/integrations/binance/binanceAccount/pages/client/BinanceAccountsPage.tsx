// src/modules/integrations/binance/binanceAccount/pages/client/BinanceAccountsPage.tsx
import * as React from "react";
import {Box, Stack, Typography} from "@mui/material";

import BinanceAccountsTable from "@/modules/integrations/binance/binanceAccount/components/BinanceAccountsTable";
import BinanceAccountForm, {
    type BinanceAccountFormValues,
} from "@/modules/integrations/binance/binanceAccount/components/BinanceAccountForm";

import type {BinanceAccount} from "@/modules/integrations/binance/binanceAccount/types/binanceAccounts";

import {
    createBinanceAccount,
    deleteBinanceAccount,
    listBinanceAccounts,
    setDefaultBinanceAccount,
    updateBinanceAccount,
} from "@/modules/integrations/binance/binanceAccount/api/binanceAccounts";

import {useApp} from "@/app/context/AppSessionContext";
import {notifyError, notifySuccess} from "@/app/lib/notify";

const BinanceAccountsPage: React.FC = () => {
    const {refresh} = useApp();

    const [rows, setRows] = React.useState<BinanceAccount[]>([]);
    const [loading, setLoading] = React.useState(false);

    // estado del formulario
    const [editing, setEditing] = React.useState<BinanceAccount | null>(null);
    const [saving, setSaving] = React.useState(false);

    // --------- Cargar cuentas ----------
    const fetchAccounts = React.useCallback(async () => {
        try {
            setLoading(true);
            const data = await listBinanceAccounts();
            setRows(data ?? []);
        } catch (e) {
            // eslint-disable-next-line no-console
            console.error("Error loading Binance accounts", e);
            notifyError("Error loading Binance accounts");
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        void fetchAccounts();
    }, [fetchAccounts]);

    const reloadAll = React.useCallback(
        async () => {
            await fetchAccounts();
            await refresh(); // refresca platformVars.accounts + activeAccount
        },
        [fetchAccounts, refresh],
    );

    // --------- Handlers formulario (crear / editar) ----------
    const handleSubmitForm = async (values: BinanceAccountFormValues) => {
        try {
            setSaving(true);

            if (editing) {
                const payload: any = {
                    description: values.description,
                    isActive: values.isActive,
                };

                if (values.apiKey) payload.apiKey = values.apiKey;
                if (values.secretKey) payload.secretKey = values.secretKey;

                await updateBinanceAccount(editing.id, payload);
                notifySuccess("Binance account updated");
            } else {
                await createBinanceAccount({
                    description: values.description,
                    apiKey: values.apiKey,
                    secretKey: values.secretKey,
                    isActive: values.isActive,
                } as any);
                notifySuccess("Binance account created");
            }

            setEditing(null);
            await reloadAll();
        } catch (e) {
            // eslint-disable-next-line no-console
            console.error("Error saving binance account", e);
            notifyError("Error saving Binance account");
        } finally {
            setSaving(false);
        }
    };

    const handleCancelForm = () => {
        setEditing(null);
    };

    const handleCreate = () => {
        // modo "crear": editing = null → el form queda vacío
        setEditing(null);
        // aquí no necesitamos ningún formOpen: el form siempre está visible
    };

    const handleEdit = (row: BinanceAccount) => {
        setEditing(row);
    };

    // --------- Handlers tabla ----------
    const handleSetDefault = async (row: BinanceAccount) => {
        try {
            await setDefaultBinanceAccount(row.id);
            notifySuccess("Default account updated");
            await reloadAll();
        } catch (e) {
            // eslint-disable-next-line no-console
            console.error("Error setting default binance account", e);
            notifyError("Error setting default account");
        }
    };

    const handleToggleActive = async (row: BinanceAccount) => {
        try {
            await updateBinanceAccount(row.id, {
                isActive: !row.isActive,
            } as any);
            notifySuccess(
                `Account marked as ${!row.isActive ? "active" : "inactive"}`,
            );
            await reloadAll();
        } catch (e) {
            // eslint-disable-next-line no-console
            console.error("Error toggling active binance account", e);
            notifyError("Error updating account status");
        }
    };

    const handleDelete = async (row: BinanceAccount) => {
        try {
            await deleteBinanceAccount(row.id);
            notifySuccess("Binance account deleted");
            await reloadAll();
        } catch (e) {
            // eslint-disable-next-line no-console
            console.error("Error deleting binance account", e);
            notifyError("Error deleting account");
        }
    };

    return (
        <Box
            sx={{
                px: 2,
                py: {xs: 2, md: 3},
            }}
        >
            <Box sx={{maxWidth: 1080, mx: "auto"}}>
                {/* Encabezado de la página */}
                <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    sx={{mb: 2, gap: 2}}
                >
                    <Box>
                        <Typography variant="h5" fontWeight={700}>
                            Manage Binance API accounts
                        </Typography>
                        <Typography variant="body2" sx={{opacity: 0.7, mt: 0.5}}>
                            Here you can manage all your Binance API keys linked to JTrade.
                        </Typography>
                    </Box>


                </Stack>

                {/* Formulario SIEMPRE visible arriba de la tabla */}
                <BinanceAccountForm
                    initial={editing}
                    loading={saving}
                    onSubmit={handleSubmitForm}
                    onCancel={handleCancelForm}
                />

                {/* Tabla */}
                <BinanceAccountsTable
                    rows={rows}
                    loading={loading}
                    onRefresh={reloadAll}
                    onSetDefault={handleSetDefault}
                    onToggleActive={handleToggleActive}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                />
            </Box>
        </Box>
    );
};

export default BinanceAccountsPage;