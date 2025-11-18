export interface ParsedMessageContent {
  text: string;
  images: string[];
}

/**
 * Extracts text and image URLs from message content.
 * Handles both string content and multimodal content arrays.
 */
export function parseMessageContent(
  content: unknown
): ParsedMessageContent {
  const result: ParsedMessageContent = {
    text: "",
    images: [],
  };

  const appendText = (text: string | undefined | null) => {
    if (!text) return;
    result.text += result.text ? ` ${text}` : text;
  };

  const appendImage = (image: string | URL | undefined | null) => {
    if (!image) return;
    const imageUrl = typeof image === "string" ? image : image.toString();
    result.images.push(imageUrl);
  };

  const visit = (value: unknown) => {
    if (value === null || value === undefined) {
      return;
    }

    if (typeof value === "string") {
      appendText(value);
      return;
    }

    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }

    if (typeof value === "object") {
      const item = value as Record<string, unknown>;

      if (typeof item.text === "string") {
        appendText(item.text);
      }

      if (item.type === "image" && item.image) {
        appendImage(item.image as string | URL);
      } else if (item.image && typeof item.image === "string") {
        appendImage(item.image);
      }

      if ("content" in item) {
        visit(item.content);
      }

      if ("data" in item) {
        visit(item.data);
      }

      if ("parts" in item && Array.isArray(item.parts)) {
        visit(item.parts);
      }
    }
  };

  visit(content);

  return result;
}

