# Mythic guacd

This service runs Apache Guacamole `guacd` 1.6.0 for Mythic's task-owned RDP
and VNC sessions. The image is intentionally kept as a thin wrapper around the
upstream image so Mythic does not carry custom guacd plugins or build-time
development packages.

The guacd port is unauthenticated and must remain private to Mythic's Docker
network.
