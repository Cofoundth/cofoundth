-- Meetups gain a TOPIC: what the host wants to talk about, chosen in step 2 of
-- the create wizard. Distinct from `category`, which is the FORMAT of the
-- meeting (coffee / run / cowork) — the same coffee can be about fundraising
-- or about burnout, and a founder scanning the calendar cares about both.
--
-- Nullable on purpose: every row created before this migration has no topic
-- and stays valid. The CHECK therefore allows NULL and constrains only the
-- 12 keys in MEETUP_TOPICS (lib/meetups.ts) — the same both-ends discipline
-- 0064_meetup_categories.sql uses for `category`.

alter table public.meetups add column if not exists topic text;

alter table public.meetups drop constraint if exists meetups_topic_check;
alter table public.meetups add constraint meetups_topic_check check (
  topic is null or topic in (
    'customers',
    'feedback',
    'fundraising',
    'cofounder',
    'team',
    'sales_marketing',
    'product_ux',
    'ai_tools',
    'wellbeing',
    'scaling',
    'accountability',
    'connecting'
  )
);

comment on column public.meetups.topic is
  'What the meetup is about (MEETUP_TOPICS key). NULL on rows created before the topic step existed.';
