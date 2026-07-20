---
tags: [technical-debt, testing]
id: TD-014
area: Testing
priority: High
status: Open
identified: 2026-06-13
action-plan: AP-007
---

# TD-014 — Unit Test Coverage Effectively 0%

## Description

The codebase contains 1 test file: `src/app.controller.spec.ts`, which verifies that `AppController.getHello()` returns `"Hello World!"`. This is a NestJS scaffold default.

No test exists for any of the following:
- `AuthService` (register, login, token rotation, reuse detection, password reset)
- `UsersService`
- `CompanyService`, `CompanyThemeService`
- `ProviderCredentialsService` — including AES-256-GCM encrypt/decrypt
- `NotificationService.notifyEvent()`
- `TemplateComposerService`, `TemplateRendererService`
- `GeneratorService`, `PdfRendererService`
- `GlobalAuthGuard`, `JwtStrategy`
- Any DTO validation
- Any controller

## Impact

- Bugs in credential encryption, auth logic, or notification routing are undetectable without manual testing.
- Refactoring any module has no safety net.
- The service cannot be safely extended or modified with confidence.

## Planned Resolution

**AP-007** — Write unit tests for the three highest-risk areas: `AuthService`, `CryptoService`/`ProviderCredentialsService`, and `NotificationService`. Coverage target: ≥ 80% on those four classes. Run as part of CI.
