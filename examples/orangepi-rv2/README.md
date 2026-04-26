# Orange Pi RV2 telemetry destination

This is a small self-host target for Pi OpenTelemetry traffic on the Orange Pi RV2.

It receives OTLP HTTP on port `4318`, exposes Prometheus metrics on `8889`, and runs Jaeger UI on `16686` for traces.

## Start on the Orange Pi

Copy this directory to the Orange Pi, then run:

```bash
docker compose up -d
```

If Docker is not installed, install Docker or run the same collector config under another container runtime.

## Point Pi at it

On machines running Pi:

```bash
export OTEL_EXPORTER_OTLP_ENDPOINT=http://192.168.1.30:4318
export OTEL_TRACE_UI_BASE_URL=http://192.168.1.30:16686/trace
export PI_OTEL_LOCAL_LOG=~/.local/share/pi-opentelemetry/events.jsonl
```

Then start Pi normally.

## What goes where

- Traces: `http://192.168.1.30:16686`
- OTLP HTTP receiver: `http://192.168.1.30:4318`
- Collector Prometheus exporter: `http://192.168.1.30:8889/metrics`

For long-term Grafana dashboards, scrape `192.168.1.30:8889` from an existing Prometheus/Grafana stack, or add Prometheus/Grafana services here.
