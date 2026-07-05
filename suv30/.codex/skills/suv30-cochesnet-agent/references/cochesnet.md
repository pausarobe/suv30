# coches.net Import Notes

Prefer importing from a filtered search URL. The UI can expose fields later, but the stable MVP input is a URL copied after the user applies filters on coches.net.

Selectors may change. Favor broad extraction:

- Collect links where `href` includes likely car listing paths and the same domain.
- Visit each unique URL.
- Parse from page text and metadata rather than relying on one exact card selector.

If direct parsing fails, keep the URL in the error list and skip the listing rather than inserting bad data.
