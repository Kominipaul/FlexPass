// Package store holds hand-written, typed pgx queries — no ORM, no code
// generator. Each method does one query (or one short transaction) and
// returns plain Go structs; handlers in internal/httpapi call these and
// translate the result to JSON.
package store

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrNotFound = errors.New("store: not found")

type Store struct {
	Pool *pgxpool.Pool
}

func New(pool *pgxpool.Pool) *Store { return &Store{Pool: pool} }

// ---- users -----------------------------------------------------------

type User struct {
	ID           string
	Email        string
	PasswordHash string
	Role         string
	Locale       string
	Status       string
}

func (s *Store) CreateUser(ctx context.Context, tx pgx.Tx, email, passwordHash, role, locale string) (User, error) {
	var u User
	err := tx.QueryRow(ctx, `
		INSERT INTO users (email, password_hash, role, locale)
		VALUES ($1, $2, $3, $4)
		RETURNING id, email, password_hash, role, locale, status
	`, email, passwordHash, role, locale).Scan(&u.ID, &u.Email, &u.PasswordHash, &u.Role, &u.Locale, &u.Status)
	return u, err
}

func (s *Store) GetUserByEmail(ctx context.Context, email string) (User, error) {
	var u User
	err := s.Pool.QueryRow(ctx, `
		SELECT id, email, password_hash, role, locale, status
		FROM users WHERE email = $1
	`, email).Scan(&u.ID, &u.Email, &u.PasswordHash, &u.Role, &u.Locale, &u.Status)
	if errors.Is(err, pgx.ErrNoRows) {
		return User{}, ErrNotFound
	}
	return u, err
}

func (s *Store) TouchLastLogin(ctx context.Context, userID string) error {
	_, err := s.Pool.Exec(ctx, `UPDATE users SET last_login_at = now() WHERE id = $1`, userID)
	return err
}

// ---- members -----------------------------------------------------------

type Member struct {
	ID             string
	UserID         string
	MemberCode     string
	FirstName      string
	LastName       string
	Phone          *string
	HomeLocationID string
	DoorSecret     []byte
	JoinedOn       time.Time
}

// CreateMember allocates the next member code from member_code_seq and
// inserts the row. homeLocationCode is a location code ('ART'/'PIL'),
// resolved to an id inside the same transaction.
func (s *Store) CreateMember(ctx context.Context, tx pgx.Tx, userID, firstName, lastName string, phone *string, homeLocationCode string, doorSecret []byte) (Member, error) {
	var m Member
	err := tx.QueryRow(ctx, `
		INSERT INTO members (user_id, member_code, first_name, last_name, phone, home_location_id, door_secret)
		SELECT $1, 'PLG-' || nextval('member_code_seq'), $2, $3, $4, l.id, $6
		FROM locations l WHERE l.code = $5
		RETURNING id, user_id, member_code, first_name, last_name, phone, home_location_id, door_secret, joined_on
	`, userID, firstName, lastName, phone, homeLocationCode, doorSecret).Scan(
		&m.ID, &m.UserID, &m.MemberCode, &m.FirstName, &m.LastName, &m.Phone, &m.HomeLocationID, &m.DoorSecret, &m.JoinedOn)
	if errors.Is(err, pgx.ErrNoRows) {
		return Member{}, ErrNotFound // unknown home_location_code
	}
	return m, err
}

func (s *Store) GetMemberByUserID(ctx context.Context, userID string) (Member, error) {
	var m Member
	err := s.Pool.QueryRow(ctx, `
		SELECT id, user_id, member_code, first_name, last_name, phone, home_location_id, door_secret, joined_on
		FROM members WHERE user_id = $1
	`, userID).Scan(&m.ID, &m.UserID, &m.MemberCode, &m.FirstName, &m.LastName, &m.Phone, &m.HomeLocationID, &m.DoorSecret, &m.JoinedOn)
	if errors.Is(err, pgx.ErrNoRows) {
		return Member{}, ErrNotFound
	}
	return m, err
}

// ---- memberships ---------------------------------------------------------

type Membership struct {
	ID         string
	MemberID   string
	PlanID     string
	StartsOn   time.Time
	EndsOn     time.Time
	Status     string
	AutoRenew  bool
	PriceCents int
}

// CreateMembership starts a membership today for `days` days, priced at the
// plan's current price. planCode is resolved inside the same transaction.
func (s *Store) CreateMembership(ctx context.Context, tx pgx.Tx, memberID, planCode string, days int) (Membership, error) {
	var m Membership
	err := tx.QueryRow(ctx, `
		INSERT INTO memberships (member_id, plan_id, starts_on, ends_on, price_cents)
		SELECT $1, p.id, current_date, current_date + $3::int, p.price_cents
		FROM plans p WHERE p.code = $2
		RETURNING id, member_id, plan_id, starts_on, ends_on, status, auto_renew, price_cents
	`, memberID, planCode, days).Scan(
		&m.ID, &m.MemberID, &m.PlanID, &m.StartsOn, &m.EndsOn, &m.Status, &m.AutoRenew, &m.PriceCents)
	if errors.Is(err, pgx.ErrNoRows) {
		return Membership{}, ErrNotFound // unknown plan code
	}
	return m, err
}

// ---- refresh tokens --------------------------------------------------

type RefreshToken struct {
	ID         string
	UserID     string
	TokenHash  string
	CSRFHash   string
	ExpiresAt  time.Time
	RevokedAt  *time.Time
	ReplacedBy *string
}

func (s *Store) InsertRefreshToken(ctx context.Context, userID, tokenHash, csrfHash string, expiresAt time.Time, userAgent, ip string) (string, error) {
	var id string
	err := s.Pool.QueryRow(ctx, `
		INSERT INTO refresh_tokens (user_id, token_hash, csrf_hash, expires_at, user_agent, ip)
		VALUES ($1, $2, $3, $4, $5, NULLIF($6, '')::inet)
		RETURNING id
	`, userID, tokenHash, csrfHash, expiresAt, userAgent, ip).Scan(&id)
	return id, err
}

func (s *Store) GetRefreshToken(ctx context.Context, tokenHash string) (RefreshToken, error) {
	var t RefreshToken
	err := s.Pool.QueryRow(ctx, `
		SELECT id, user_id, token_hash, csrf_hash, expires_at, revoked_at, replaced_by
		FROM refresh_tokens WHERE token_hash = $1
	`, tokenHash).Scan(&t.ID, &t.UserID, &t.TokenHash, &t.CSRFHash, &t.ExpiresAt, &t.RevokedAt, &t.ReplacedBy)
	if errors.Is(err, pgx.ErrNoRows) {
		return RefreshToken{}, ErrNotFound
	}
	return t, err
}

func (s *Store) RevokeRefreshToken(ctx context.Context, id string, replacedBy *string) error {
	_, err := s.Pool.Exec(ctx,
		`UPDATE refresh_tokens SET revoked_at = now(), replaced_by = $2 WHERE id = $1`,
		id, replacedBy)
	return err
}

// RevokeAllRefreshTokensForUser is called when a revoked refresh token is
// presented again — that can only mean the token leaked, so the entire
// session family is killed, not just the one token.
func (s *Store) RevokeAllRefreshTokensForUser(ctx context.Context, userID string) error {
	_, err := s.Pool.Exec(ctx,
		`UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL`,
		userID)
	return err
}

func (s *Store) GetUserByID(ctx context.Context, id string) (User, error) {
	var u User
	err := s.Pool.QueryRow(ctx, `
		SELECT id, email, password_hash, role, locale, status
		FROM users WHERE id = $1
	`, id).Scan(&u.ID, &u.Email, &u.PasswordHash, &u.Role, &u.Locale, &u.Status)
	if errors.Is(err, pgx.ErrNoRows) {
		return User{}, ErrNotFound
	}
	return u, err
}
