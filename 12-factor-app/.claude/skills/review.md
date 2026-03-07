Perform a structured code review of the 12-factor-app (TypeScript/Express stack).

Scope: $ARGUMENTS — if empty, review all files under src/ excluding test files.

## Steps

1. Glob `src/**/*.ts` excluding `**/*.test.ts` and `**/*.e2e.ts`.
2. Read files in this order: `src/config/` → `src/models/` → `src/utils/` → `src/middleware/` → `src/services/` → `src/controllers/` → `src/routes/` → `src/monitoring/` → `src/app.ts` → `src/index.ts`.
3. Evaluate against the seven dimensions below.
4. Output each finding on its own line in this format:
   `[SEVERITY] path/file.ts:line — issue — recommended fix`
   Severities: `CRITICAL` | `WARNING` | `SUGGESTION`
5. After all findings, output a scorecard: one line per dimension with an overall assessment.

---

## Dimension 1 — TypeScript Quality

- Flag `any` types; recommend specific types or `unknown`.
- Flag missing return types on exported functions and class methods.
- Flag unsafe type assertions (`as SomeType`) where a type guard would be safer.
- Flag `interface` vs `type` inconsistency — prefer `interface` for object shapes, `type` for unions/intersections.

## Dimension 2 — 12-Factor Compliance

- All configuration must come from environment variables, never hardcoded values.
- Config must be validated at startup with a schema (Joi); missing required vars should cause immediate process exit.
- Services must be stateless — flag in-memory state (e.g., `Map`, module-level variables) that would be lost on restart. Note if the design is intentionally in-memory (prototype) but call out production risk.
- Dependencies must be explicit in `package.json`; flag any `require` of packages not listed there.

## Dimension 3 — Express Patterns

- Middleware registration order: metrics/logging first, then resilience (rate limit, slow-down, timeout), then routes, then the error handler last.
- The error handler must use the 4-argument signature `(err, req, res, next): void` and be registered after all routes.
- All async route handlers and controller methods must have a `try/catch` that calls `next(error)` — never swallow errors silently.
- Avoid `res.send` / `res.json` calls after `next()` has been called.

## Dimension 4 — Observability

- Logs must use structured fields (object second argument), never string interpolation or concatenation.
- Log calls must include meaningful context (userId, requestId, method, url) — flag logs missing context in service/controller methods.
- Spans via `tracingService.createSpan` should wrap meaningful units of work; flag operations not covered by a span.
- Metric label values must have bounded cardinality — flag labels that use user IDs, UUIDs, or free-form strings.

## Dimension 5 — Resilience

- Every outbound or async operation should be wrapped in `resilienceService.executeWithResilience`.
- Retry should only be applied to idempotent operations (GET/read). Flag retry on POST/PUT/DELETE operations that are not idempotent.
- Timeout middleware must be applied to all route groups; flag routes without timeout coverage.
- Circuit breaker thresholds: flag values that seem too low (threshold < 3) or too high (threshold > 20) for the operation type.

## Dimension 6 — Security

- No sensitive fields (passwords, tokens, secrets) in logs or API responses.
- All request bodies and URL params must be validated with a Joi schema before use — flag unvalidated inputs.
- If `req.ip` is used for rate limiting or logging, verify `app.set('trust proxy', ...)` is configured; flag if absent.
- Flag any direct use of `req.body` properties without prior validation.

## Dimension 7 — Tests

- Every exported service method should have at minimum one success-path and one failure-path unit test.
- Tests must not use `setTimeout`/`sleep` for async waiting — flag these and recommend jest fake timers or mocks.
- E2E tests should cover `/health`, `/ready`, `/live`, and `/metrics` endpoints.
- Flag tests that do not restore mocks/spies (`jest.restoreAllMocks` or equivalent).

---

## Output format

List all findings grouped by dimension. Then output:

### Scorecard
| Dimension | Assessment |
|-----------|------------|
| TypeScript Quality | ... |
| 12-Factor Compliance | ... |
| Express Patterns | ... |
| Observability | ... |
| Resilience | ... |
| Security | ... |
| Tests | ... |
