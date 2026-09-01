package httpapi

import (
	"encoding/json"
	"log/slog"
	"net/http"
)

// problem is an RFC 7807-shaped error body. Code is the stable,
// machine-readable string the frontend switches on; Detail is for humans
// (logs, debugging) and is never the only way to distinguish error cases.
type problem struct {
	Code   string `json:"code"`
	Detail string `json:"detail,omitempty"`
	// Extra carries endpoint-specific context, e.g. the cheapest plan that
	// would unlock a class booking. Omitted when nil.
	Extra any `json:"extra,omitempty"`
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if v == nil {
		return
	}
	if err := json.NewEncoder(w).Encode(v); err != nil {
		slog.Error("httpapi: encode response", "err", err)
	}
}

func writeProblem(w http.ResponseWriter, status int, code, detail string) {
	writeJSON(w, status, problem{Code: code, Detail: detail})
}

func writeProblemExtra(w http.ResponseWriter, status int, code, detail string, extra any) {
	writeJSON(w, status, problem{Code: code, Detail: detail, Extra: extra})
}

func decodeJSON(r *http.Request, dst any) error {
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	return dec.Decode(dst)
}
