# ADR-017: Value Objects Policy — Uso obligatorio de Value Objects para conceptos del dominio

**Fecha:** 2026-07-06
**Estado:** Aceptado
**Autor:** Architecture Review — Sprint 0.5

---

## Contexto

Sin una política clara, los conceptos del dominio como Money, Email, Address, o Currency se representan como primitivos (`string`, `number`) directamente en las entidades. Esto genera:

- Validación duplicada en múltiples lugares
- Operaciones inválidas (sumar dos montos en distintas monedas sin verificar)
- Comparaciones incorrectas (comparar emails con distinto case)
- Expresividad reducida en el código

Los Value Objects resuelven estos problemas encapsulando la validación y el comportamiento junto con el dato.

---

## Decisión

Los conceptos del dominio listados a continuación se representan siempre como Value Objects, nunca como primitivos dentro de las entidades de dominio.

### Value Objects del Shared Kernel

| Value Object | Archivo | Uso |
|---|---|---|
| `Money` | `domain/value-objects/money.vo.ts` | Montos monetarios con currency |
| `Percentage` | `domain/value-objects/percentage.vo.ts` | Porcentajes entre 0 y 100 |
| `Currency` | `domain/value-objects/currency.vo.ts` | Código ISO 4217 (3 letras) |
| `Email` | `domain/value-objects/email.vo.ts` | Dirección de email normalizada |
| `Phone` | `domain/value-objects/phone.vo.ts` | Número de teléfono |
| `Website` | `domain/value-objects/website.vo.ts` | URL válida |
| `Address` | `domain/value-objects/address.vo.ts` | Dirección física con componentes |
| `Locale` | `domain/value-objects/locale.vo.ts` | BCP-47 locale (ej. en-AU) |
| `Timezone` | `domain/value-objects/timezone.vo.ts` | IANA timezone (ej. Australia/Sydney) |
| `Country` | `domain/value-objects/country.vo.ts` | ISO 3166-1 alpha-2 (2 letras) |
| `Language` | `domain/value-objects/language.vo.ts` | ISO 639-1 alpha-2 (2 letras) |
| `UUID` | `domain/value-objects/uuid.vo.ts` | Identificador UUID v4 |
| `EntityId` | `domain/value-objects/entity-id.vo.ts` | ID de entidad (UUID wrapper) |
| `TenantId` | `domain/value-objects/tenant-id.vo.ts` | ID de tenant |
| `CorrelationId` | `domain/value-objects/correlation-id.vo.ts` | ID de correlación de request |

### Reglas de diseño de Value Objects

**ADR-017-R001:** Los Value Objects son **inmutables**. Sus props están congeladas (`Object.freeze`). Cualquier "mutación" retorna una nueva instancia.

**ADR-017-R002:** Los Value Objects tienen **igualdad por valor**, no por referencia. El método `equals()` compara props, no identidad de objeto.

**ADR-017-R003:** Los Value Objects son **auto-validantes**. El constructor (o el método factory estático) valida sus invariantes y lanza `Error` si son inválidos. Un Value Object que existe siempre es válido.

**ADR-017-R004:** Los Value Objects del Shared Kernel solo se modifican cuando el cambio aplica universalmente. Los conceptos de negocio específicos de un dominio viven en ese dominio.

**ADR-017-R005:** En los schemas de Mongoose, los Value Objects se persisten como sus tipos primitivos equivalentes. La reconstrucción ocurre en el método `toDomain()` del repositorio.

---

## Consecuencias

### Positivas
- Validación garantizada — un Email que existe es siempre un email válido
- Operaciones type-safe — `Money.add()` no acepta monedas distintas
- Código más expresivo y autodocumentado
- Eliminación de validación duplicada

### Negativas
- Overhead de instanciación para casos simples (un email es ahora un objeto)
- Los mappers de persistencia deben convertir entre primitivos y Value Objects
- Curva de aprendizaje para desarrolladores no familiarizados con DDD

---

## Documentos relacionados

- `ADR-011-shared-kernel.md` — Shared Kernel que provee los Value Objects
- `ADR-012-repository-pattern.md` — repositorios que manejan la conversión VO ↔ primitivo
