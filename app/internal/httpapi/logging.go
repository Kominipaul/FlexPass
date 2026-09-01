package httpapi

import (
	"net/http"
	"time"

	"github.com/go-chi/chi/v5/middleware"
)

// requestLogger writes one structured line per request: method, path,
// status, duration, request id. Deliberately not chi's own logger — that
// one is text-formatted; this project wants JSON in production.
func (s *Server) requestLogger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		ww := middleware.NewWrapResponseWriter(w, r.ProtoMajor)
		next.ServeHTTP(ww, r)
		s.log.Info("http",
			"method", r.Method,
			"path", r.URL.Path,
			"status", ww.Status(),
			"bytes", ww.BytesWritten(),
			"duration_ms", time.Since(start).Milliseconds(),
			"request_id", middleware.GetReqID(r.Context()),
		)
	})
}
