# Booking-Room Documentation Index

This directory is reorganized for AI-assisted implementation. The files below are the primary documentation set. Older converted files under `docs/design/` and `docs/requirements/` remain as traceable source material.

## Canonical Reading Order

1. [00 Project Overview](00-project-overview.md)
2. [01 Business Rules](01-business-rules.md)
3. [02 Requirements](02-requirements.md)
4. [03 ERD](03-erd.md)
5. [04 Architecture](04-architecture.md)
6. [05 Database Schema](05-database-schema.md)
7. [06 API Spec](06-api-spec.md)
8. [07 Class Specifications](07-class-specifications.md)
9. [08 UI Specifications](08-ui-specifications.md)
10. [09 User Flows](09-user-flows.md)
11. [AWS S3 Integration Guide](aws-s3-integration.md)

## Traceability Sources

- `docs/system.md`: concise system overview, roles, stack, frontend folder conventions.
- `docs/auth-logic.md`: auth-specific implementation expectations.
- `docs/requirements/projectproposal.md`: business context, proposed solution, high-level features, development plan.
- `docs/requirements/requirementanalysis/04-tổng-quan-yêu-cầu.md`: stakeholders, functional requirements, non-functional requirements.
- `docs/requirements/requirementanalysis/05-phân-tích-yêu-cầu.md`: use cases and UI mockup behavior.
- `docs/design/design/04-architectural-design.md`: architecture, class diagram, class specifications.
- `docs/design/design/05-data-design.md`: data diagram and table specifications.
- `docs/design/design/06-user-interface-and-user-experience-design.md`: screen map and screen specifications.

## AI Usage Rules

- Treat this documentation set as source of truth.
- Do not invent requirements, fields, APIs, states, or screens.
- If a detail is absent, mark it as unspecified and ask before implementing.
- If documents conflict, preserve the conflict and ask for product decision before coding.
- Preserve documented business rules even if current code diverges.
