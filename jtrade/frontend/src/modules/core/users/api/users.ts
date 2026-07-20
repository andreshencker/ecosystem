// src/modules/users/api/users.ts
import { api } from "@/app/lib/http";
import type { CreateUserAdminDto, UpdateProfileDto, User } from "../types/users";

// helper para normalizar respuestas tipo { data } o { data: { data } }
function unwrap<T>(resp: any): T {
    return (resp?.data?.data ?? resp?.data) as T;
}

// GET /users
export async function listUsers(): Promise<User[]> {
    const resp = await api.get("/users");
    const raw = unwrap<any[]>(resp) ?? [];

    // normalizar id
    return raw.map((u: any) => ({
        ...u,
        id: u.id ?? u._id,
    }));
}

// DELETE /users/:id
export async function deleteUser(id: string): Promise<{ deleted: boolean }> {
    const resp = await api.delete(`/users/${id}`);
    return unwrap(resp);
}

// GET /auth/me  (ya existe en tu auth)
export async function getMe(): Promise<User> {
    const resp = await api.get("/auth/me");
    const u: any = unwrap(resp);
    return { ...u, id: u.id ?? u._id };
}

// PATCH /users/profile  (⚠️ ajusta si tu controller usa otra ruta)
export async function updateMyProfile(dto: UpdateProfileDto): Promise<User> {
    const resp = await api.patch("/users/profile", dto);
    const u: any = unwrap(resp);
    return { ...u, id: u.id ?? u._id };
}

// POST /auth/users (crear como admin) -> viene desde AuthController
export async function createUserAsAdmin(dto: CreateUserAdminDto): Promise<User> {
    const resp = await api.post("/auth/users", dto);
    const u: any = unwrap(resp);
    return { ...u, id: u.id ?? u._id };
}