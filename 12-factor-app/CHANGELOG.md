# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-08-04

### Added
- **Terminus Integration**: Integrated @godaddy/terminus for robust graceful shutdown handling
- **Health Check Integration**: Terminus automatically monitors `/ready` and `/live` endpoints during shutdown
- **Process Lifecycle Management**: Proper signal handling for SIGTERM and SIGINT with configurable timeouts
- **Resource Cleanup**: Automatic cleanup of OpenTelemetry tracing service during shutdown

### Changed
- **OpenTelemetry Dependencies**: Updated to compatible versions to resolve peer dependency conflicts:
  - `@opentelemetry/api@^1.9.0`
  - `@opentelemetry/sdk-node@^0.203.0`
  - `@opentelemetry/auto-instrumentations-node@^0.62.0`
- **Metrics Service**: Added automatic service name sanitization for Prometheus compatibility
- **Tracing Service**: Simplified configuration while maintaining functionality

### Fixed
- **Dependency Conflicts**: Resolved OpenTelemetry peer dependency version conflicts
- **Invalid Metric Names**: Fixed Prometheus metric name errors by sanitizing service names (hyphens → underscores)
- **Graceful Shutdown**: Replaced custom signal handling with robust Terminus implementation

### Removed
- **Custom Signal Handlers**: Removed manual SIGTERM/SIGINT handling in favor of Terminus
- **Legacy Dependencies**: Removed conflicting OpenTelemetry package versions

## [1.0.0] - 2025-01-01

### Added
- Initial release with 12-factor app compliance
- Express.js application with TypeScript
- OpenTelemetry distributed tracing
- Prometheus metrics collection
- Winston structured logging
- Health check endpoints
- Resilience patterns (circuit breaker, retry, timeout)
- Docker containerization
- Comprehensive test suite
- Security middleware (Helmet, CORS, rate limiting)
- Input validation with Joi
- Environment-based configuration

### Features
- User management API endpoints
- Database and Redis health checks
- Memory usage monitoring
- HTTP request metrics
- Business metrics collection
- Error tracking and correlation
- Development and production Docker configurations
- Multi-stage Docker builds
- Kubernetes-ready health probes

## Migration Guide

### From v1.0.0 to v1.1.0

#### Breaking Changes
None. This is a backwards-compatible update.

#### Recommended Actions
1. **Update Dependencies**: Run `npm install` to get the latest compatible OpenTelemetry packages
2. **Verify Metrics**: Check that Prometheus metrics are working correctly at `/metrics`
3. **Test Graceful Shutdown**: Verify that the application responds properly to SIGTERM signals
4. **Health Checks**: Confirm that `/ready` and `/live` endpoints integrate with your orchestration platform

#### Configuration Changes
No configuration changes required. All updates are internal and maintain existing functionality.

#### Docker Considerations
The Terminus integration improves container lifecycle management. Consider updating your Kubernetes deployment to take advantage of the enhanced graceful shutdown capabilities:

```yaml
# Example Kubernetes deployment snippet
spec:
  template:
    spec:
      terminationGracePeriodSeconds: 30
      containers:
      - name: app
        lifecycle:
          preStop:
            exec:
              command: ["sleep", "5"]
```

This allows Terminus time to complete its shutdown sequence before Kubernetes forcefully terminates the pod.