-- Make installation-site-media bucket public so uploaded photos/videos
-- can be viewed directly in the admin UI via public URLs.

update storage.buckets
set public = true
where id = 'installation-site-media';

