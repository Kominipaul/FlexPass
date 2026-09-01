package auth

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// Claims carried by every access token. MemberID is empty for staff/admin
// users who have no member row.
type Claims struct {
	UserID   string `json:"sub"`
	Role     string `json:"role"`
	MemberID string `json:"mid,omitempty"`
	jwt.RegisteredClaims
}

var ErrInvalidToken = errors.New("auth: invalid or expired access token")

// IssueAccessToken signs a short-lived JWT for userID/role/memberID.
func IssueAccessToken(secret []byte, userID, role, memberID string, ttl time.Duration) (string, error) {
	now := time.Now()
	claims := Claims{
		UserID:   userID,
		Role:     role,
		MemberID: memberID,
		RegisteredClaims: jwt.RegisteredClaims{
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(ttl)),
		},
	}
	tok := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return tok.SignedString(secret)
}

// ParseAccessToken verifies signature and expiry and returns the claims.
func ParseAccessToken(secret []byte, raw string) (*Claims, error) {
	claims := &Claims{}
	tok, err := jwt.ParseWithClaims(raw, claims, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, ErrInvalidToken
		}
		return secret, nil
	})
	if err != nil || !tok.Valid {
		return nil, ErrInvalidToken
	}
	return claims, nil
}
