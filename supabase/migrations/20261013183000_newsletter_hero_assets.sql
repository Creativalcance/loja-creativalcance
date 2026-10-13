-- Asset público exclusivamente de imagens de campanhas.
alter table public.newsletter_campaigns
add column if not exists hero_image_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('newsletter-assets', 'newsletter-assets', true, 1500000, ARRAY['image/jpeg'])
on conflict (id) do nothing;
