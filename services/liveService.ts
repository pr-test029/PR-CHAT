import { GoogleGenAI, LiveServerMessage, Modality, LiveSession } from '@google/genai';

let ai: GoogleGenAI | null = null;

export const initializeGenAI = () => {
  if (process.env.API_KEY) {
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
};

export type LiveConfig = {
  onAudioData: (base64: string) => void;
  onClose: () => void;
  onError: (e: Error) => void;
  onTranscription?: (userText: string, modelText: string) => void;
};

export class LiveClient {
  private sessionPromise: Promise<LiveSession> | null = null;
  private inputAudioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;
  private active: boolean = false;

  constructor(private config: LiveConfig) {
     if (!ai) initializeGenAI();
  }

  async connect() {
    if (!ai) throw new Error("AI Not initialized");
    
    this.active = true;
    
    // Setup Input Audio (Mic)
    this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    this.sessionPromise = ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-09-2025',
      callbacks: {
        onopen: () => {
          console.log("Live Session Opened");
          this.startAudioStreaming();
        },
        onmessage: (message: LiveServerMessage) => {
           this.handleMessage(message);
        },
        onclose: () => {
          console.log("Live Session Closed");
          this.config.onClose();
        },
        onerror: (e) => {
          console.error("Live Session Error", e);
          this.config.onError(new Error("Connection error"));
        }
      },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
        },
        systemInstruction: "You are a helpful, friendly assistant integrated into PR-CHAT.",
        inputAudioTranscription: {},
        outputAudioTranscription: {}
      }
    });
  }

  private startAudioStreaming() {
    if (!this.inputAudioContext || !this.stream || !this.sessionPromise) return;

    this.source = this.inputAudioContext.createMediaStreamSource(this.stream);
    this.processor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);

    this.processor.onaudioprocess = (e) => {
      if (!this.active) return;
      const inputData = e.inputBuffer.getChannelData(0);
      const pcmBlob = this.createBlob(inputData);
      
      this.sessionPromise?.then(session => {
        session.sendRealtimeInput({ media: pcmBlob });
      });
    };

    this.source.connect(this.processor);
    this.processor.connect(this.inputAudioContext.destination);
  }

  private handleMessage(message: LiveServerMessage) {
    // Audio Output
    const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
    if (audioData) {
      this.config.onAudioData(audioData);
    }

    // Transcription
    if (this.config.onTranscription) {
       if (message.serverContent?.inputTranscription?.text) {
           this.config.onTranscription(message.serverContent.inputTranscription.text, "");
       }
       if (message.serverContent?.outputTranscription?.text) {
           this.config.onTranscription("", message.serverContent.outputTranscription.text);
       }
    }
  }

  async disconnect() {
    this.active = false;
    if (this.source) this.source.disconnect();
    if (this.processor) this.processor.disconnect();
    if (this.stream) this.stream.getTracks().forEach(t => t.stop());
    if (this.inputAudioContext) await this.inputAudioContext.close();
    
    // We can't explicitly close the session in the SDK easily in the same way, 
    // but stopping the stream stops input. The server will time out or we rely on page unload.
    // However, if we stored the session, we could try to send a close signal if protocol supported, 
    // but here we just clean up client side.
    // Actually, the example says session.close() is not available, we just release resources.
    // Correction: The example says "When the conversation is finished, use session.close()".
    if (this.sessionPromise) {
        this.sessionPromise.then(s => {
             // Assuming the type supports it, though not explicitly in all example snippets, 
             // standard websocket practice is to close. 
             // The type LiveSession doesn't expose close() in the public typings in some versions,
             // but we will assume standard cleanup is sufficient via stream stop.
             // If strict type checking fails, we cast to any.
             (s as any).close?.();
        });
    }
  }

  private createBlob(data: Float32Array) {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      int16[i] = data[i] * 32768;
    }
    
    // Custom minimal base64 encode for the blob data if needed, 
    // but the SDK expects an object with data (base64) and mimeType.
    // We need to convert Uint8Array to base64 string.
    const uint8 = new Uint8Array(int16.buffer);
    let binary = '';
    const len = uint8.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(uint8[i]);
    }
    const base64 = btoa(binary);

    return {
      data: base64,
      mimeType: 'audio/pcm;rate=16000',
    };
  }
}
