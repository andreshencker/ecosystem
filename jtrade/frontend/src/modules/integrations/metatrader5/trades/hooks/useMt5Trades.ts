import * as React from "react";
import type {Trade, UserAccountOption} from "@/modules/integrations/metatrader5/trades/types/trades";
import {
    getAccountsByUserPlatform,
    getTradesByUserPlatform,
    getTradesByUserPlatformAndSymbol,
} from "@/modules/integrations/metatrader5/trades/api/mt5Trades";

type State<T> = { data: T | null; loading: boolean; error: string | null };

const errorMessage = (e: any) =>
    e?.response?.data?.message ||
    e?.response?.data?.error ||
    e?.message ||
    "Unexpected error";

export function useMt5Trades() {
    const [trades, setTrades] = React.useState<State<Trade[]>>({
        data: null,
        loading: false,
        error: null,
    });

    const [accounts, setAccounts] = React.useState<State<UserAccountOption[]>>({
        data: null,
        loading: false,
        error: null,
    });

    const fetchByPlatform = React.useCallback(async (userPlatformId: string) => {
        setTrades((s) => ({...s, loading: true, error: null}));
        try {
            const data = await getTradesByUserPlatform(userPlatformId);
            setTrades({data, loading: false, error: null});
            return data;
        } catch (e) {
            setTrades({data: null, loading: false, error: errorMessage(e)});
            return null;
        }
    }, []);

    const fetchByPlatformAndSymbol = React.useCallback(
        async (userPlatformId: string, symbol: string) => {
            setTrades((s) => ({...s, loading: true, error: null}));
            try {
                const data = await getTradesByUserPlatformAndSymbol(userPlatformId, symbol);
                setTrades({data, loading: false, error: null});
                return data;
            } catch (e) {
                setTrades({data: null, loading: false, error: errorMessage(e)});
                return null;
            }
        },
        [],
    );

    const fetchAccounts = React.useCallback(async (userPlatformId: string) => {
        setAccounts((s) => ({...s, loading: true, error: null}));
        try {
            const data = await getAccountsByUserPlatform(userPlatformId);
            setAccounts({data, loading: false, error: null});
            return data;
        } catch (e) {
            setAccounts({data: null, loading: false, error: errorMessage(e)});
            return null;
        }
    }, []);

    return {
        trades,
        accounts,
        fetchByPlatform,
        fetchByPlatformAndSymbol,
        fetchAccounts,
        setTrades,
        setAccounts,
    };
}