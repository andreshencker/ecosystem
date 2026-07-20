# Roles y Permisos — Business App

**Versión:** 1.0  
**Fecha:** 2026-07-04  
**Estado:** Vigente

---

## 1. Objetivo del cambio

Business App heredó los roles de Communications App (`company_owner`, `company_admin`, `operator`) como punto de partida rápido. Esos roles no reflejan el dominio del negocio de facturación e invoicing.

Este documento define los roles propios de Business App, independientes de Communications. El único rol compartido intencionalmente es `platform_admin`, que administra ambas plataformas.

---

## 2. Roles nuevos

| Rol              | Scope   | Descripción                                              |
|------------------|---------|----------------------------------------------------------|
| `platform_admin` | global  | Administra la plataforma y la company base               |
| `business_owner` | company | Propietario con acceso completo dentro de su empresa     |
| `business_admin` | company | Administración operativa sin acciones destructivas       |
| `accountant`     | company | Acceso financiero: facturas, pagos, reportes, impuestos  |
| `staff`          | company | Acceso operativo: clientes, trabajos, borradores         |
| `viewer`         | company | Solo lectura                                             |

---

## 3. Mapeo desde roles heredados

| Rol antiguo     | Rol nuevo        | Notas                                      |
|-----------------|------------------|--------------------------------------------|
| `company_owner` | `business_owner` | Renombre semántico; mismas responsabilidades |
| `company_admin` | `business_admin` | Renombre semántico; mismas responsabilidades |
| `operator`      | `staff`          | Renombre semántico                          |
| `viewer`        | `viewer`         | Sin cambio                                  |
| `platform_admin`| `platform_admin` | Sin cambio                                  |
| —               | `accountant`     | Rol nuevo específico de Business App        |

Los documentos existentes en MongoDB con roles antiguos requieren migración manual cuando sea conveniente. El esquema Mongoose acepta ambos valores durante la transición.

---

## 4. Responsabilidades por rol

### `platform_admin`
- Acceso global a todas las rutas y operaciones.
- Administra la platform company (`isPlatformCompany: true`).
- Puede invitar otros `platform_admin` o `business_admin` en empresas específicas.
- Accede al sidebar dual: Business App + Platform Admin.

### `business_owner`
- Acceso completo dentro de su empresa.
- Puede editar company settings (nombre, ABN, cuenta bancaria, moneda).
- Puede gestionar usuarios (invitar, desactivar, eliminar).
- Puede transferir ownership.
- Puede configurar Communications connection.
- Creado exclusivamente vía registro de empresa (`POST /auth/register`). No se puede crear por invitación.

### `business_admin`
- Administración operativa de la empresa.
- Puede invitar `accountant`, `staff`, `viewer`.
- No puede: eliminar usuarios, editar company settings, transferir ownership.
- Puede gestionar Communications, dominios, eventos, templates.

### `accountant`
- Acceso financiero exclusivo.
- En fases futuras: facturas, pagos, reportes, impuestos, exportaciones, clientes.
- No puede gestionar usuarios ni configuración de empresa.

### `staff`
- Acceso operativo limitado.
- En fases futuras: clientes, trabajos / time entries, borradores de factura.
- No puede ver ni modificar configuración de empresa ni usuarios.

### `viewer`
- Solo lectura en dashboard.
- No puede ejecutar ninguna acción de escritura.

---

## 5. Reglas de acceso iniciales

### Rutas permitidas por rol

| Ruta                         | `platform_admin` | `business_owner` | `business_admin` | `accountant` | `staff` | `viewer` |
|------------------------------|:---:|:---:|:---:|:---:|:---:|:---:|
| `/dashboard`                 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/users`                     | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ |
| `/settings/company`          | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ |
| `/settings/profile`          | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/settings/communications`   | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ |
| `/audit-logs`                | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |

> `platform_admin` usa `'*'` — acceso a todas las rutas existentes y futuras.

---

## 6. Quién puede invitar usuarios

La jerarquía de invitaciones se enforcea en el backend (`INVITE_HIERARCHY`) y se refleja en el frontend (`getTeamInviteRoles`).

| Actor            | Puede invitar                                              |
|------------------|------------------------------------------------------------|
| `platform_admin` | `platform_admin`, `business_admin` (requiere `targetCompanyId`) |
| `business_owner` | `business_admin`, `accountant`, `staff`, `viewer`          |
| `business_admin` | `accountant`, `staff`, `viewer`                            |
| `accountant`     | Nadie                                                      |
| `staff`          | Nadie                                                      |
| `viewer`         | Nadie                                                      |

**Invariante:** `business_owner` nunca es creado por invitación. Se crea únicamente en `POST /auth/register` como parte del registro de empresa.

---

## 7. Quién puede administrar Settings

### Company Settings (`PATCH /company`)
- `platform_admin` ✓
- `business_owner` ✓
- Resto: solo lectura (pueden ver, no editar)

### Communications Connection (`/settings/communications`)
- `platform_admin` ✓
- `business_owner` ✓
- `business_admin` ✓ (configura la conexión de su empresa)
- `accountant`, `staff`, `viewer`: sin acceso a la ruta

---

## 8. Quién puede acceder a Communications Integration

La página `/settings/communications` (configuración del token de integración) está disponible para:
- `platform_admin`
- `business_owner`
- `business_admin`

El token en sí (`CommunicationConnection`) está encriptado en base de datos. Nunca se devuelve al frontend completo.

---

## 9. Roles solo lectura

- `viewer`: solo lectura en dashboard.
- `accountant`: lectura en dashboard (escritura financiera llegará en Sprint futuro).
- `staff`: lectura en dashboard (escritura operativa llegará en Sprint futuro).

Ninguno de estos roles puede modificar usuarios, company settings ni Communications.

---

## 10. Notas de seguridad y decisiones pendientes

### Decisiones tomadas
- **Scope** de todos los roles de empresa es `'company'`. Solo `platform_admin` tiene scope `'global'`.
- **JWT** actualmente no incluye `role` en el payload (DEC-008 A3.10 pendiente). El middleware usa el rol del usuario desde la base de datos.
- **Mongoose** acepta ambos conjuntos de roles (antiguos y nuevos) mientras MongoDB no sea migrado. Esto es intencional para evitar downtime.
- La jerarquía de invitaciones se verifica en el servidor. El cliente la filtra como UX, pero el backend la enforcea independientemente.

### Pendiente
- [ ] Migración de documentos MongoDB: reemplazar `company_owner` → `business_owner`, `company_admin` → `business_admin`, `operator` → `staff` en colección `users` e `invitations`.
- [ ] Permisos granulares para `accountant` (invoices, payments, taxes, exports) cuando los módulos existan.
- [ ] Permisos granulares para `staff` (customers, jobs, time entries, draft invoices) cuando los módulos existan.
- [ ] JWT payload migration (DEC-008 A3.10): incluir `role` + `scope` en el token para que el middleware pueda enforcer RBAC sin DB lookup.
- [ ] Evaluar si `business_admin` debe poder editar company settings en modo lectura o completo.
- [ ] Definir si `accountant` debe poder ver el Team page en modo lectura.
