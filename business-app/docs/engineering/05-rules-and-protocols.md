# 05 — Reglas de Colaboración y Protocolos de Comunicación

**Versión:** 1.0 | **Fecha:** 2026-07-06 | **Estado:** Oficial

---

## Reglas de colaboración

Estas reglas son absolutas. No tienen excepciones. Cualquier desviación es técnicamente incorrecto, no simplemente una preferencia.

---

### REGLAS DE DOMINIO

**R-DOM-001 — Ownership estricto de código**
Un agente solo modifica archivos dentro de la ruta de su dominio. Si un agente de Billing necesita que Revenue cambie algo, reporta la necesidad al CTO Agent — no toca `src/revenue/` directamente.

**R-DOM-002 — Comunicación solo por Domain Events**
Los módulos de dominio nunca se llaman directamente entre sí. `BillingService` no importa `RevenueService`. La única forma de comunicación entre bounded contexts es a través de Domain Events publicados en el Event Bus.

```
INCORRECTO:
  BillingService.constructor(private revenueService: RevenueService) {}

CORRECTO:
  @OnEvent('revenue.billing_period_closed')
  onBillingPeriodClosed(event: BillingPeriodClosedEvent) { ... }
```

**R-DOM-003 — No compartir base de datos entre dominios**
Cada dominio tiene sus propias colecciones. Ningún servicio de un dominio realiza queries directas a colecciones de otro dominio.

**R-DOM-004 — businessId siempre del JWT**
En toda operación de escritura o lectura de datos de negocio, el `businessId` se extrae del JWT autenticado. Nunca del body del request, nunca de query params, nunca de un header custom. Esta regla protege la seguridad de multi-tenancy.

**R-DOM-005 — Ningún dominio modifica upstream**
Los dominios solo modifican sus propios datos. Billing no modifica WorkEvents. Accounting no modifica Invoices. Si se necesita modificar el estado de una entidad upstream, se hace a través de un evento que el dominio dueño consume.

---

### REGLAS DE EVENTOS

**R-EVT-001 — Publicar después de persistir**
Los Domain Events se publican solo después de que la transacción a base de datos se confirmó exitosamente.

```
INCORRECTO:
  await eventBus.publish(WorkEventConfirmed { ... });
  await workEventRepo.save(workEvent);  // si falla, el evento ya fue publicado

CORRECTO:
  await workEventRepo.save(workEvent);
  await eventBus.publish(WorkEventConfirmed { ... });
```

**R-EVT-002 — Handlers idempotentes**
Todo handler de Domain Event debe ser idempotente. El mismo evento puede llegar más de una vez (at-least-once delivery). El handler debe detectar y descartar procesamientos duplicados.

**R-EVT-003 — Payloads autocontenidos**
El payload de un Domain Event debe contener toda la información necesaria para que el consumidor actúe. Un handler no debe hacer una query al dominio origen para obtener datos adicionales.

**R-EVT-004 — Eventos en tiempo pasado**
Los Domain Events se nombran en tiempo pasado: `WorkEventConfirmed`, `InvoiceSent`, `BillingPeriodClosed`. Nunca en infinitivo o imperativo.

**R-EVT-005 — Versionado de eventos**
Cuando el schema de un evento cambia, se incrementa la versión: `WorkEventConfirmed.v2`. Los handlers deben soportar múltiples versiones durante la transición. Nunca modificar el schema de un evento v1 ya en producción.

---

### REGLAS DE CÓDIGO

**R-COD-001 — Sin hardcoding de reglas de negocio**
Las reglas de negocio que pueden cambiar (Payment Terms, BillingCycle, reminder days) son configuración — no están hardcodeadas en el código. Los valores que son invariantes del dominio (sum(DR)=sum(CR), endTime>startTime) sí van en código.

**R-COD-002 — Sin secrets en el código**
Ningún secret (API key, connection string, JWT secret, OAuth token) aparece en el código. Todo secret va en variables de entorno. El código de producción falla explícitamente si un secret requerido no está configurado.

**R-COD-003 — Sin lógica en controllers**
Los controllers solo reciben el request, validan el input básico (DTOs), llaman al service, y retornan la response. La lógica de negocio vive en los services.

**R-COD-004 — Tests que documentan comportamiento**
Los tests describen el comportamiento esperado desde la perspectiva del negocio, no desde los internals de la implementación. Un test bien escrito puede leerse como especificación.

```
INCORRECTO:
  it('should call invoiceRepository.save() once')  // testa implementación

CORRECTO:
  it('should mark invoice as sent when business owner approves and sends')  // testa comportamiento
```

**R-COD-005 — No mocks de base de datos en tests de integración**
Los tests de integración usan una base de datos real (test database). Los mocks son para servicios externos (Communications Platform, Google Calendar API). Esta regla evita que tests pasen con mocks pero fallen en producción.

---

### REGLAS DE ARQUITECTURA

**R-ARC-001 — Ningún cambio arquitectónico sin ADR**
Si un agente descubre durante la implementación que la arquitectura necesita cambiar (un concepto nuevo, un cambio de responsabilidades, un boundary que no funciona), no implementa el cambio. Escala al CTO Agent para crear un ADR.

**R-ARC-002 — La documentación es código**
`docs/` se actualiza en la misma sesión en que se implementa el feature correspondiente. Un feature sin documentación actualizada no está terminado.

**R-ARC-003 — Backwards compatibility en migraciones de DB**
Las migraciones de base de datos siempre son backward-compatible en el primer paso. Primero se agrega el campo nuevo (additive). Solo después de que el código nuevo está en producción y ya no lee el campo viejo, se puede eliminar el campo viejo.

**R-ARC-004 — Ningún bypass de seguridad**
Ningún commit incluye `--no-verify` ni deshabilita guards de seguridad para "ahorrar tiempo". Si un guard bloquea algo que debería funcionar, el problema es en el guard o en el test — no en la seguridad.

---

### REGLAS DE CALIDAD

**R-QA-001 — QA siempre antes del merge**
Ningún PR se mergea sin que QA haya revisado y aprobado. La regla aplica aunque el feature parezca "trivial".

**R-QA-002 — Coverage mínimo por dominio**
Todo servicio de dominio tiene al menos tests unitarios para sus métodos de negocio y tests de integración para sus endpoints. No hay excepción para "primeras versiones" o "prototipos".

**R-QA-003 — Regresión es inaceptable**
Si un feature nuevo rompe un test existente, el feature no pasa QA. El agente debe corregir la regresión como parte de la misma tarea.

---

## Protocolo de comunicación entre agentes

---

### Formato de mensaje estándar

Todo mensaje de un agente a otro (incluyendo del CTO Agent a agentes y viceversa) sigue este formato:

```
MENSAJE {
  de:          string   — quién envía (ej. 'BillingAgent')
  para:        string   — quién recibe (ej. 'CTOAgent')
  tipo:        REPORT | BLOCKED | QUESTION | ESCALATION | COMPLETION
  taskId:      string?  — tarea relacionada (ej. 'TASK-042')
  urgencia:    HIGH | MEDIUM | LOW
  
  contenido:   string   — el mensaje en sí
  contexto:    string?  — información de fondo necesaria para entender el mensaje
  propuesta:   string?  — si el mensaje requiere decisión, la propuesta del agente
  impacto:     string?  — qué se bloquea si no se resuelve
}
```

---

### Tipos de mensaje

**REPORT — Progreso periódico**
Informa al CTO Agent el estado de avance de una tarea.

```
Ejemplo:
  de: WorkAgent
  para: CTOAgent
  tipo: REPORT
  taskId: TASK-012
  urgencia: LOW

  contenido: "WorkEvent CRUD implementado. Falta: confirmación workflow y
              Rate Engine integration. ETA: 2 sesiones más."
```

**BLOCKED — Bloqueante activo**
Un agente no puede continuar sin resolución externa. Requiere respuesta inmediata.

```
Ejemplo:
  de: BillingAgent
  para: CTOAgent
  tipo: BLOCKED
  taskId: TASK-025
  urgencia: HIGH

  contenido: "No puedo implementar la creación de Invoice Draft porque
              el payload de BillingPeriodClosed no está definido todavía.
              RevenueAgent está todavía implementando BillingPeriod."
  
  impacto: "TASK-025 no puede comenzar. TASK-026 (Document Platform)
            depende de TASK-025. Sprint 5 completo podría retrasarse."
  
  propuesta: "¿Puede CTOAgent definir el contrato del evento
              BillingPeriodClosed ahora, antes de que RevenueAgent
              termine, para que pueda implementar el handler?"
```

**QUESTION — Consulta de implementación**
El agente tiene dudas sobre cómo implementar algo y necesita clarificación.

```
Ejemplo:
  de: RevenueAgent
  para: CTOAgent
  tipo: QUESTION
  taskId: TASK-018
  urgencia: MEDIUM

  contenido: "La arquitectura dice que el BillingPeriod se crea cuando
              llega el primer WorkEventConfirmed sin período activo.
              ¿Qué pasa si llegan dos WorkEventConfirmed simultáneos
              para el mismo Contract y ninguno tiene período? ¿Race condition?"
  
  propuesta: "Implementar idempotencia con upsert en la creación del
              BillingPeriod usando (businessId, contractId, periodStart)
              como unique key. ¿Es correcto?"
```

**ESCALATION — Contradicción o problema de arquitectura**
El agente encontró algo que parece contradecir la arquitectura o que requiere una decisión de diseño.

```
Ejemplo:
  de: AnalyticsAgent
  para: CTOAgent
  tipo: ESCALATION
  urgencia: HIGH

  contenido: "El documento analytics/05-dataset-catalog.md dice que el
              BusinessDataset incluye el email del Business Owner, pero
              el domain/01-domain-overview.md dice que Analytics nunca
              accede a datos de Identity directamente. ¿Cómo proyecto
              el email en el Read Model sin romper boundaries?"
  
  impacto: "Document Platform necesita BusinessDataset para generar PDFs.
            Si no resolvemos esto, el Document Lifecycle no funciona."
```

**COMPLETION — Tarea completada**
El agente reporta que la tarea está completa y lista para revisión.

```
Ejemplo:
  de: WorkAgent
  para: CTOAgent
  tipo: COMPLETION
  taskId: TASK-012
  urgencia: LOW

  contenido: "TASK-012 completa. WorkEvent CRUD + confirmation workflow
              implementados. PR abierto en feature/work/workevent-confirmation.
              Tests: 47 unitarios + 12 integración, todos pasan.
              Documentos actualizados: docs/domain/02-ubiquitous-language.md"
  
  propuesta: "Lista para code review y QA."
```

---

### Escalation path

```
Agente individual
  ↓ (problema técnico no bloqueante)
  Resuelve solo dentro de su dominio

Agente individual
  ↓ (bloqueante o decisión que cruza dominios)
  BLOCKED/ESCALATION → CTO Agent
    ↓ (si requiere cambio arquitectónico)
    Crea ADR → documenta decisión → actualiza arquitectura → desbloquea agente

CTO Agent
  ↓ (si la decisión tiene impacto en múltiples sprints)
  Documenta en ADR + actualiza roadmap + notifica a todos los agentes afectados
```

**Regla de escalación:** Un agente nunca bloquea más de una sesión de trabajo sin escalar. Si está BLOCKED por más de una sesión, hay un problema de planificación o de comunicación — ambos son responsabilidad del CTO Agent resolver.

---

### Cómo reportar un error

```
ERROR REPORT {
  de:       string
  para:     CTOAgent
  tipo:     ESCALATION
  urgencia: HIGH

  error:       descripción exacta del error
  contexto:    qué estaba haciendo cuando ocurrió
  reproducción: cómo reproducir el error
  impacto:     qué está roto o en riesgo
  hipótesis:   qué cree el agente que causó el error
  propuesta:   qué necesitaría para investigar/resolver
}
```
