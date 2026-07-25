# ComplyAI — Development Guide

## Product context

ComplyAI (working product name: **Didban Audit**) is an enterprise, on-premise platform for continuous audit and financial-transaction assurance. It integrates with accounting and ERP systems; it does **not** replace them. Its users include internal auditors, finance teams, risk managers, legal specialists, and system administrators.

The authoritative product brief is [docs/پروپوزال.docx](docs/پروپوزال.docx). Preserve its core intent whenever implementing features:

- Analyze accounting documents, line items, and supporting evidence for legal, tax, insurance, accounting, audit, and internal-policy compliance.
- Surface risk indicators and auditable findings; do not present AI output as a conclusive legal judgment.
- Keep legal and AI answers traceable: citations must identify the source, relevant article/section, page, law version, and validity period.
- Support both real-time processing of new documents and historical/batch **Audit Runs**.

## Current repository state

- `frontend/` is a TanStack Start + React + TypeScript + Tailwind CSS prototype generated with Lovable.
- Audit Runs are currently simulated in-browser and persisted in `localStorage`. Treat this only as UI-demo behavior.

## Architecture direction

Build toward a modular, separately deployable system:

- Frontend: React, TypeScript, Tailwind CSS.
- Application backend: authenticated REST API, integration adapters, rule engine, audit findings, reporting, and immutable audit trail.
- Document/AI services: server-side OCR, text and table extraction, document classification and matching, embeddings, reranking, local LLM inference, and RAG.
- Storage: PostgreSQL for transactional data; Qdrant or pgvector for vectors; MinIO/object storage for originals; Redis for cache; RabbitMQ for asynchronous processing.
- Deployment: Docker, private container registry, reverse proxy, and an initial three-server on-premise topology (application, database, AI). Keep future Kubernetes migration possible.

Never move OCR, rule evaluation, AI analysis, or Audit Run execution into the browser. Production Audit Runs must use durable background workers and queues, with persisted run status, checkpoints, events, retries, cancellation, and progress streamed to the UI (WebSocket or SSE).

## Domain invariants

- Enforce role-based access control and scope data access by organization/company and organizational unit. Plan for Active Directory/LDAP integration.
- Preserve originals and compute a file hash for every uploaded supporting document. Do not silently overwrite evidence.
- Audit trails must record sensitive access and state-changing operations and must be append-only/tamper-evident by design.
- Version laws, standards, internal policies, and controls with effective date ranges. Never delete historical legal/control versions that support prior findings.
- Deterministic controls belong in the rule engine. AI may explain, summarize, classify, and prioritize, but must not silently override deterministic results or professional review.
- Mark price/quantity anomalies as risk signals, not proof of fraud or violation. Account for confidence, provenance, and human review.
- Treat financial documents and credentials as confidential. Prefer on-premise processing, least-privilege access, encryption in transit/at rest, and redaction-safe logging.

## Implementation and validation

- Make types explicit at API, queue-message, database, and UI boundaries. Validate untrusted inputs server-side.
- Design integrations as adapters so more than one accounting/ERP source can be supported without leaking source-specific rules into the core domain.
- Make worker jobs idempotent and retry-safe; attach each result to the exact document, control version, law version, and Audit Run that produced it.
- Include tests for authorization boundaries, control outcomes, version/effective-date selection, and retry/idempotency behavior when those layers are introduced.
- Do not fabricate legal citations, OCR values, vendor relationships, or risk findings in production data. Clearly label mock/demo data in the prototype.

## Commands

Run frontend commands from `frontend/`:

```powershell
npm install
npm run dev
npm run build
npm run lint
```

`@hookform/resolvers` is intentionally pinned to `5.2.2` in `frontend/package.json`; do not change it casually because newer releases currently conflict with the project’s Valibot dependency path.

## Documentation

When a product decision changes scope, architecture, or a domain invariant, update this file and the relevant product documentation. Keep Persian-facing content UTF-8 and verify rendering; financial amounts in the proposal are in Iranian tomans unless a screen or API explicitly states otherwise.
