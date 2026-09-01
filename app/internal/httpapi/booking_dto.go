package httpapi

import (
	"time"

	"github.com/kominipaul/flexpass/app/internal/store"
)

type myBookingDTO struct {
	ClassID      string    `json:"class_id"`
	Status       string    `json:"status"`
	WaitlistPos  *int      `json:"waitlist_position,omitempty"`
	Discipline   Bilingual `json:"discipline"`
	LocationCode string    `json:"location_code"`
	StartsAt     time.Time `json:"starts_at"`
}

func toMyBookingDTO(b store.MyBooking) myBookingDTO {
	return myBookingDTO{
		ClassID: b.ClassID, Status: b.Status, WaitlistPos: b.WaitlistPos,
		Discipline:   Bilingual{El: b.DisciplineNameEl, En: b.DisciplineNameEn},
		LocationCode: b.LocationCode, StartsAt: b.StartsAt,
	}
}
