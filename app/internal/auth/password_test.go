package auth

import "testing"

func TestHashAndVerifyPassword(t *testing.T) {
	hash, err := HashPassword("correct horse battery staple")
	if err != nil {
		t.Fatalf("hash: %v", err)
	}
	if err := VerifyPassword(hash, "correct horse battery staple"); err != nil {
		t.Fatalf("expected match, got %v", err)
	}
	if err := VerifyPassword(hash, "wrong password"); err != ErrPasswordMismatch {
		t.Fatalf("expected ErrPasswordMismatch, got %v", err)
	}
	if err := VerifyPassword("not-a-hash", "x"); err != ErrInvalidHash {
		t.Fatalf("expected ErrInvalidHash, got %v", err)
	}
}

func TestHashPasswordIsSalted(t *testing.T) {
	h1, _ := HashPassword("same password")
	h2, _ := HashPassword("same password")
	if h1 == h2 {
		t.Fatal("two hashes of the same password must differ (random salt)")
	}
}
