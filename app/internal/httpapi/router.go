package httpapi

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

func (s *Server) Router() http.Handler {
	r := chi.NewRouter()
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(s.requestLogger)
	r.Use(middleware.Recoverer)
	r.Use(securityHeaders)
	r.Use(s.cors)

	r.Get("/healthz", s.handleHealthz)
	r.Get("/readyz", s.handleReadyz)

	r.Route("/api/v1", func(r chi.Router) {
		r.Route("/auth", func(r chi.Router) {
			r.Post("/register", s.handleRegister)
			r.Post("/login", s.handleLogin)
			r.Post("/refresh", s.handleRefresh)
			r.Post("/logout", s.handleLogout)
		})

		r.Group(func(r chi.Router) {
			r.Use(s.requireAuth)

			r.Get("/me", s.handleMe)

			r.With(s.requireRole("member")).Get("/me/pass", s.handleGetPass)
			r.With(s.requireRole("member")).Post("/me/membership/freeze", s.handleFreeze)
			r.With(s.requireRole("member")).Post("/me/membership/unfreeze", s.handleUnfreeze)
			r.With(s.requireRole("member")).Post("/me/membership/renew", s.handleRenew)
			r.With(s.requireRole("member")).Post("/me/membership/plan", s.handleChangePlan)
			r.With(s.requireRole("member")).Get("/me/invoices", s.handleListInvoices)
			r.With(s.requireRole("member")).Get("/me/bookings", s.handleListMyBookings)

			r.With(s.requireRole("member")).Get("/classes", s.handleListClasses)
			r.With(s.requireRole("member")).Post("/classes/{classID}/book", s.handleBookClass)
			r.With(s.requireRole("member")).Delete("/classes/{classID}/book", s.handleCancelBooking)

			r.Get("/announcements", s.handleListAnnouncements)
		})

		r.Post("/door/verify", s.handleDoorVerify)
	})

	return r
}
