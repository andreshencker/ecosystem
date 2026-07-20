---
tags: [development]
---

# Backlog

Platform-level backlog — items that span services or concern the platform as a whole. Service-specific backlogs are in each module folder.

→ [[Modules/Communication/Backend/Backlog]] — Communication Backend items

---

## High Priority

- [ ] CI/CD pipeline (GitHub Actions or equivalent) — covers the Communication Backend first, extensible to future services
- [ ] Staging environment provisioned (MongoDB Atlas cluster, Redis, environment config)
- [ ] MongoDB Atlas cluster set up for development and staging

## Medium Priority

- [ ] Infrastructure as code — Terraform for AWS (S3, Secrets Manager), Atlas, Redis
- [ ] Centralised structured logging across services (correlation IDs already in place in Communication Backend)
- [ ] Monitoring and alerting (error rates, queue depth, delivery failures)
- [ ] Kubernetes manifests for production deployment

## Future Services *(planned — no implementation work yet)*

- [ ] Communication Frontend — web dashboard for company management
- [ ] Invoice Service — invoice creation, delivery, payment tracking
- [ ] Reporting Service — cross-service analytics and exports
- [ ] Billing Service — subscription and billing management
- [ ] API Gateway — unified entry point, edge auth, rate limiting

## Icebox

- [ ] Multi-region support
- [ ] White-label support
