# OpenTelemetry Password Generator Demo

A microservices demo application built with TypeScript and Node.js that demonstrates distributed tracing, metrics collection, and observability using OpenTelemetry. Inspired by the [timescale/opentelemetry-demo](https://github.com/timescale/opentelemetry-demo).

The application generates passwords by orchestrating calls across multiple character services — each responsible for producing one type of character. Every request flows through the full observability stack: traces appear in Jaeger, metrics in Prometheus and Grafana.

---

## Architecture

```
                          ┌─────────────────────┐
                          │     load service     │
                          │  (continuous traffic)│
                          └──────────┬──────────┘
                                     │ HTTP GET /generate
                                     ▼
                          ┌─────────────────────┐
                          │  generator service  │
                          │      :5050          │
                          └──┬──────┬──────┬───┘
                             │      │      │
              ┌──────────────┘      │      └──────────────┐
              │                     │                      │
              ▼                     ▼                      ▼
   ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
   │    lower     │      │    upper     │      │    digit     │
   │   :5053      │      │   :5054      │      │   :5051      │
   └──────────────┘      └──────────────┘      └──────────────┘
                                     │
                          ┌──────────────┐
                          │   special    │
                          │   :5052      │
                          └──────────────┘

                    All services export telemetry to:

              ┌────────────────────────────────────────┐
              │        OTel Collector :4317/:4318       │
              └───────────┬──────────────┬─────────────┘
                          │              │
               ┌──────────▼──┐    ┌──────▼──────┐
               │   Jaeger    │    │ Prometheus  │
               │   :16686    │    │   :9090     │
               └─────────────┘    └──────┬──────┘
                                         │
                                  ┌──────▼──────┐
                                  │   Grafana   │
                                  │   :3000     │
                                  └─────────────┘

              ┌─────────────────────────────────────────┐
              │   TimescaleDB (PostgreSQL) :5999         │
              └─────────────────────────────────────────┘
```

---

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose (v2)
- [Node.js 20+](https://nodejs.org/) (for local development)
- npm 10+

---

## Quick Start with Docker Compose

```bash
# Clone / enter the project directory
cd /path/to/project

# Copy the example environment file
cp .env.example .env

# Build and start all services
docker compose up --build

# Or start in detached mode
docker compose up --build -d
```

All services start automatically. The load service begins generating traffic within seconds.

To stop everything:

```bash
docker compose down
```

To also remove persistent volumes:

```bash
docker compose down -v
```

---

## Running Services Locally

Each service can be run locally against a locally-running OTel Collector (or with tracing disabled in test mode).

### Install dependencies

```bash
cd services/lower && npm install
cd ../upper && npm install
cd ../digit && npm install
cd ../special && npm install
cd ../generator && npm install
cd ../load && npm install
```

### Start infrastructure only

```bash
docker compose up timescaledb otel-collector jaeger prometheus grafana
```

### Run a service in dev mode

```bash
# In services/lower/
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317 npm run dev

# In services/generator/
LOWER_SERVICE_URL=http://localhost:5053 \
UPPER_SERVICE_URL=http://localhost:5054 \
DIGIT_SERVICE_URL=http://localhost:5051 \
SPECIAL_SERVICE_URL=http://localhost:5052 \
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317 \
npm run dev
```

### Build TypeScript

```bash
npm run build
```

---

## Running Tests

Each service (except load) has a Jest test suite. Tests run without needing a live OTel Collector — tracing is skipped when `NODE_ENV=test`.

```bash
# Run tests for a specific service
cd services/lower && npm test
cd services/upper && npm test
cd services/digit && npm test
cd services/special && npm test
cd services/generator && npm test

# Run all tests from project root (requires each service to have deps installed)
for svc in lower upper digit special generator; do
  echo "--- Testing $svc ---"
  (cd services/$svc && npm test)
done
```

---

## Accessing the UIs

| Service    | URL                          | Credentials       |
|------------|------------------------------|-------------------|
| Jaeger UI  | http://localhost:16686       | (none)            |
| Grafana    | http://localhost:3000        | admin / admin     |
| Prometheus | http://localhost:9090        | (none)            |

### Jaeger

Open http://localhost:16686, select `generator-service` from the Service dropdown, and click **Find Traces**. Each trace shows the full distributed call graph from generator through all four character services.

### Grafana

Open http://localhost:3000 and log in. The **Password Generator - OpenTelemetry Demo** dashboard is pre-provisioned under the default folder. It shows:

- Request rate per service (req/s)
- Latency percentiles: p50, p95, p99
- Error rate
- Generator service p95 gauge

---

## How OpenTelemetry Is Configured

### SDK Initialization

Each service has a `tracing.ts` that is imported first in `index.ts`, before any other module. This is critical — auto-instrumentation must patch Node.js built-ins before they are imported.

```typescript
// index.ts — tracing is the very first import
import { initTracing } from './tracing';
const sdk = initTracing('lower-service');

import express from 'express'; // patched by auto-instrumentation
```

The SDK is configured with:

- **OTLPTraceExporter** (gRPC) — exports spans to the OTel Collector
- **OTLPMetricExporter** (gRPC) — exports metrics to the OTel Collector
- **PeriodicExportingMetricReader** — flushes metrics every 10 seconds
- **getNodeAutoInstrumentations** — automatically instruments HTTP, Express, DNS, and more

### Custom Spans

In addition to auto-instrumented HTTP spans, each service adds application-level spans:

- Character services: `generate-{lower,upper,digit,special}-char` — attributes include the generated character and its type
- Generator service: `generate-password` (parent) with child `fetch-{lower,upper,digit,special}-char` spans for each outbound call

### Collector Pipeline

```
Receivers: OTLP gRPC (4317) + HTTP (4318)
    │
Processors: batch (1s timeout, 1024 batch size)
    │
    ├── Traces → Jaeger (via OTLP gRPC)
    └── Metrics → Prometheus (scrape endpoint :8889)
```

---

## Environment Variables Reference

| Variable                          | Default                    | Description                                  |
|-----------------------------------|----------------------------|----------------------------------------------|
| `OTEL_EXPORTER_OTLP_ENDPOINT`     | `http://localhost:4317`    | OTel Collector gRPC endpoint                 |
| `OTEL_SERVICE_NAME`               | (set per service)          | Service name reported in traces              |
| `PORT`                            | (varies per service)       | HTTP listen port                             |
| `LOWER_SERVICE_URL`               | `http://localhost:5053`    | URL of the lower character service           |
| `UPPER_SERVICE_URL`               | `http://localhost:5054`    | URL of the upper character service           |
| `DIGIT_SERVICE_URL`               | `http://localhost:5051`    | URL of the digit character service           |
| `SPECIAL_SERVICE_URL`             | `http://localhost:5052`    | URL of the special character service         |
| `GENERATOR_URL`                   | `http://localhost:5050`    | URL of the generator service (load service)  |
| `LOAD_DELAY_MS`                   | `500`                      | Delay between requests in the load service   |
| `NODE_ENV`                        | `development`              | Set to `test` to skip tracing initialization |
| `POSTGRES_USER`                   | `postgres`                 | TimescaleDB username                         |
| `POSTGRES_PASSWORD`               | `password`                 | TimescaleDB password                         |
| `POSTGRES_DB`                     | `otel_demo`                | TimescaleDB database name                    |

---

## Project Structure

```
.
├── README.md
├── docker-compose.yml           # Full stack orchestration
├── .env.example                 # Environment variable template
├── otel-collector-config.yml    # OTel Collector pipeline config
├── prometheus.yml               # Prometheus scrape config
├── grafana/
│   └── provisioning/
│       ├── datasources/
│       │   └── datasources.yml  # Prometheus + Jaeger datasources
│       └── dashboards/
│           ├── dashboards.yml   # Dashboard provisioning config
│           └── password-generator.json  # Pre-built dashboard
└── services/
    ├── lower/                   # Lowercase character service (:5053)
    │   ├── src/
    │   │   ├── tracing.ts       # OTel SDK initialization
    │   │   └── index.ts         # Express server + /health + / endpoints
    │   ├── tests/
    │   │   └── lower.test.ts    # Jest + supertest tests
    │   ├── Dockerfile
    │   ├── package.json
    │   └── tsconfig.json
    ├── upper/                   # Uppercase character service (:5054)
    ├── digit/                   # Digit character service (:5051)
    ├── special/                 # Special character service (:5052)
    ├── generator/               # Password orchestrator service (:5050)
    │   ├── src/
    │   │   ├── tracing.ts
    │   │   └── index.ts         # Concurrent calls to all 4 char services
    │   ├── tests/
    │   │   └── generator.test.ts  # Mocks axios; tests all 4 services called
    │   ├── Dockerfile
    │   ├── package.json
    │   └── tsconfig.json
    └── load/                    # Load generator (2 replicas in Docker)
        ├── src/
        │   └── index.ts         # Continuous requests + exponential backoff
        ├── Dockerfile
        ├── package.json
        └── tsconfig.json
```

---

## API Reference

### Character Services (lower, upper, digit, special)

```
GET /
Response: { "char": "a" }

GET /health
Response: { "status": "ok", "service": "lower" }
```

### Generator Service

```
GET /generate?lower=3&upper=3&digit=3&special=3&length=12
Response: { "password": "aB3!xY9@kL2#" }

Query parameters (all optional):
  lower   - number of lowercase letters (default: 3)
  upper   - number of uppercase letters (default: 3)
  digit   - number of digits (default: 3)
  special - number of special characters (default: 3)
  length  - total password length; trims assembled chars (default: sum of above)

GET /health
Response: { "status": "ok", "service": "generator" }
```

---

## Troubleshooting

**Services can't connect to OTel Collector**

Ensure the collector is running and the `OTEL_EXPORTER_OTLP_ENDPOINT` environment variable points to the correct gRPC address (no trailing slash).

**No traces in Jaeger**

Check that the collector is receiving data by looking at its logs: `docker compose logs otel-collector`. The collector exports to Jaeger via the `otlp/jaeger` exporter on port 4317.

**Tests fail with connection errors**

Set `NODE_ENV=test` — this disables the OTel SDK so tests don't need a live collector.

**Generator returns 500**

Verify the character services are healthy: `curl http://localhost:5053/health`. The generator calls all four services concurrently; if any one fails, the entire request fails.
