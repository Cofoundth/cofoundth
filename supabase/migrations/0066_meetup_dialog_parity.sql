-- Meetup interaction parity: more categories + reportable meetups.
--
-- The reference product's create wizard offers Gym / Hike / Walk (and a
-- drinks-style social) beyond our original six; its meetup dialog carries
-- "Report meetup". report_kind is the existing moderation enum — meetups
-- become one more thing the admin reports queue can hold.

alter type report_kind add value if not exists 'meetup';

alter table public.meetups drop constraint if exists meetups_category_check;
alter table public.meetups add constraint meetups_category_check
  check (category in
    ('coffee','cowork','dinner','talk','run','gym','hike','walk','drinks','other'));
