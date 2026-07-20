# 02 — Domain Ownership

**Versión:** 1.0 | **Fecha:** 2026-07-05 | **Estado:** Oficial

> **Principio:** Cada pieza de información tiene exactamente un dueño. Solo el dueño puede escribir. Los demás solo pueden leer a través de contratos publicados.

Una violación de ownership es cuando un dominio modifica directamente datos que pertenecen a otro dominio. Es el origen del 90% de los problemas de acoplamiento en sistemas grandes.

---

## Notación

| Rol | Significado |
|---|---|
| **Owner** | El único dominio que puede escribir esta entidad |
| **Readers** | Dominios que pueden leer esta entidad directamente o vía contratos |
| **Publishers** | Dominios que publican eventos relacionados con esta entidad |
| **Consumers** | Dominios que consumen eventos de esta entidad para construir sus propios modelos |
| **Never writes** | Dominios que explícitamente no pueden modificar esta entidad |

---

## IDENTITY DOMAIN

### `User`
| | |
|---|---|
| **Owner** | Identity |
| **Readers** | Business (para resolver businessId), Work (para asignar UserId a WorkEvent) |
| **Publishers** | Identity |
| **Consumers** | Business, Communication, Analytics |
| **Never writes** | Billing, Accounting, Financial, Work, Customer |

**Rationale:** El User existe en el dominio de autenticación. Billing no necesita modificar usuarios. Work no crea usuarios. Solo Identity crea, actualiza y desactiva usuarios.

---

### `RefreshToken`
| | |
|---|---|
| **Owner** | Identity |
| **Readers** | Solo Identity |
| **Publishers** | Identity |
| **Consumers** | Ninguno |
| **Never writes** | Todos los demás dominios |

---

### `Invitation`
| | |
|---|---|
| **Owner** | Identity |
| **Readers** | Identity, Communication (para enviar el email) |
| **Publishers** | Identity |
| **Consumers** | Communication |
| **Never writes** | Todos los demás dominios |

---

## BUSINESS DOMAIN

### `Business`
| | |
|---|---|
| **Owner** | Business |
| **Readers** | Todos los dominios (para verificar el businessId del tenant) |
| **Publishers** | Business |
| **Consumers** | Customer, Work, Billing, Financial, Accounting, Communication, Analytics |
| **Never writes** | Identity (Identity publica el evento que crea el Business), Customer, Work, Billing, Accounting |

**Rationale:** El Business es el anchor. Todos lo leen para validar ownership. Nadie excepto Business lo modifica.

---

### `FiscalProfile`
| | |
|---|---|
| **Owner** | Business |
| **Readers** | Billing (para generar número de factura y datos del emisor), Accounting (política contable) |
| **Publishers** | Business |
| **Consumers** | Billing, Accounting, Analytics |
| **Never writes** | Billing, Work, Customer, Accounting, Financial |

---

## CUSTOMER DOMAIN

### `Customer`
| | |
|---|---|
| **Owner** | Customer |
| **Readers** | Work (para validar Customer en Contract), Billing (datos para la factura), Analytics |
| **Publishers** | Customer |
| **Consumers** | Work, Billing, Communication, Analytics |
| **Never writes** | Identity, Business, Work, Billing, Accounting |

---

### `Contact`
| | |
|---|---|
| **Owner** | Customer |
| **Readers** | Communication (para el email de destino), Billing |
| **Publishers** | Customer |
| **Consumers** | Communication, Billing |
| **Never writes** | Todos los demás |

---

## WORK DOMAIN

### `Contract`
| | |
|---|---|
| **Owner** | Work |
| **Readers** | Billing (para asociar Invoice a Contract), Analytics |
| **Publishers** | Work |
| **Consumers** | Billing, Analytics |
| **Never writes** | Billing, Accounting, Financial, Calendar |

---

### `Rate`
| | |
|---|---|
| **Owner** | Work |
| **Readers** | Work mismo (para calcular WorkEvent), Analytics |
| **Publishers** | Work |
| **Consumers** | Analytics |
| **Never writes** | Billing, Calendar, Accounting |

**Rationale:** La Rate pertenece al Work domain porque es el precio que define cómo se calcula el tiempo en dinero — un concepto operativo, no contable. Billing lee el `calculatedAmount` del WorkEvent, no la Rate directamente.

---

### `WorkEvent`
| | |
|---|---|
| **Owner** | Work |
| **Readers** | Billing (para crear InvoiceItems), Analytics |
| **Publishers** | Work |
| **Consumers** | Billing, Financial, Analytics |
| **Never writes** | Billing (solo puede notificar vía evento que fue facturado), Accounting, Calendar |

**Nota crítica:** Cuando Billing crea un InvoiceItem a partir de un WorkEvent, NO escribe en WorkEvent directamente. Billing publica `InvoiceItemCreated`. Work consume ese evento y actualiza el estado del WorkEvent a `invoiced`. Esta separación garantiza que Work siempre controla el estado de sus propias entidades.

---

## CALENDAR DOMAIN

### `CalendarIntegration`
| | |
|---|---|
| **Owner** | Calendar |
| **Readers** | Solo Calendar |
| **Publishers** | Calendar |
| **Consumers** | Work (para crear WorkEvents desde eventos importados) |
| **Never writes** | Work, Billing, Accounting |

---

## BILLING DOMAIN

### `Invoice`
| | |
|---|---|
| **Owner** | Billing |
| **Readers** | Financial (para crear FinancialTransaction), Communication (datos para el email), Analytics |
| **Publishers** | Billing |
| **Consumers** | Financial, Communication, Analytics, Work (InvoiceVoided) |
| **Never writes** | Financial, Accounting, Work, Calendar |

---

### `InvoiceItem`
| | |
|---|---|
| **Owner** | Billing |
| **Readers** | Financial (suma de items para FinancialTransaction), Analytics |
| **Publishers** | Billing |
| **Consumers** | Financial, Analytics |
| **Never writes** | Work, Accounting |

---

### `Payment`
| | |
|---|---|
| **Owner** | Billing |
| **Readers** | Financial (para crear FinancialTransaction de PAYMENT_RECEIVED), Analytics |
| **Publishers** | Billing |
| **Consumers** | Financial, Communication, Analytics |
| **Never writes** | Financial, Accounting, Work |

---

## FINANCIAL DOMAIN

### `FinancialTransaction`
| | |
|---|---|
| **Owner** | Financial |
| **Readers** | Accounting (para procesar y generar JournalEntry), Analytics |
| **Publishers** | Financial (a través de FinancialTransactionFactories) |
| **Consumers** | Accounting, Analytics |
| **Never writes** | Billing, Work, Calendar, Identity, Business — **absolutamente nadie excepto Financial** |

**Rationale:** La FinancialTransaction es el contrato entre el mundo operativo y el contable. Solo Financial tiene autoridad para crear y mantener este contrato. Un módulo operativo que crea FinancialTransactions directamente viola la arquitectura.

---

### `PostingRule`
| | |
|---|---|
| **Owner** | Platform (las reglas estándar) + Financial (las reglas por Business) |
| **Readers** | Financial (Accounting Engine, Posting Engine) |
| **Publishers** | Platform |
| **Consumers** | Financial |
| **Never writes** | Billing, Work, Business, todos los módulos operativos |

---

## ACCOUNTING DOMAIN

### `ChartOfAccounts` y `Account`
| | |
|---|---|
| **Owner** | Accounting |
| **Readers** | Financial (Posting Engine — para resolver Account Codes), Analytics |
| **Publishers** | Accounting |
| **Consumers** | Financial, Analytics |
| **Never writes** | Billing, Work, Financial (solo lee), Business |

---

### `Journal` y `JournalEntry`
| | |
|---|---|
| **Owner** | Accounting |
| **Readers** | Analytics (vía Read Models), Auditor (interfaz de solo lectura) |
| **Publishers** | Accounting |
| **Consumers** | Analytics |
| **Never writes** | **Absolutamente nadie excepto el Accounting Engine** |

**Esta es la regla más importante del sistema.** El Journal Entry es el registro contable formal. Si cualquier módulo operativo pudiera escribir aquí, la integridad del libro mayor estaría comprometida.

---

### `GeneralLedger` (LedgerAccount)
| | |
|---|---|
| **Owner** | Accounting |
| **Readers** | Analytics, Reporting Engine |
| **Publishers** | Accounting |
| **Consumers** | Analytics, Reporting |
| **Never writes** | Todos — incluyendo el propio Accounting solo lo actualiza como efecto del JournalEntry, nunca directamente |

---

### `FiscalPeriod`
| | |
|---|---|
| **Owner** | Accounting |
| **Readers** | Financial (para verificar que el período está abierto), Business (para UI) |
| **Publishers** | Accounting |
| **Consumers** | Financial, Analytics |
| **Never writes** | Billing, Work, Financial |

---

## COMMUNICATION DOMAIN

### `CommunicationConnection`
| | |
|---|---|
| **Owner** | Communication |
| **Readers** | Communication mismo |
| **Publishers** | Communication |
| **Consumers** | Communication |
| **Never writes** | Billing, Work, Accounting |

---

### `CommunicationLog`
| | |
|---|---|
| **Owner** | Communication |
| **Readers** | Communication (para UI de historial), Analytics |
| **Publishers** | Communication |
| **Consumers** | Analytics |
| **Never writes** | Nadie — es inmutable desde su creación |

---

## ANALYTICS DOMAIN

### Read Models (Dashboard, Reports, Projections)
| | |
|---|---|
| **Owner** | Analytics |
| **Readers** | Frontend, BI tools, ML pipelines |
| **Publishers** | Analytics (como proyecciones derivadas de Domain Events) |
| **Consumers** | Ninguno — Analytics es el consumidor terminal |
| **Never writes** | Analytics nunca modifica datos fuera de su propio dominio |

---

## Resumen de ownership

| Entidad | Owner | Writes | Reads |
|---|---|---|---|
| User | Identity | Identity | Business, Work |
| Business | Business | Business | Todos (scope) |
| FiscalProfile | Business | Business | Billing, Accounting |
| Customer | Customer | Customer | Work, Billing |
| Contact | Customer | Customer | Communication |
| Contract | Work | Work | Billing, Analytics |
| Rate | Work | Work | Work |
| WorkEvent | Work | Work | Billing, Financial |
| CalendarIntegration | Calendar | Calendar | — |
| Invoice | Billing | Billing | Financial, Communication |
| InvoiceItem | Billing | Billing | Financial |
| Payment | Billing | Billing | Financial, Communication |
| FinancialTransaction | Financial | Financial | Accounting |
| PostingRule | Platform/Financial | Platform | Financial |
| ChartOfAccounts | Accounting | Accounting | Financial |
| JournalEntry | Accounting | **Solo Accounting Engine** | Analytics |
| GeneralLedger | Accounting | **Solo Accounting Engine** | Analytics |
| FiscalPeriod | Accounting | Accounting | Financial |
| CommunicationConnection | Communication | Communication | — |
| CommunicationLog | Communication | **Inmutable** | Analytics |
| Read Models | Analytics | Analytics | Frontend, BI |
