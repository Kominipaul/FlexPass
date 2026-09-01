# Multi-stage build: compiles the API, ships a small runtime image with
# nothing but the binary (migrations and seed SQL are embedded via
# go:embed, so no extra files need to be copied in).
FROM golang:1.25-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /out/api ./cmd/api
RUN CGO_ENABLED=0 go build -o /out/seed ./cmd/seed

FROM alpine:3.20
RUN adduser -D -u 10001 app
COPY --from=build /out/api /out/seed /usr/local/bin/
USER app
EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/api"]
