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
    // Trim to avoid adding pure whitespace
    const trimmed = text.trim();
    if (!trimmed) return;
    result.text += result.text ? ` ${trimmed}` : trimmed;
  };

  const appendImage = (image: string | URL | undefined | null) => {
    if (!image) return;
    const imageUrl = typeof image === "string" ? image : image.toString();
    result.images.push(imageUrl);
  };

  const visit = (value: unknown, depth = 0) => {
    if (value === null || value === undefined) {
      return;
    }

    // Prevent infinite recursion
    if (depth > 10) {
      console.warn("[parseMessageContent] Max depth reached, stopping recursion");
      return;
    }

    if (typeof value === "string") {
      appendText(value);
      return;
    }

    if (Array.isArray(value)) {
      value.forEach(item => visit(item, depth + 1));
      return;
    }

    if (typeof value === "object") {
      const item = value as Record<string, unknown>;

      // Handle typed content items (e.g., { type: "text", text: "..." })
      if (item.type === "text" && typeof item.text === "string") {
        appendText(item.text);
        return; // Don't process further to avoid duplication
      }

      if (item.type === "image" && item.image) {
        appendImage(item.image as string | URL);
        return; // Don't process further to avoid duplication
      }

      // Handle plain text field (only if no type specified)
      if (typeof item.text === "string" && !item.type) {
        appendText(item.text);
      }

      // Handle plain image field (only if no type specified)
      if (item.image && typeof item.image === "string" && !item.type) {
        appendImage(item.image);
      }

      // Recursively visit nested structures
      if ("content" in item && item.content !== item) {
        visit(item.content, depth + 1);
      }

      if ("data" in item) {
        visit(item.data, depth + 1);
      }

      if ("parts" in item && Array.isArray(item.parts)) {
        visit(item.parts, depth + 1);
      }

      // Handle message field (some messages nest content in message.content)
      if ("message" in item && item.message !== item) {
        visit(item.message, depth + 1);
      }

      // Handle role/content structure (common in chat messages)
      if ("role" in item && "content" in item && item.content !== item) {
        visit(item.content, depth + 1);
      }

      // As a last resort, check all keys for nested content
      if (depth < 3) { // Only do this for shallow objects to avoid too much recursion
        const keys = Object.keys(item);
        for (const key of keys) {
          const val = item[key];
          // Skip if we've already processed this key or if it's a primitive/reference to self
          if (
            key !== "type" &&
            key !== "role" &&
            key !== "text" &&
            key !== "image" &&
            key !== "content" &&
            key !== "data" &&
            key !== "parts" &&
            key !== "message" &&
            val !== item &&
            (typeof val === "object" || typeof val === "string")
          ) {
            visit(val, depth + 1);
          }
        }
      }
    }
  };

  visit(content);

  // Fallback: If we couldn't parse any text but content exists as a non-empty structure,
  // try to stringify it as a last resort (for debugging unexpected formats)
  if (!result.text && !result.images.length && content) {
    if (typeof content === "object" && content !== null) {
      // Check if there's any actual data in the object
      const hasData = JSON.stringify(content).length > 2; // More than just "{}"
      if (hasData) {
        console.warn("[parseMessageContent] Failed to parse content, structure:", content);
      }
    }
  }

  return result;
}

