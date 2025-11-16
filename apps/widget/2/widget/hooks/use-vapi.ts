import Vapi from "@vapi-ai/web";
import { useEffect, useState } from "react";

interface TranscriptMessage {
    role: "user" | "assistant";
    text: string;
};

export const useVapi = () => {
    const [vapi, setVapi] = useState<Vapi | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [isConectting, setIsConnecting] = useState(false);
    const [isSpkeaking, setIsSpeaking] = useState(false);
    const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);

    useEffect(() => {
        const vapiInstance = new Vapi("");
        setVapi(vapiInstance);

        vapiInstance.on("call-start", () => {
            setIsConnected(true);
            setIsConnecting(false);
            setTranscript([]);
        });

        vapiInstance.on("call-end", () => {
            setIsConnected(false);
            setIsConnecting(false);
            setIsSpeaking(false);
        });

        vapiInstance.on("speech-start", () => {
            setIsSpeaking(true);
        });

        vapiInstance.on("speech-end", () => {
            setIsSpeaking(false);
        });

       vapiInstance.on("error", (error: Error) => {
            console.log("Vapi error:", error);
            setIsConnecting(false);
       });

       vapiInstance.on("message", (message) => {
            if(message.type === "Transcript" && message.transcriptType === "Final") {
                setTranscript((prev) => [
                    ...prev,
                    {
                        role: message.role === "user" ? "user" : "assistant",
                        text: message.transcript,
                    }
                ]);
            }
       });

       return () => {
        vapiInstance?.stop();
       }

    }, []);

    const startCall = () => {
        setIsConnecting(true);

        if (Vapi) {
            vapi?.start();
        }
    }

    const endCall = () => {
        if (vapi) {
            vapi.stop();
        }
    };

    return {
        isConectting,
        isConnected,
        isSpkeaking,
        transcript,
        startCall,
        endCall,
    }
};