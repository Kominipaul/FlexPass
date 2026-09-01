package doorpass

import (
	"testing"
	"time"
)

func TestTokenIsDeterministicWithinAWindow(t *testing.T) {
	secret := []byte("a-secret-that-is-32-bytes-long!")
	now := time.Unix(1_700_000_000, 0)
	a := Token(secret, CurrentWindow(now))
	b := Token(secret, CurrentWindow(now.Add(5*time.Second)))
	if a != b {
		t.Fatalf("token changed within the same 15s window: %q vs %q", a, b)
	}
}

func TestTokenChangesAcrossWindows(t *testing.T) {
	secret := []byte("a-secret-that-is-32-bytes-long!")
	w := int64(1000)
	if Token(secret, w) == Token(secret, w+1) {
		t.Fatal("token must differ between adjacent windows")
	}
}

func TestTokenDependsOnSecret(t *testing.T) {
	w := CurrentWindow(time.Now())
	a := Token([]byte("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"), w)
	b := Token([]byte("bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"), w)
	if a == b {
		t.Fatal("different secrets must not produce the same token")
	}
}

func TestVerifyAcceptsCurrentWindow(t *testing.T) {
	secret := []byte("a-secret-that-is-32-bytes-long!")
	now := time.Now()
	tok := Token(secret, CurrentWindow(now))
	ok, w := Verify(secret, tok, now)
	if !ok || w != CurrentWindow(now) {
		t.Fatalf("Verify() = (%v, %d), want (true, %d)", ok, w, CurrentWindow(now))
	}
}

func TestVerifyAcceptsAdjacentWindowWithinTolerance(t *testing.T) {
	secret := []byte("a-secret-that-is-32-bytes-long!")
	now := time.Now()
	// a token minted one window ago is still within ToleranceWindows=1
	tok := Token(secret, CurrentWindow(now)-1)
	ok, _ := Verify(secret, tok, now)
	if !ok {
		t.Fatal("expected the previous window's token to still verify")
	}
}

func TestVerifyRejectsOutsideTolerance(t *testing.T) {
	secret := []byte("a-secret-that-is-32-bytes-long!")
	now := time.Now()
	tok := Token(secret, CurrentWindow(now)-5)
	if ok, _ := Verify(secret, tok, now); ok {
		t.Fatal("a token five windows stale must not verify")
	}
}

func TestVerifyRejectsWrongSecret(t *testing.T) {
	now := time.Now()
	tok := Token([]byte("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"), CurrentWindow(now))
	if ok, _ := Verify([]byte("bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"), tok, now); ok {
		t.Fatal("a token minted under a different secret must not verify")
	}
}

func TestEncodeDecodeRoundTrip(t *testing.T) {
	payload := Encode("PLG-1042", "ABCD-EFGH-JKMN-PQRS")
	code, tok, ok := Decode(payload)
	if !ok || code != "PLG-1042" || tok != "ABCD-EFGH-JKMN-PQRS" {
		t.Fatalf("round trip failed: code=%q tok=%q ok=%v", code, tok, ok)
	}
}

func TestDecodeRejectsPayloadWithoutSeparator(t *testing.T) {
	if _, _, ok := Decode("no-separator-here"); ok {
		t.Fatal("expected Decode to reject a payload with no ':'")
	}
}

// TestTokenMatchesJSReferenceVector locks Token() to a fixed vector and
// documents the exact value the frontend's independent Web Crypto
// implementation (src/lib/doorpass.ts) must also produce for the same
// secret and window — the frontend can compute a valid pass with zero
// network calls only because both sides implement the identical
// HMAC-SHA256 + truncate(10) + base32(16) scheme. If this test's expected
// value ever needs to change, the frontend implementation must change
// with it, verified the same way this value was: cross-checked in Node
// against the Go output for this vector before committing either side.
func TestTokenMatchesJSReferenceVector(t *testing.T) {
	secret := make([]byte, 32)
	for i := range secret {
		secret[i] = byte(i)
	}
	got := Token(secret, 1700000000)
	const want = "U7TL-IPDX-6CBZ-WTOY" // cross-checked against src/lib/doorpass.ts in Node
	if got != want {
		t.Fatalf("Token() = %q, want %q — Go and the frontend's doorpass.ts have diverged", got, want)
	}
}
