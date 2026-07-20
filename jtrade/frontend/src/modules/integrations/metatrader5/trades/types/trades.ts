// src/trades/types/trades.ts

export type TradeAction = "BUY" | "SELL";
export type TradeStatus = "OPENED" | "CLOSED" | "EXECUTED";

export type Trade = {
    id: string;

    userId: string;
    signalId: string;

    ticket: string;
    symbol: string;
    action: TradeAction;

    lot: number;
    entry: number;
    sl: number;
    tp: number;

    status: TradeStatus;

    // cierre (opcionales)
    close?: number;
    profit?: number;
    commission?: number;
    swap?: number;

    accountId: number;
    broker: string;
    traderName: string;

    // ISO string
    timestamp: string;
};

/**
 * Payload para crear/guardar trade (POST /mt5/trades)
 * En backend "id" lo genera Mongo, así que acá no va.
 */
export type CreateTradePayload = {
    userId: string;
    signalId: string;
    ticket: string;
    action: TradeAction;
    symbol: string;
    lot: number;
    entry: number;
    sl: number;
    tp: number;
    status: TradeStatus;

    accountId: number;
    broker: string;
    traderName: string;

    profit?: number;
    commission?: number;
    swap?: number;
    close?: number;

    timestamp?: string; // opcional
};

export type UserAccountOption = {
    accountId: string; // backend lo devuelve string (toString)
    broker?: string | null;
};