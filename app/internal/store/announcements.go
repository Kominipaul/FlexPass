package store

import "context"

type Announcement struct {
	ID         string
	Kind       string
	TitleEl    string
	TitleEn    string
	BodyEl     string
	BodyEn     string
	CTALabelEl *string
	CTALabelEn *string
	CTAAction  *string
}

func (s *Store) ListActiveAnnouncements(ctx context.Context) ([]Announcement, error) {
	rows, err := s.Pool.Query(ctx, `
		SELECT id, kind, title_el, title_en, body_el, body_en, cta_label_el, cta_label_en, cta_action
		FROM announcements
		WHERE active AND starts_on <= current_date AND (ends_on IS NULL OR ends_on >= current_date)
		ORDER BY created_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []Announcement
	for rows.Next() {
		var a Announcement
		if err := rows.Scan(&a.ID, &a.Kind, &a.TitleEl, &a.TitleEn, &a.BodyEl, &a.BodyEn,
			&a.CTALabelEl, &a.CTALabelEn, &a.CTAAction); err != nil {
			return nil, err
		}
		out = append(out, a)
	}
	return out, rows.Err()
}
