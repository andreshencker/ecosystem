# Automation / Workflow Domain

**Versión:** 1.0 | **Fecha:** 2026-07-05 | **Estado:** Diseño conceptual oficial

---

## Qué es el dominio de Automation

El dominio de Automation es el **motor de orquestación de procesos** del ERP. Es el responsable de ejecutar secuencias de acciones que se disparan por eventos, condiciones, o tiempo — sin que ningún dominio operativo necesite hardcodear esas secuencias.

No es un scheduler simple. No es un cron job. Es un motor de workflows que puede escuchar eventos, evaluar condiciones, esperar períodos de tiempo, ejecutar acciones, manejar reintentos, y registrar toda la historia de ejecución.

---

## Por qué existe

### Sin Automation — el problema del hardcoding

```
ESCENARIO: Enviar recordatorio de pago 14 días después de vencer

SIN Automation:
  Billing implementa un job periódico:
    - Corre diariamente
    - Busca facturas vencidas hace exactamente 14 días
    - Llama a CommunicationService.sendReminder()
    - Si el recordatorio ya fue enviado, no enviar de nuevo
    - Si Communication falla, reintentar (lógica de retry en Billing)
    - Registrar en un log propio de Billing

Problemas:
  - La lógica de "cuándo avisar" vive en Billing
  - Si el cliente quiere cambiar a 7 días, modificar Billing
  - Si se agrega un segundo recordatorio (SMS), modificar Billing de nuevo
  - Si la secuencia se vuelve "14 días email → 7 días SMS → crear tarea → notificar contador"
    → Billing tiene 40 líneas de lógica de orquestación que no son de Billing
```

### Con Automation — la solución

```
CON Automation:
  Automation configura el workflow:
    WHEN: InvoiceOverdue
    THEN:
      STEP 1: SEND email (Communication)
      WAIT: 7 días
      CONDITION: invoice.status != 'paid'
      STEP 2: SEND sms (Communication)
      WAIT: 7 días
      CONDITION: invoice.status != 'paid'
      STEP 3: CREATE task ('Follow up with customer')
      STEP 4: NOTIFY user (accountant)

  Billing solo publica InvoiceOverdue.
  Billing no sabe nada de recordatorios, SMS, ni tareas.
  El workflow puede configurarse sin tocar Billing.
```

---

## Qué NO es Automation

| Lo que NO es | Lo que ES en cambio |
|---|---|
| Un dominio de negocio | Un orquestador transversal |
| El responsable de la lógica de negocio | El responsable de *cuándo* y *en qué orden* se ejecutan acciones |
| Un reemplazo de Domain Events | Un consumidor de Domain Events que orquesta reacciones |
| Un scheduler de base de datos (cron jobs) | Un motor de workflows con estado, condiciones, y reintentos |
| Un módulo de notificaciones | Puede disparar notificaciones, pero no las procesa |

---

## Índice de documentos

| Documento | Descripción |
|---|---|
| [01-automation-domain.md](./01-automation-domain.md) | Conceptos: Workflow, Trigger, Action, Condition, Delay |
| [02-workflow-model.md](./02-workflow-model.md) | Modelo formal de workflows: estructura, ejecución, idempotencia |
| [03-workflow-examples.md](./03-workflow-examples.md) | Ejemplos reales del ERP: 5 workflows documentados |
| [04-execution-model.md](./04-execution-model.md) | Ejecución, reintentos, dead letter, historial |
