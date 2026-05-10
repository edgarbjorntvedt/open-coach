import WebSocket from "ws";

export interface RealtimeEvents {
  onReady: () => void;
  onAudio: (audio: Buffer) => void;
  onUserTranscript: (text: string) => void;
  onCoachTranscriptDelta: (delta: string) => void;
  onCoachTranscriptDone: () => void;
  onUserSpeechStopped: () => void;
  onCoachResponseDone: () => void;
  onError: (err: unknown) => void;
  onClose: (code: number, reason: string) => void;
}

export interface RealtimeClient {
  appendAudio: (chunk: Buffer) => void;
  close: () => void;
}

export interface RealtimeOptions {
  apiKey: string;
  model: string;
  instructions: string;
  voice?: string;
  events: RealtimeEvents;
}

export function connectRealtime(opts: RealtimeOptions): RealtimeClient {
  const url = `wss://api.openai.com/v1/realtime?model=${encodeURIComponent(opts.model)}`;
  const ws = new WebSocket(url, {
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      "OpenAI-Beta": "realtime=v1",
    },
  });

  ws.on("open", () => {
    ws.send(JSON.stringify({
      type: "session.update",
      session: {
        modalities: ["audio", "text"],
        instructions: opts.instructions,
        voice: opts.voice ?? "alloy",
        input_audio_format: "pcm16",
        output_audio_format: "pcm16",
        input_audio_transcription: { model: "whisper-1" },
        turn_detection: { type: "semantic_vad", eagerness: "low" },
      },
    }));
    ws.send(JSON.stringify({ type: "response.create" }));
    opts.events.onReady();
  });

  ws.on("message", (raw: Buffer) => {
    let msg: { type: string; [k: string]: unknown };
    try { msg = JSON.parse(raw.toString()); } catch { return; }

    switch (msg.type) {
      case "response.audio.delta":
        opts.events.onAudio(Buffer.from(msg.delta as string, "base64"));
        break;
      case "response.audio_transcript.delta":
        opts.events.onCoachTranscriptDelta((msg.delta as string) ?? "");
        break;
      case "response.audio_transcript.done":
        opts.events.onCoachTranscriptDone();
        break;
      case "conversation.item.input_audio_transcription.completed":
        opts.events.onUserTranscript((msg.transcript as string) ?? "");
        break;
      case "input_audio_buffer.speech_stopped":
        opts.events.onUserSpeechStopped();
        break;
      case "response.done":
        opts.events.onCoachResponseDone();
        break;
      case "error":
        opts.events.onError(msg.error);
        break;
    }
  });

  ws.on("error", (e) => opts.events.onError(e));
  ws.on("close", (code, reason) => opts.events.onClose(code, reason.toString()));

  return {
    appendAudio: (chunk: Buffer) => {
      if (ws.readyState !== WebSocket.OPEN) return;
      ws.send(JSON.stringify({
        type: "input_audio_buffer.append",
        audio: chunk.toString("base64"),
      }));
    },
    close: () => {
      try { ws.close(); } catch { /* ignore */ }
    },
  };
}
