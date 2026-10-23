# Local AI for Purchase Invoice (9Router)

This setup is for running CuanApp locally in VS Code with the 9Router desktop/local gateway. Do not use the local gateway URL for a deployed Vercel app: `localhost` on Vercel would refer to Vercel's own server, not your computer.

## Environment variables

Add these to `.env.development.local` (never commit this file):

```dotenv
AI_BASE_URL=http://localhost:20128/v1
AI_API_KEY=your-local-9router-api-key-if-required
AI_MODEL=cl/z-ai/glm-5v-turbo
AI_API_FORMAT=chat-completions
```

- Initial test model from your current 9Router list: `cl/z-ai/glm-5v-turbo`. The name suggests a vision-capable model, but we have not verified its vision support or free quota from the local gateway; confirm by testing one image. You can override it with `AI_MODEL` if needed.
- `AI_API_KEY` is read by the server only. Do not put it in client-side variables such as `NEXT_PUBLIC_*`, and never paste it into chat or commit it.
- The default API format is `chat-completions`, which calls `POST /v1/chat/completions`. This is the first endpoint to test for local image extraction.
- `AI_API_FORMAT=responses` calls `POST /v1/responses`. Use it only after verifying that your installed 9Router gateway and selected model support this endpoint and PDF `input_file` content. Support must not be assumed from OpenAI compatibility alone.
- The invoice processor uses only `AI_API_KEY` and `AI_MODEL`; it does not fall back to OpenAI-specific variables, so the local 9Router configuration is explicit.

## Upload and queue behavior

- One batch can contain up to 100 files. Each file is validated before the batch begins.
- Files upload sequentially; if one upload fails, the remaining files are still attempted. The page reports successful and failed filenames.
- Uploaded document metadata/status is stored in the `purchase_documents` database table with status `queued`.
- Original file bytes are currently stored in private Vercel Blob storage, not inside Postgres. Processing therefore still requires `BLOB_READ_WRITE_TOKEN` and a working private Blob configuration. The database stores queue metadata and extracted/review data.
- The Documents page lists up to 1,000 recent documents and has a **Process queue** action. The browser processes queued documents one at a time to avoid flooding a free model. Failed documents remain visible and can be retried individually.
- A successful extraction changes status to `review`. It does not create a purchase until a user checks the extracted fields and explicitly confirms.

## Endpoint and file compatibility

- Images (JPG/JPEG, PNG, WebP): use `chat-completions` with a vision-capable model and the standard `image_url` message content.
- Text files: sent as text content.
- PDFs: the current route requires `AI_API_FORMAT=responses` and a gateway/model combination that supports `POST /v1/responses` with `input_file`. If this endpoint is unsupported, the PDF stays failed with an explanatory message; do not silently send PDF bytes to Chat Completions as if they were images.

## First test

1. Start the local 9Router app and confirm its gateway is active.
2. Confirm `cl/z-ai/glm-5v-turbo` is available in your local model list and whether your 9Router account marks it free; vision compatibility will be tested with one image.
3. Start CuanApp locally and upload one non-sensitive invoice image.
4. Click **Process queue** and confirm the document changes from `queued` to `review`.
5. Only after image extraction works, test one PDF and confirm the installed gateway's Responses API support.
6. Check the resulting invoice fields manually before confirming a purchase.

A free model can have quotas, rate limits, or changing availability. Queue processing is sequential, but it cannot guarantee that the upstream free service will always be available.
