# Canonical Business Model — Invoice App ERP

**Versión:** 1.0 | **Fecha:** 2026-07-05 | **Estado:** Oficial — Lenguaje canónico del ERP

---

## Qué es el Canonical Business Model

El Canonical Business Model (CBM) es el **lenguaje oficial e inequívoco del ERP**. Define con precisión qué significa cada concepto del negocio, cómo se llama, cuáles son sus reglas fundamentales, y cómo evoluciona a lo largo del tiempo.

No describe tecnología. No describe bases de datos. No describe frameworks. Describe el negocio tal como existe en la realidad — antes de que ninguna línea de código se escriba.

Es el documento que responde a la pregunta más costosa del desarrollo de software:

> *"Cuando dices Business, ¿qué exactamente significa eso?"*

Si esta pregunta tiene múltiples respuestas entre los miembros del equipo, hay un problema de modelo. El CBM garantiza que hay exactamente una respuesta, documentada, compartida, y aplicada consistentemente.

---

## Por qué existe

### El problema de la ambigüedad semántica

En cualquier proyecto de software que crece, el lenguaje se fragmenta. El backend llama `company` a lo que el frontend llama `organization`, a lo que el contador llama `entidad legal`, a lo que el usuario llama `mi negocio`. Todos hablan de lo mismo. Nadie lo sabe.

Esta fragmentación tiene consecuencias reales:
- Reuniones donde se pierde tiempo resolviendo qué significa un término
- Código donde `company`, `organization`, `tenant`, y `business` coexisten para el mismo concepto
- Bugs causados por un desarrollador que usó `Client` donde el dominio dice `Customer`
- Documentación que contradice al código que contradice a los tests

El CBM es la vacuna contra este problema. Una vez definido, cada documento, cada variable, cada endpoint, cada mensaje de usuario usa exactamente el mismo lenguaje.

### El problema de la evolución sin ancla

Sin un modelo canónico, cuando el sistema crece (se agregan Expenses, Payroll, Inventory), cada nuevo módulo inventa sus propios términos. El CBM garantiza que los nuevos módulos hablan el mismo idioma que los existentes — porque el idioma fue definido antes que cualquier módulo.

---

## Diferencia entre Arquitectura, Business Model, Domain Model, e Implementation

```
ARQUITECTURA
  ├── Qué Bounded Contexts existen
  ├── Cómo se comunican (Domain Events, ACL)
  ├── Qué patrones se usan (DDD, CQRS, EDA)
  └── Cómo evolucionan a 10 años
  RESPONDE: ¿Cómo está estructurado el sistema?

        │
        ▼

CANONICAL BUSINESS MODEL (este documento)
  ├── Qué significa cada concepto del negocio
  ├── Cuál es el lenguaje oficial
  ├── Qué reglas son universales e invariantes
  ├── Cuál es el ciclo de vida de cada concepto
  └── Qué puede y qué no puede hacer cada parte del sistema
  RESPONDE: ¿Qué es cada cosa y qué reglas la gobiernan?

        │
        ▼

DOMAIN MODEL
  ├── Cuáles son las entidades (Aggregates, Entities, Value Objects)
  ├── Cuáles son las invariantes técnicas
  ├── Cómo se relacionan formalmente las entidades
  └── Qué servicios de dominio son necesarios
  RESPONDE: ¿Cómo se modela con precisión para implementar?

        │
        ▼

IMPLEMENTATION
  ├── Schemas de base de datos
  ├── APIs y contratos
  ├── Código de aplicación
  └── Tests
  RESPONDE: ¿Cómo funciona técnicamente?
```

**La regla de flujo:** Ninguna decisión de Domain Model debe contradecir el Business Model. Ninguna decisión de Implementation debe contradecir el Domain Model. El flujo es unidireccional — hacia abajo.

---

## Cómo se relaciona con los Bounded Contexts

Los Bounded Contexts (definidos en `docs/architecture/01-bounded-contexts.md`) son las fronteras estructurales del sistema. El CBM define el vocabulario que vive dentro de cada contexto.

```
BOUNDED CONTEXT: Billing
  ├── Posee: Invoice, InvoiceItem, Payment
  └── El CBM define:
        ├── Qué ES un Invoice (un documento financiero exigible)
        ├── Qué NO ES un Invoice (no es un contrato, no es un journal entry)
        ├── Qué reglas lo gobiernan (siempre tiene al menos un InvoiceItem)
        └── Cómo evoluciona (Draft → Sent → Paid → Archived)
```

Un Bounded Context sin CBM es una caja estructural sin semántica. El CBM llena esa caja con significado.

---

## Cómo se relaciona con el Domain Model

El CBM es el contrato que el Domain Model debe respetar. Cuando el Domain Model define el Aggregate `Invoice`, los invariantes de ese Aggregate deben ser exactamente los que el CBM dice que son las reglas del Invoice.

Si el CBM dice "un Invoice siempre tiene al menos un InvoiceItem", el Aggregate `Invoice` debe reforzar esa regla como invariante. No es una decisión del desarrollador — está definida en el CBM.

---

## Cómo evoluciona

El CBM no es estático. Evoluciona cuando:

1. **Se agrega un nuevo concepto de negocio** (ej. Expense en Fase 6): se agrega la definición, el ciclo de vida, las reglas, y el lenguaje canónico.

2. **Un concepto cambia de responsabilidad** (ej. Payment pasa de 1:1 con Invoice a N:M): se actualiza la definición y las reglas, y se crea un ADR explicando el cambio.

3. **Se detecta ambigüedad** (ej. dos personas del equipo entienden "Supplier" de forma distinta): se resuelve en el CBM y se propaga a toda la documentación.

Lo que NUNCA cambia en el CBM:
- Los términos canónicos una vez adoptados no se renombran sin deprecar el anterior
- Las reglas de negocio fundamentales (ej. "un JournalEntry es inmutable") son permanentes
- El lenguaje oficial se aplica retroactivamente — si se descubre que "Client" se usó en un lugar, se corrige

---

## Índice de documentos

| Documento | Qué responde |
|---|---|
| [01-business-glossary.md](./01-business-glossary.md) | ¿Qué significa cada concepto? |
| [02-ubiquitous-language.md](./02-ubiquitous-language.md) | ¿Cómo se llama oficialmente cada cosa? |
| [03-business-lifecycles.md](./03-business-lifecycles.md) | ¿Por qué estados pasa cada concepto? |
| [04-business-rules.md](./04-business-rules.md) | ¿Qué reglas son absolutas e invariantes? |
| [05-business-capabilities.md](./05-business-capabilities.md) | ¿Qué puede hacer el ERP? |
| [06-business-boundaries.md](./06-business-boundaries.md) | ¿Qué NO puede hacer cada parte del sistema? |
| [07-business-evolution.md](./07-business-evolution.md) | ¿Cómo crecerá el negocio en 10 años? |
| [08-business-provisioning.md](./08-business-provisioning.md) | ¿Cómo nace operativo un Business? |
| [09-rate-engine.md](./09-rate-engine.md) | ¿Cómo se calcula el valor de cada WorkEvent? |

---

## Cómo usar este documento

### Para nuevos desarrolladores
Leer en este orden: README → 01 (qué es cada cosa) → 02 (cómo se llama) → 04 (qué reglas aplican).

### Para tomar decisiones de diseño
Si hay duda sobre qué concepto usar o qué regla aplica: consultar 01 y 04 antes de escribir código.

### Para agregar un nuevo módulo
Antes de diseñar el Domain Model del nuevo módulo: actualizar 01 (glosario), 02 (lenguaje), 03 (lifecycle), y 05 (capacidades).

### Para resolver ambigüedades
Si dos personas del equipo tienen entendimientos distintos de un término: el CBM es el árbitro. Si el CBM no cubre el caso, actualizarlo antes de escribir código.

---

## El principio de autoridad del CBM

> Cuando el código y el CBM contradicen, el CBM tiene razón. El código tiene un bug.
>
> Cuando la documentación y el CBM contradicen, el CBM tiene razón. La documentación tiene un error.
>
> Cuando dos desarrolladores y el CBM contradicen, el CBM tiene razón. Una conversación tiene un malentendido.
