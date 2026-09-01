package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
)

// newOpaqueSecret returns a random URL-safe token and its SHA-256 hex
// digest. The raw value is a bearer credential and is only ever handed to
// the client; only the hash is persisted, so a database leak alone can't
// be used to authenticate.
func newOpaqueSecret() (raw, hash string, err error) {
	b := make([]byte, 32)
	if _, err = rand.Read(b); err != nil {
		return "", "", err
	}
	raw = base64.RawURLEncoding.EncodeToString(b)
	return raw, HashToken(raw), nil
}

// NewRefreshToken issues a raw refresh token plus the hash to store.
func NewRefreshToken() (raw, hash string, err error) { return newOpaqueSecret() }

// NewCSRFToken issues a raw CSRF proof plus the hash to store alongside its
// paired refresh token row.
func NewCSRFToken() (raw, hash string, err error) { return newOpaqueSecret() }

// HashToken hashes a raw token for storage/lookup (refresh tokens and CSRF
// proofs use the same scheme).
func HashToken(raw string) string {
	sum := sha256.Sum256([]byte(raw))
	return hex.EncodeToString(sum[:])
}
