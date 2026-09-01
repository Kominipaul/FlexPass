-- Reference data every environment needs: locations, plans, the plan access
-- matrix, disciplines and trainers. Idempotent (ON CONFLICT DO NOTHING) so
-- it is safe to run on every boot in dev. No members/users here — those are
-- created by real registration, never seeded.

INSERT INTO locations (code, name_el, name_en, address_el, address_en, opens_at, closes_at, timezone) VALUES
  ('ART', 'Power Life Gym — Αρτέμιδος', 'Power Life Gym — Artemidos',
   'Αρτέμιδος 130-134, Καλαμάτα', 'Artemidos 130-134, Kalamata', '06:00', '23:00', 'Europe/Athens'),
  ('PIL', 'Power Life Gym — Στούντιο Pilates', 'Power Life Gym — Pilates Studio',
   'Αρτέμιδος 130-134, 2ος όροφος', 'Artemidos 130-134, 2nd floor', '07:00', '22:00', 'Europe/Athens')
ON CONFLICT (code) DO NOTHING;

INSERT INTO plans (code, name_el, name_en, price_cents, sort_order) VALUES
  ('basic',   'Basic Pass',      'Basic Pass',      3500, 1),
  ('group',   'Group Pass',      'Group Pass',      5000, 2),
  ('premium', 'Premium Pilates', 'Premium Pilates', 7500, 3)
ON CONFLICT (code) DO NOTHING;

INSERT INTO disciplines (code, name_el, name_en, icon) VALUES
  ('pilates',    'Pilates Reformer',        'Pilates Reformer',        'flower-2'),
  ('functional', 'Λειτουργική Προπόνηση',   'Functional Training',     'dumbbell'),
  ('crossfit',   'CrossFit',                'CrossFit',                'hexagon'),
  ('trx',        'TRX',                     'TRX',                     'cable'),
  ('zumba',      'Zumba',                   'Zumba',                   'music-4'),
  ('spinning',   'Spinning',                'Spinning',                'bike')
ON CONFLICT (code) DO NOTHING;

-- Basic: home club weights/cardio only, no classes.
-- Group: both disciplines minus Pilates, Artemidos only.
-- Premium: everything, both locations.
INSERT INTO plan_location_access (plan_id, location_id)
SELECT p.id, l.id FROM plans p, locations l
WHERE (p.code = 'basic'   AND l.code = 'ART')
   OR (p.code = 'group'   AND l.code = 'ART')
   OR (p.code = 'premium' AND l.code IN ('ART', 'PIL'))
ON CONFLICT DO NOTHING;

INSERT INTO plan_discipline_access (plan_id, discipline_id)
SELECT p.id, d.id FROM plans p, disciplines d
WHERE (p.code = 'group'   AND d.code <> 'pilates')
   OR (p.code = 'premium')
ON CONFLICT DO NOTHING;

INSERT INTO trainers (name_el, name_en) VALUES
  ('Κώστας Βλάχος',        'Kostas Vlachos'),
  ('Μαρία Σπανού',         'Maria Spanou'),
  ('Γιώργος Αντωνιάδης',   'Giorgos Antoniadis'),
  ('Ελένη Ζαφειρίου',      'Eleni Zafeiriou'),
  ('Νίκος Καραλής',        'Nikos Karalis'),
  ('Δήμητρα Παππά',        'Dimitra Pappa')
ON CONFLICT DO NOTHING;

INSERT INTO announcements (kind, title_el, title_en, body_el, body_en, cta_label_el, cta_label_en, cta_action) VALUES
  ('offer', '−20% σε πακέτα Personal Training', '−20% on Personal Training packages',
   '10 συνεδρίες με τον προπονητή σας, με ισχύ έως 30 Σεπτεμβρίου. Ιδανικό για επανεκκίνηση μετά το καλοκαίρι.',
   '10 sessions with your coach, valid until 30 September. Built for a strong restart after summer.',
   'Κλείστε ραντεβού', 'Book a consultation', 'request_pt'),
  ('news', 'Δωρεάν μέτρηση InBody κάθε Τρίτη', 'Free InBody measurement every Tuesday',
   'Ελάτε 07:00–11:00 στην Αρτέμιδος, χωρίς ραντεβού.',
   'Drop in 07:00–11:00 at Artemidos, no appointment needed.',
   NULL, NULL, NULL)
ON CONFLICT DO NOTHING;
