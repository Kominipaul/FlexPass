package httpapi

import (
	"errors"
	"net/mail"
	"strings"
)

var ErrInvalidEmail = errors.New("invalid email address")
var ErrPasswordTooShort = errors.New("password must be at least 10 characters")
var ErrPasswordTooCommon = errors.New("password is too common — choose a less predictable one")

func validateEmail(s string) error {
	if _, err := mail.ParseAddress(s); err != nil {
		return ErrInvalidEmail
	}
	return nil
}

// commonPasswords is a starter denylist (a real deployment should load a
// much larger list, e.g. the top 10k from Have I Been Pwned's dataset, from
// a file rather than a compiled-in slice). Checked case-insensitively.
var commonPasswords = map[string]bool{}

func init() {
	for _, p := range []string{
		"password", "password1", "password123", "123456789", "1234567890",
		"qwertyuiop", "letmein123", "welcome123", "admin12345", "iloveyou1",
		"princess1", "football1", "baseball1", "dragon1234", "superman1",
		"trustno1", "sunshine1", "master1234", "hello1234", "freedom12",
		"whatever1", "qwerty123", "abc123456", "123123123", "1q2w3e4r5t",
		"powerlife", "powerlifegym", "kalamata12", "gymcore123",
	} {
		commonPasswords[p] = true
	}
}

func validatePassword(pw string) error {
	if len(pw) < 10 {
		return ErrPasswordTooShort
	}
	if commonPasswords[strings.ToLower(pw)] {
		return ErrPasswordTooCommon
	}
	return nil
}
