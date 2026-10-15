-- Data sem hora: normalizar apenas consentimentos administrativos futuros do próprio dia.
update public.newsletter_subscribers set consented_at=date_trunc('day', consented_at at time zone 'UTC') at time zone 'UTC', updated_at=now() where source='admin_csv' and consented_at > now() and consented_at::date = current_date;
