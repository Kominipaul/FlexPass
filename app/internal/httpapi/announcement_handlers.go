package httpapi

import (
	"net/http"

	"github.com/kominipaul/flexpass/app/internal/store"
)

type announcementDTO struct {
	ID        string     `json:"id"`
	Kind      string     `json:"kind"`
	Title     Bilingual  `json:"title"`
	Body      Bilingual  `json:"body"`
	CTALabel  *Bilingual `json:"cta_label,omitempty"`
	CTAAction *string    `json:"cta_action,omitempty"`
}

// handleListAnnouncements is open to any authenticated member — there is
// no per-member targeting logic yet beyond what's already filtered in SQL
// (active + date range). target_plan_ids exists in the schema for a later
// pass that narrows an offer to specific plans.
func (s *Server) handleListAnnouncements(w http.ResponseWriter, r *http.Request) {
	st := store.New(s.pool)
	items, err := st.ListActiveAnnouncements(r.Context())
	if err != nil {
		s.log.Error("list announcements", "err", err)
		writeProblem(w, http.StatusInternalServerError, "INTERNAL", "")
		return
	}
	out := make([]announcementDTO, 0, len(items))
	for _, a := range items {
		dto := announcementDTO{
			ID: a.ID, Kind: a.Kind,
			Title:     Bilingual{El: a.TitleEl, En: a.TitleEn},
			Body:      Bilingual{El: a.BodyEl, En: a.BodyEn},
			CTAAction: a.CTAAction,
		}
		if a.CTALabelEl != nil && a.CTALabelEn != nil {
			dto.CTALabel = &Bilingual{El: *a.CTALabelEl, En: *a.CTALabelEn}
		}
		out = append(out, dto)
	}
	writeJSON(w, http.StatusOK, out)
}
