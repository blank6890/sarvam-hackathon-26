# Lesson Loom

A small local studio for turning lesson notes into a visual storyboard and narrated audio with Sarvam AI.

## Run it

1. Copy `.env.example` to `.env` and set `SARVAM_API_KEY` to a key from your Sarvam dashboard.
2. Run `npm start`.
3. Open `http://localhost:3000`.

For example, on macOS or Linux:

```sh
SARVAM_API_KEY=your_key npm start
```

The app accepts TXT and Markdown files, or pasted notes. The key must stay in the server environment; do not put it in an uploaded lesson document or browser code. Generation uses Sarvam `sarvam-105b`; narration uses `bulbul:v4-flash`. The first preview is a sample lesson and does not require an API key.

Source text is sent to Sarvam only when you select **Build my lesson**. This local starter does not save your source or generated lesson between sessions.
