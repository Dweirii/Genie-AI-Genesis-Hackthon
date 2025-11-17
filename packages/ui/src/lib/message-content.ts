export interface ParsedMessageContent {
  text: string;
  images: string[];
}

/**
 * Extracts text and image URLs from message content.
 * Handles both string content and multimodal content arrays.
 */
export function parseMessageContent(
  content: string | Array<{ type: string; text?: string; image?: string | URL }>
): ParsedMessageContent {
  const result: ParsedMessageContent = {
    text: "",
    images: [],
  };

  // Handle string content
  if (typeof content === "string") {
    result.text = content;
    return result;
  }

  // Handle array content (multimodal)
  if (Array.isArray(content)) {
    for (const item of content) {
      if (item.type === "text" && item.text) {
        result.text += (result.text ? " " : "") + item.text;
      } else if (item.type === "image" && item.image) {
        // Convert URL object to string if needed
        const imageUrl =
          typeof item.image === "string" ? item.image : item.image.toString();
        result.images.push(imageUrl);
      }
    }
  }

  return result;
}

