// Package doorpass computes and verifies the rotating token shown on a
// member's digital pass. The QR encodes "<member_code>:<token>" — the
// member code tells the scanner whose secret to check the token against,
// the token itself proves the pass is live within the last WindowSeconds.
//
// This is the same scheme sketched in the prototype, made real: the token
// is HMAC-SHA256(door_secret, window) rather than random-looking canvas
// dots, and a server that holds the same secret can recompute and verify
// it without ever transmitting the secret over the wire on each scan.
package doorpass

import (
	"crypto/hmac"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base32"
	"encoding/binary"
	"strings"
	"time"
)

// WindowSeconds is the rotation cadence. The frontend recomputes the QR at
// the same cadence purely from the secret it was handed at login — no
// network round trip needed to keep the pass fresh.
const WindowSeconds = 15

// ToleranceWindows is how many windows on either side of "now" the
// verifier accepts, absorbing clock drift and the second or two between a
// member's screen rendering a code and staff finishing the scan.
const ToleranceWindows = 1

// encoding produces upper-case, unpadded base32 — no ambiguous 0/O/1/I,
// reads cleanly on a small screen, matches the ABCDEFGH...23456789 style
// alphabet the prototype used for its display tokens.
var encoding = base32.StdEncoding.WithPadding(base32.NoPadding)

// CurrentWindow returns the rotation window index for a given time —
// unix-seconds divided by WindowSeconds, floored.
func CurrentWindow(t time.Time) int64 { return t.Unix() / WindowSeconds }

// Token computes the display token for one window: HMAC-SHA256(secret,
// window) truncated to 10 bytes and base32-encoded, which lands on exactly
// 16 characters (10 bytes = 80 bits = 16 groups of 5 bits) — grouped here
// as XXXX-XXXX-XXXX-XXXX for readability.
func Token(secret []byte, window int64) string {
	mac := hmac.New(sha256.New, secret)
	var buf [8]byte
	binary.BigEndian.PutUint64(buf[:], uint64(window))
	mac.Write(buf[:])
	sum := mac.Sum(nil)[:10]

	raw := encoding.EncodeToString(sum) // 16 chars
	return raw[0:4] + "-" + raw[4:8] + "-" + raw[8:12] + "-" + raw[12:16]
}

// Verify checks a token against every window from now-ToleranceWindows to
// now+ToleranceWindows and reports the first match. Constant-time per
// comparison so a timing side-channel can't help an attacker narrow down
// the secret.
func Verify(secret []byte, token string, now time.Time) (ok bool, matchedWindow int64) {
	current := CurrentWindow(now)
	for d := -ToleranceWindows; d <= ToleranceWindows; d++ {
		w := current + int64(d)
		want := Token(secret, w)
		if subtle.ConstantTimeCompare([]byte(want), []byte(token)) == 1 {
			return true, w
		}
	}
	return false, 0
}

// Encode joins a member code and its current token into the single string
// the QR carries.
func Encode(memberCode, token string) string { return memberCode + ":" + token }

// Decode splits a scanned QR payload back into member code and token.
// Member codes never contain ':', so splitting on the last one is safe
// even if a code format changes shape later.
func Decode(payload string) (memberCode, token string, ok bool) {
	i := strings.LastIndex(payload, ":")
	if i < 0 {
		return "", "", false
	}
	return payload[:i], payload[i+1:], true
}
