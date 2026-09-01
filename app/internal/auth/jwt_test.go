package auth

import (
	"testing"
	"time"
)

func TestIssueAndParseAccessToken(t *testing.T) {
	secret := []byte("test-secret-at-least-32-bytes-long!")
	tok, err := IssueAccessToken(secret, "user-1", "member", "member-1", time.Minute)
	if err != nil {
		t.Fatalf("issue: %v", err)
	}
	claims, err := ParseAccessToken(secret, tok)
	if err != nil {
		t.Fatalf("parse: %v", err)
	}
	if claims.UserID != "user-1" || claims.Role != "member" || claims.MemberID != "member-1" {
		t.Fatalf("unexpected claims: %+v", claims)
	}
}

func TestParseAccessTokenRejectsExpired(t *testing.T) {
	secret := []byte("test-secret-at-least-32-bytes-long!")
	tok, _ := IssueAccessToken(secret, "user-1", "member", "member-1", -time.Minute)
	if _, err := ParseAccessToken(secret, tok); err != ErrInvalidToken {
		t.Fatalf("expected ErrInvalidToken for expired token, got %v", err)
	}
}

func TestParseAccessTokenRejectsWrongSecret(t *testing.T) {
	tok, _ := IssueAccessToken([]byte("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"), "u", "member", "m", time.Minute)
	if _, err := ParseAccessToken([]byte("bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"), tok); err != ErrInvalidToken {
		t.Fatalf("expected ErrInvalidToken for wrong secret, got %v", err)
	}
}

func TestNewRefreshTokenHashIsDeterministicSHA256(t *testing.T) {
	raw, hash, err := NewRefreshToken()
	if err != nil {
		t.Fatalf("new: %v", err)
	}
	if HashToken(raw) != hash {
		t.Fatal("HashToken(raw) must match the hash returned alongside it")
	}
	raw2, _, _ := NewRefreshToken()
	if raw == raw2 {
		t.Fatal("two refresh tokens must not collide")
	}
}
