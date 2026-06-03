-- The "Domain Expert" role was renamed to "Legal" in the app. The i_am /
-- looking_for columns are backed by the profile_role enum, which still carried
-- the old value, so saving a profile with role "legal" failed with
-- "invalid input value for enum profile_role". Rename the value in place
-- (safe: no rows use it yet, and RENAME VALUE runs in a transaction).

alter type profile_role rename value 'domain_expert' to 'legal';
