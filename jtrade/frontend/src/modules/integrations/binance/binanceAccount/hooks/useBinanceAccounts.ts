// src/modules/integrations/binance/binanceAccount/hooks/useBinanceAccounts.ts
import {useQuery} from "@tanstack/react-query";
import {listBinanceAccounts} from "../api/binanceAccounts";
import type {BinanceAccount} from "../types/binanceAccounts";

export function useBinanceAccounts(platformId?: string) {
    return useQuery<BinanceAccount[]>({
        queryKey: ["binance-accounts", platformId ?? "all"],
        queryFn: () => listBinanceAccounts(platformId),
    });
}