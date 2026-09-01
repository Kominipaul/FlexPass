package httpapi

import (
	"context"

	"github.com/kominipaul/flexpass/app/internal/auth"
)

type ctxKey int

const claimsKey ctxKey = iota

func withClaims(ctx context.Context, c *auth.Claims) context.Context {
	return context.WithValue(ctx, claimsKey, c)
}

// claimsFrom returns the authenticated caller's claims, or nil if the
// request reached this point without RequireAuth (a handler bug, not a
// client error — callers should treat nil as "should not happen").
func claimsFrom(ctx context.Context) *auth.Claims {
	c, _ := ctx.Value(claimsKey).(*auth.Claims)
	return c
}
