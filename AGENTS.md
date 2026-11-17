<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

<!-- AGENT-MEMORY:BEGIN -->
- App tables (listeners, payment_requests, search_cache) have RLS on with no policies; all access goes through server functions in src/lib/*.functions.ts using supabaseAdmin. Why: no user accounts, listener id (random uuid in localStorage) identifies the user.
- Admin server functions take the passcode on every call and compare it to the ADMIN_PASSCODE secret. Why: the client-side gate alone is not security.
- Song search is keyless: src/lib/youtube.functions.ts races public Piped/Invidious mirrors, caches results in search_cache (shared, 6h TTL), then falls back to stale cache, then to src/lib/sample-tracks.ts. It never returns an error to the UI. Fetched client-side with useQuery (not route loaders). Why: mirrors are flaky and the user wants search to always show songs without a Google key.
- Playlists live in localStorage; downloaded MP3s live in the IndexedDB audio vault (src/lib/audio-vault.ts), both per device; premium status comes from the server.
- MP3 downloads: getMp3Link server fn checks premium, calls RapidAPI youtube-mp36 with retry logic in src/lib/mp3-retry.ts, returns the CDN link; the browser fetches it (CORS open) into the vault. Key = app_settings 'rapidapi_key' (admin-editable) else RAPIDAPI_KEY secret. Why: key must stay server-side and work for every listener, not just the admin's device.
- Pricing/premium rules live in src/lib/plans.ts and are covered by src/test/plans.test.ts.
<!-- AGENT-MEMORY:END -->
