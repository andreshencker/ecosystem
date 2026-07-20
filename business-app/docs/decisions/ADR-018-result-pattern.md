# ADR-018: Result Pattern — Manejo explícito de errores en la capa de aplicación

**Fecha:** 2026-07-06
**Estado:** Aceptado
**Autor:** Architecture Review — Sprint 0.5

---

## Contexto

Sin un patrón acordado para el manejo de errores en los use cases, los dominios mezclan estrategias: algunos lanzan excepciones, otros retornan null, otros usan tipos de unión ad-hoc. Esta inconsistencia hace difícil razonar sobre qué errores puede retornar un use case y cómo manejarlos en los controllers.

El patrón Result<T> (también conocido como Railway-Oriented Programming) formaliza el contrato: un use case siempre retorna un `Result<T>` que puede ser éxito (con valor) o falla (con error tipado).

---

## Decisión

Todos los use cases del ERP retornan `Result<T>` de `shared/application/result.ts`.

### Contrato

```typescript
export class Result<T, E extends ResultError = ResultError> {
  static ok<T>(value: T): Result<T, never>
  static fail<T = never, E extends ResultError = ResultError>(error: E): Result<T, E>

  get isOk(): boolean
  get isFail(): boolean
  get value(): T      // lanza Error si isFail
  get error(): E      // lanza Error si isOk
  map<U>(fn: (value: T) => U): Result<U, E>
  getOrElse(fallback: T): T
}
```

### Either<L, R>

Para casos donde se necesita retornar uno de dos valores posibles (no necesariamente error/éxito), se usa `Either<L, R>` de `shared/application/either.ts`.

### ApplicationError

Los errores en `Result.fail()` deben ser instancias de `ApplicationError` o sus subtipos del Shared Kernel:
- `ApplicationError` — error genérico de use case
- `BusinessError` — violación de regla de negocio
- `ValidationError` — validación de input fallida
- `NotFoundError` — recurso no encontrado
- `ConflictError` — conflicto de unicidad o estado
- `AuthorizationError` — acceso denegado
- `InfrastructureError` — fallo de infraestructura (DB, redis, etc.)

---

## Reglas de implementación

**ADR-018-R001:** Los controllers traduce el `Result` al HttpStatus apropiado:
- `Result.isOk` → 200/201
- `NotFoundError` → 404
- `ConflictError` → 409
- `ValidationError` → 422
- `BusinessError` → 422
- `AuthorizationError` → 403
- `InfrastructureError` → 500

**ADR-018-R002:** Los use cases **no lanzan excepciones** como mecanismo de control de flujo. Solo lanzan para errores verdaderamente inesperados (bugs, invariantes violados).

**ADR-018-R003:** Los domain events no se publican si el `Result` es falla.

**ADR-018-R004:** El `Result` en `UseCase.execute()` tiene el tipo de error como parámetro genérico opcional: `Result<T, MyError>`. Para use cases simples, `Result<T>` usa el default `ResultError`.

---

## Consecuencias

### Positivas
- Los controllers saben exactamente qué errores puede retornar cada use case
- No hay excepciones "sorpresa" desde la capa de aplicación
- La lógica de error es explícita y traceable
- El type system verifica el manejo de errores

### Negativas
- Verbosidad adicional — cada operación necesita `Result.ok()` o `Result.fail()`
- Los developers deben acostumbrarse a no usar `throw` como control de flujo
- Las librerías de terceros siguen lanzando excepciones — el boundary de integración debe capturarlas y convertirlas a `Result.fail()`

---

## Alternativas descartadas

**Alternativa A: Excepciones + NestJS filters** — Los use cases lanzan excepciones tipadas, los exception filters las traducen a HTTP responses. Descartado porque las excepciones son invisibles en los tipos de retorno.

**Alternativa B: Null / undefined para "no encontrado"** — `findById()` retorna `null` para no encontrado. Descartado porque no distingue entre "no encontrado" y otros errores.

---

## Documentos relacionados

- `ADR-011-shared-kernel.md` — Result y Either son parte del Shared Kernel
- `ADR-017-value-objects.md` — Value Objects usados en los resultados exitosos
