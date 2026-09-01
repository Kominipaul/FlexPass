package httpapi

import (
	"time"

	"github.com/kominipaul/flexpass/app/internal/store"
)

// Bilingual is the {el, en} shape used throughout — it mirrors the
// prototype's data model exactly, so the ported frontend's existing
// tx({el,en}) picker keeps working unchanged.
type Bilingual struct {
	El string `json:"el"`
	En string `json:"en"`
}

type meDTO struct {
	User   userDTO    `json:"user"`
	Member *memberDTO `json:"member,omitempty"`
}

type userDTO struct {
	ID     string `json:"id"`
	Email  string `json:"email"`
	Role   string `json:"role"`
	Locale string `json:"locale"`
}

type memberDTO struct {
	ID           string         `json:"id"`
	MemberCode   string         `json:"member_code"`
	FirstName    string         `json:"first_name"`
	LastName     string         `json:"last_name"`
	Phone        *string        `json:"phone,omitempty"`
	JoinedOn     string         `json:"joined_on"`
	HomeLocation locationRefDTO `json:"home_location"`
	Membership   membershipDTO  `json:"membership"`
}

type locationRefDTO struct {
	Code string    `json:"code"`
	Name Bilingual `json:"name"`
}

type membershipDTO struct {
	ID                     string     `json:"id"`
	Plan                   planRefDTO `json:"plan"`
	StartsOn               string     `json:"starts_on"`
	EndsOn                 string     `json:"ends_on"`
	Status                 string     `json:"status"`
	AutoRenew              bool       `json:"auto_renew"`
	DaysLeft               int        `json:"days_left"`
	AllowedLocationCodes   []string   `json:"allowed_location_codes"`
	AllowedDisciplineCodes []string   `json:"allowed_discipline_codes"`
}

type planRefDTO struct {
	Code       string    `json:"code"`
	Name       Bilingual `json:"name"`
	PriceCents int       `json:"price_cents"`
}

func daysLeft(endsOn time.Time) int {
	d := int(time.Until(endsOn.Add(24*time.Hour)).Hours() / 24)
	if d < 0 {
		return 0
	}
	return d
}

func toMeDTO(v store.MeView) meDTO {
	out := meDTO{User: userDTO{ID: v.UserID, Email: v.Email, Role: v.Role, Locale: v.Locale}}
	if v.Member == nil {
		return out
	}
	m := v.Member
	out.Member = &memberDTO{
		ID: m.ID, MemberCode: m.MemberCode, FirstName: m.FirstName, LastName: m.LastName,
		Phone: m.Phone, JoinedOn: m.JoinedOn.Format("2006-01-02"),
		HomeLocation: locationRefDTO{
			Code: m.HomeLocationCode,
			Name: Bilingual{El: m.HomeLocationNameEl, En: m.HomeLocationNameEn},
		},
		Membership: membershipDTO{
			ID: m.Membership.ID,
			Plan: planRefDTO{
				Code:       m.Membership.PlanCode,
				Name:       Bilingual{El: m.Membership.PlanNameEl, En: m.Membership.PlanNameEn},
				PriceCents: m.Membership.PriceCents,
			},
			StartsOn:               m.Membership.StartsOn.Format("2006-01-02"),
			EndsOn:                 m.Membership.EndsOn.Format("2006-01-02"),
			Status:                 m.Membership.Status,
			AutoRenew:              m.Membership.AutoRenew,
			DaysLeft:               daysLeft(m.Membership.EndsOn),
			AllowedLocationCodes:   nonNil(m.Membership.AllowedLocationCodes),
			AllowedDisciplineCodes: nonNil(m.Membership.AllowedDisciplineCodes),
		},
	}
	return out
}

// nonNil turns a nil slice into an empty one so it serializes as `[]`,
// never `null` — one less null-check for every frontend consumer.
func nonNil(s []string) []string {
	if s == nil {
		return []string{}
	}
	return s
}
