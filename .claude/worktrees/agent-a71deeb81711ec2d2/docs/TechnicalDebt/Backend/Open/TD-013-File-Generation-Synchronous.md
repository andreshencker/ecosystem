---
tags: [technical-debt, performance]
id: TD-013
area: Performance
priority: Low
status: Open
identified: 2026-06-13
action-plan: AP-015
---

# TD-013 — File Generation Synchronous, Queue Unused

## Description

`GeneratorService` (PDF via Puppeteer, XLSX via ExcelJS, CSV) runs synchronously on the HTTP request thread. `FILE_GENERATION_QUEUE` is registered but never used — no `queue.add()` call exists in the file generation path.

## Impact

PDF generation (Puppeteer headless Chrome) is CPU and memory-intensive. Running it on the HTTP thread:
- Blocks the event loop during rendering
- Ignores the `PUPPETEER_MAX_CONCURRENT` concurrency configuration
- Can cause memory spikes under concurrent report generation requests

Lower severity than TD-007 because report generation is typically less frequent than notification sending.

## Planned Resolution

**AP-015** — Implement `FILE_GENERATION_PROCESSOR`. `POST /files/reports/generate/pdf` returns `202 Accepted` with a job ID. Processor respects `PUPPETEER_MAX_CONCURRENT`. Completed file stored in S3 with a presigned download URL available via a status endpoint.
