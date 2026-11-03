# OSCADIA Blog v2

## Added in this version
- Follow / follower relationships and counts
- Yellow personal badge eligibility: at least 100 followers, then administrator approval. The admin account `cucu@oscadia.net` is exempt from the follower threshold.
- Profile avatar upload
- Insert links and uploaded images/videos/files at the cursor position inside the post body
- Public posts and profile pages; authenticated members can interact

## Setup
1. Run `supabase-upgrade.sql` in the existing OSCADIA Supabase project SQL Editor. It extends the original schema; it is intended for the original starter schema.
2. Replace the old `app.js`, `index.html`, and `style.css` with the files in this package.
3. Keep your existing `config.js`, or copy `config.example.js` to `config.js` and enter the existing OSCADIA Supabase Project URL and anon/public key.
4. Deploy the repository to GitHub Pages.
5. In Supabase Authentication → URL Configuration, allow `https://blog.oscadia.net/**`.

## Inline content syntax
The editor's buttons insert syntax at the cursor:
- `[link text](https://example.com)`
- `![image description](https://example.com/image.jpg)`
- `{{video:https://example.com/video.mp4}}`
- uploaded files are inserted as `[filename](public-file-url)`

Uploaded media tokens are replaced with the real storage URLs when publishing. Supported video files depend on the browser's codec support.

## Badge rules
- Blue `공식` badge: administrator assigned.
- Yellow `인증` badge: admin-approved personal account with 100+ followers, except the admin account.
- Only the administrator can change badge fields. Do not share a Supabase service-role key in browser code.

## Important
The attachments bucket is public because blog posts are public. Never upload private or sensitive files. The included client is a starter; test with a non-admin account before launch.
