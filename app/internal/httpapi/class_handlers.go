package httpapi

import (
	"errors"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/kominipaul/flexpass/app/internal/store"
)

type classDTO struct {
	ID          string         `json:"id"`
	Discipline  disciplineDTO  `json:"discipline"`
	Trainer     Bilingual      `json:"trainer"`
	Location    locationRefDTO `json:"location"`
	StartsAt    time.Time      `json:"starts_at"`
	DurationMin int            `json:"duration_min"`
	Capacity    int            `json:"capacity"`
	Booked      int            `json:"booked"`
	Level       string         `json:"level"`
	MyStatus    *string        `json:"my_status,omitempty"`
	Allowed     bool           `json:"allowed"`
}

type disciplineDTO struct {
	Code string    `json:"code"`
	Name Bilingual `json:"name"`
	Icon string    `json:"icon"`
}

func toClassDTO(c store.ClassListItem, allowedDisciplines []string) classDTO {
	return classDTO{
		ID: c.ID,
		Discipline: disciplineDTO{
			Code: c.DisciplineCode,
			Name: Bilingual{El: c.DisciplineNameEl, En: c.DisciplineNameEn},
			Icon: c.DisciplineIcon,
		},
		Trainer: Bilingual{El: c.TrainerNameEl, En: c.TrainerNameEn},
		Location: locationRefDTO{
			Code: c.LocationCode,
			Name: Bilingual{El: c.LocationNameEl, En: c.LocationNameEn},
		},
		StartsAt: c.StartsAt, DurationMin: c.DurationMin, Capacity: c.Capacity,
		Booked: c.Booked, Level: c.Level, MyStatus: c.MyStatus,
		Allowed: contains(allowedDisciplines, c.DisciplineCode),
	}
}

func contains(list []string, want string) bool {
	for _, v := range list {
		if v == want {
			return true
		}
	}
	return false
}

func (s *Server) handleListClasses(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r.Context())
	ctx := r.Context()
	st := store.New(s.pool)

	items, err := st.ListClasses(ctx, claims.MemberID, classFilterFromQuery(r))
	if err != nil {
		s.log.Error("list classes", "err", err)
		writeProblem(w, http.StatusInternalServerError, "INTERNAL", "")
		return
	}

	me, err := st.GetMeView(ctx, claims.UserID)
	if err != nil {
		s.log.Error("get me for class list", "err", err)
		writeProblem(w, http.StatusInternalServerError, "INTERNAL", "")
		return
	}
	var allowed []string
	if me.Member != nil {
		allowed = me.Member.Membership.AllowedDisciplineCodes
	}

	out := make([]classDTO, 0, len(items))
	for _, it := range items {
		out = append(out, toClassDTO(it, allowed))
	}
	writeJSON(w, http.StatusOK, out)
}

// classFilterFromQuery reads from/to (RFC3339, for a future "browse a
// specific week" view) and location/discipline filters off the query
// string. The default 14-day rolling window covers the portal as it
// exists today.
func classFilterFromQuery(r *http.Request) store.ClassFilter {
	from := time.Now()
	to := from.AddDate(0, 0, 14)
	if v := r.URL.Query().Get("from"); v != "" {
		if t, err := time.Parse(time.RFC3339, v); err == nil {
			from = t
		}
	}
	if v := r.URL.Query().Get("to"); v != "" {
		if t, err := time.Parse(time.RFC3339, v); err == nil {
			to = t
		}
	}
	return store.ClassFilter{
		From:           from,
		To:             to,
		LocationCode:   r.URL.Query().Get("location"),
		DisciplineCode: r.URL.Query().Get("discipline"),
	}
}

type bookResponse struct {
	Status      string `json:"status"` // "booked" | "waitlisted"
	WaitlistPos int    `json:"waitlist_position,omitempty"`
}

func (s *Server) handleBookClass(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r.Context())
	classID := chi.URLParam(r, "classID")
	ctx := r.Context()
	st := store.New(s.pool)

	disc, err := st.ClassDiscipline(ctx, classID)
	if errors.Is(err, store.ErrNotFound) {
		writeProblem(w, http.StatusNotFound, "CLASS_NOT_FOUND", "")
		return
	}
	if err != nil {
		s.log.Error("class discipline", "err", err)
		writeProblem(w, http.StatusInternalServerError, "INTERNAL", "")
		return
	}

	me, err := st.GetMeView(ctx, claims.UserID)
	if err != nil || me.Member == nil {
		s.log.Error("get me for booking", "err", err)
		writeProblem(w, http.StatusInternalServerError, "INTERNAL", "")
		return
	}
	if !contains(me.Member.Membership.AllowedDisciplineCodes, disc) {
		code, nameEl, nameEn, price, cErr := st.CheapestPlanFor(ctx, disc)
		if cErr != nil {
			writeProblem(w, http.StatusForbidden, "PLAN_UPGRADE_REQUIRED", "your plan does not include this class")
			return
		}
		writeProblemExtra(w, http.StatusForbidden, "PLAN_UPGRADE_REQUIRED", "your plan does not include this class",
			planRefDTO{Code: code, Name: Bilingual{El: nameEl, En: nameEn}, PriceCents: price})
		return
	}

	status, pos, err := st.BookClass(ctx, classID, me.Member.ID)
	switch {
	case errors.Is(err, store.ErrNotFound):
		writeProblem(w, http.StatusNotFound, "CLASS_NOT_FOUND", "")
	case errors.Is(err, store.ErrClassCancelled):
		writeProblem(w, http.StatusConflict, "CLASS_CANCELLED", "this class was cancelled")
	case errors.Is(err, store.ErrClassStarted):
		writeProblem(w, http.StatusConflict, "CLASS_STARTED", "this class has already started")
	case errors.Is(err, store.ErrAlreadyBooked):
		writeProblem(w, http.StatusConflict, "ALREADY_BOOKED", "you already hold a seat in this class")
	case err != nil:
		s.log.Error("book class", "err", err)
		writeProblem(w, http.StatusInternalServerError, "INTERNAL", "")
	default:
		status2 := http.StatusCreated
		if status == "waitlisted" {
			status2 = http.StatusAccepted
		}
		writeJSON(w, status2, bookResponse{Status: status, WaitlistPos: pos})
	}
}

func (s *Server) handleCancelBooking(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r.Context())
	classID := chi.URLParam(r, "classID")
	ctx := r.Context()
	st := store.New(s.pool)

	me, err := st.GetMeView(ctx, claims.UserID)
	if err != nil || me.Member == nil {
		s.log.Error("get me for cancel", "err", err)
		writeProblem(w, http.StatusInternalServerError, "INTERNAL", "")
		return
	}

	promoted, err := st.CancelBooking(ctx, classID, me.Member.ID)
	switch {
	case errors.Is(err, store.ErrNotFound):
		writeProblem(w, http.StatusNotFound, "CLASS_NOT_FOUND", "")
	case errors.Is(err, store.ErrBookingNotFound):
		writeProblem(w, http.StatusNotFound, "BOOKING_NOT_FOUND", "you do not hold a seat in this class")
	case err != nil:
		s.log.Error("cancel booking", "err", err)
		writeProblem(w, http.StatusInternalServerError, "INTERNAL", "")
	default:
		// promoted is intentionally not surfaced to the canceller — the
		// notification belongs to whoever was promoted (a future
		// milestone); this call just confirms the cancellation.
		_ = promoted
		w.WriteHeader(http.StatusNoContent)
	}
}

func (s *Server) handleListMyBookings(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r.Context())
	st := store.New(s.pool)
	bookings, err := st.ListMyBookings(r.Context(), claims.MemberID)
	if err != nil {
		s.log.Error("list my bookings", "err", err)
		writeProblem(w, http.StatusInternalServerError, "INTERNAL", "")
		return
	}
	out := make([]myBookingDTO, 0, len(bookings))
	for _, b := range bookings {
		out = append(out, toMyBookingDTO(b))
	}
	writeJSON(w, http.StatusOK, out)
}
