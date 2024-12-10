FROM golang:1.23 AS builder

WORKDIR /usr/src/app

ARG GOPROXY=proxy.golang.org
ARG GO111MODULE

RUN go env -w GOPROXY=${GOPROXY}
RUN go env -w GO111MODULE=${GO111MODULE}

COPY ["src/", "."]

RUN make build_final

FROM alpine

COPY --from=builder /mythic_server /mythic_server
COPY --from=builder /usr/src/app /usr/src/app

WORKDIR /usr/src/app

HEALTHCHECK --interval=60s --timeout=10s --retries=5 --start-period=20s \
  CMD wget -SqO - http://127.0.0.1:${MYTHIC_SERVER_PORT:-17443}/health || exit 1

CMD ["/bin/sh", "-c", "cp /mythic_server . && ./mythic_server" ]