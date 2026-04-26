# Orange Pi RV2 telemetry destination

This is a small self-host target for Pi OpenTelemetry traffic on the Orange Pi RV2.

It receives OTLP HTTP on port `4318` and exposes Prometheus metrics on `8889`. On the current Orange Pi deployment these bind to loopback and are reached from the Mac through an SSH tunnel because UFW blocks direct LAN access to new ports.

## Start on the Orange Pi

Container compose files are included for hosts with Docker. The current Orange Pi RV2 deployment uses a native user-level collector instead:

```bash
mkdir -p ~/bin ~/.config/otelcol ~/.config/systemd/user
# install otelcol-contrib linux_riscv64 into ~/bin/otelcol-contrib
cp otel-collector.yaml ~/.config/otelcol/config.yaml
systemctl --user daemon-reload
systemctl --user enable --now pi-otelcol.service
```

## Point Pi at it

On machines running Pi:

```bash
ssh -N -L 4318:127.0.0.1:4318 -L 8889:127.0.0.1:8889 orangepi@192.168.1.30

export OTEL_EXPORTER_OTLP_ENDPOINT=http://127.0.0.1:4318
export OTEL_TRACE_UI_BASE_URL=http://192.168.1.30:16686/trace
export PI_OTEL_LOCAL_LOG=~/.local/share/pi-opentelemetry/events.jsonl
```

Then start Pi normally.

## What goes where

- OTLP HTTP receiver: `http://127.0.0.1:4318` on Orange Pi, forwarded to local `127.0.0.1:4318`
- Collector Prometheus exporter: `http://127.0.0.1:8889/metrics` on Orange Pi, forwarded to local `127.0.0.1:8889`
- Traces currently go to the collector debug exporter unless a trace backend is added.

For long-term Grafana dashboards, either add an Orange Pi UFW rule for `8889` and scrape it from existing Prometheus, or add an internal scrape path from the existing Prometheus config to `127.0.0.1:8889`.
