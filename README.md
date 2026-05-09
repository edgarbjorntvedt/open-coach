# Open Coach

A push-to-talk AI coach with real-time Norwegian transcription.

## Idea

Two hotkeys drive the conversation:

- **Hotkey 1** — I speak. Audio is streamed and transcribed live (Norwegian).
- **Hotkey 2** — The AI coach speaks back, applying solid coaching techniques.

The transcription is continuous and streaming — no single audio file is created at the end. Latency matters; output should appear as I talk.

## Goal

A personal AI coach I can talk to throughout the day — using proven coaching techniques to help me reflect, think clearly, and move forward.

## Stack

- Node.js / TypeScript
- Streaming speech-to-text (Norwegian)
- Anthropic Claude for coaching responses
- Text-to-speech for AI voice output
- Global hotkey listener

## Status

Early ideation. See [`braindump.md`](./braindump.md) for the original thoughts.
