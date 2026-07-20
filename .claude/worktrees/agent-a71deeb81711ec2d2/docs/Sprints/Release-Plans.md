---
tags: [development]
---

# Release Plans

## Current Phase

**Phase 1A — Communication Service**
Single git commit ("first commit") as of 2026-06-13. The service architecture is established; feature-level implementation is in progress. No version has been tagged. Package version is `0.0.1`.

## Upcoming Releases

| Version | Target Date | Scope | Status |
|---|---|---|---|
| v0.1.0 | TBD | Communication Service — feature-complete Phase 1A | In progress |
| v0.2.0 | TBD | Communication Service — stable, tested, documented | Planned |

## Release History

| Version | Date | Highlights |
|---|---|---|
| — | 2026-06-13 | Initial commit — project scaffolded, architecture established |

## Release Checklist

For the Communication Service first release:

- [ ] All NestJS modules implemented and wired
- [ ] End-to-end notification delivery tested (email + SMS)
- [ ] Provider credential encryption verified
- [ ] File generation tested (PDF, XLSX, CSV)
- [ ] Environment variables documented
- [ ] Swagger docs complete and accurate
- [ ] Health check endpoint returning correct status
- [ ] Jest unit test coverage established
- [ ] E2E tests passing
- [ ] `.env.example` up to date
- [ ] Dockerfile builds cleanly
- [ ] docker-compose starts correctly

## Notes

- No CI/CD pipeline exists yet. Releases are manual.
- No staging environment has been configured.
- MongoDB Atlas cluster must be provisioned before first deployment.
