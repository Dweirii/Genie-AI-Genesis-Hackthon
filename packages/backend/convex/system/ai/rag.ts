import { google } from "@ai-sdk/google";
import { RAG } from "@convex-dev/rag";
import { components } from "../../_generated/api";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rag = new RAG(components.rag as any, {
  textEmbeddingModel: google.embedding("text-embedding-004"),
  embeddingDimension: 768,
});

export default rag;

