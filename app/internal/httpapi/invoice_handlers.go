package httpapi

import (
	"net/http"

	"github.com/kominipaul/flexpass/app/internal/store"
)

type invoiceDTO struct {
	Number      string    `json:"number"`
	IssuedOn    string    `json:"issued_on"`
	Description Bilingual `json:"description"`
	AmountCents int       `json:"amount_cents"`
	Status      string    `json:"status"`
	Method      string    `json:"method,omitempty"`
}

func (s *Server) handleListInvoices(w http.ResponseWriter, r *http.Request) {
	claims := claimsFrom(r.Context())
	st := store.New(s.pool)
	invoices, err := st.ListInvoices(r.Context(), claims.MemberID)
	if err != nil {
		s.log.Error("list invoices", "err", err)
		writeProblem(w, http.StatusInternalServerError, "INTERNAL", "")
		return
	}
	out := make([]invoiceDTO, 0, len(invoices))
	for _, inv := range invoices {
		out = append(out, invoiceDTO{
			Number: inv.Number, IssuedOn: inv.IssuedOn.Format("2006-01-02"),
			Description: Bilingual{El: inv.DescEl, En: inv.DescEn},
			AmountCents: inv.AmountCents, Status: inv.Status, Method: inv.Method,
		})
	}
	writeJSON(w, http.StatusOK, out)
}
