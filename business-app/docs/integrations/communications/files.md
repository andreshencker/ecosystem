# Communications — Files

**Versión:** 0.1 | **Fecha:** 2026-07-07 | **Estado:** Definición pendiente — documento base

---

## Qué es Files en el contexto de Communications

Files es la segunda capacidad de Communications App, independiente de Notifications. Cubre la generación y almacenamiento de documentos (principalmente PDFs) que pueden adjuntarse a notificaciones o descargarse directamente.

---

## Lo que sabemos hasta ahora

**Files y Notifications son capacidades separadas.**
Un PDF puede generarse sin que se envíe ninguna notificación. Una notificación puede enviarse sin adjuntar ningún archivo. Son flujos independientes.

**Communications App puede generar PDFs.**
La capacidad está contemplada en la arquitectura: Invoices, contratos, y otros documentos formales del Business se renderizan como PDF y se almacenan en un storage accesible.

**El flujo planificado** (referencia: `docs/architecture/06-integration-architecture.md` §OB-03):
```
InvoiceSent event
  → PDF Service (dentro de Communications)
  → Fetch Invoice data (via read model)
  → Merge con template del Business (logo, colores)
  → Generate PDF
  → Store en object storage (S3/R2)
  → URL del PDF disponible para adjuntar en el email
```

---

## Lo que NO está definido (preguntas abiertas)

Las siguientes decisiones deben documentarse en un ADR o DEC antes de implementar Files.

**1. ¿Quién inicia la generación del PDF?**
¿Business App le pide a Communications que genere el PDF? ¿O Communications lo genera automáticamente al recibir ciertos eventos?

**2. ¿Cómo se entrega el PDF al usuario final?**
¿Se adjunta al email de notificación? ¿Se retorna una URL de descarga en el response de la API? ¿Ambas opciones?

**3. ¿Dónde se almacenan los PDFs?**
¿Communications App tiene su propio storage? ¿Usa el storage del Business (S3/R2 configurado en Document Management)? ¿Un storage separado de la plataforma?

**4. ¿Cómo se asocian los PDFs a los documentos en Business App?**
Cuando Communications genera un PDF de una Invoice, ¿el URL del PDF vuelve a Business App para almacenarse en el registro del documento?

**5. ¿Cuánto tiempo persisten los PDFs en Communications?**
¿Tienen una retención propia o simplemente apuntan al storage del Business?

**6. ¿Existe un endpoint de preview de PDF sin envío?**
Para que el Business Owner pueda previsualizar cómo quedará el PDF de su Invoice antes de enviarlo.

---

## Lo que NO se debe mezclar con Notifications

- Los logs de generación de PDF son distintos a los logs de entrega de notificaciones.
- Un fallo en la generación del PDF no debe cancelar el envío de la notificación (o sí — esta es una de las preguntas abiertas).
- Las credenciales del proveedor de storage (para Files) son distintas a las credenciales del proveedor de email (para Notifications).

---

## Próximos pasos

Antes de implementar Files, debe existir un ADR que responda las preguntas abiertas de §2.

Cuando ese ADR esté aceptado, actualizar este documento con:
- Cómo se comunica Business App con Communications para solicitar PDFs
- Qué variables de entorno requiere la integración de Files
- Cómo se prueba la generación de un PDF

---

## Referencias

| Documento | Contenido relevante |
|---|---|
| [`README.md`](./README.md) | Arquitectura general de la integración con Communications |
| [`notifications.md`](./notifications.md) | Notifications — capacidad independiente de Files |
| `docs/architecture/06-integration-architecture.md` §OB-03 | PDF Generation — diseño conceptual inicial |
| `docs/domain/document-management/01-document-domain.md` | Document Management Domain — donde viven los documentos del Business |
