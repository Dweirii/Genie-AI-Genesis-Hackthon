import { useState, useCallback, useEffect } from "react";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_IMAGE_COUNT = 5;
const SUPPORTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
];

export interface ImageUploadError {
  message: string;
  type: "size" | "type" | "count" | "unknown";
}

export interface UseImageUploadReturn {
  selectedImages: File[];
  previewUrls: string[];
  errors: ImageUploadError[];
  addImages: (files: File[]) => void;
  removeImage: (index: number) => void;
  clearImages: () => void;
  hasImages: boolean;
  canAddMore: boolean;
}

export function useImageUpload(): UseImageUploadReturn {
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [errors, setErrors] = useState<ImageUploadError[]>([]);

  // Generate preview URLs
  useEffect(() => {
    const urls = selectedImages.map((file) => URL.createObjectURL(file));
    setPreviewUrls(urls);

    // Cleanup function to revoke object URLs
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [selectedImages]);

  const validateImage = useCallback((file: File): ImageUploadError | null => {
    // Check file type
    if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
      return {
        message: `Unsupported image type: ${file.type}. Supported types: JPEG, PNG, WebP, GIF`,
        type: "type",
      };
    }

    // Check file size
    if (file.size > MAX_IMAGE_SIZE) {
      return {
        message: `Image size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum of ${MAX_IMAGE_SIZE / 1024 / 1024}MB`,
        type: "size",
      };
    }

    return null;
  }, []);

  const addImages = useCallback(
    (files: File[]) => {
      const newErrors: ImageUploadError[] = [];
      const validFiles: File[] = [];

      // Check if adding these files would exceed the limit
      const remainingSlots = MAX_IMAGE_COUNT - selectedImages.length;
      if (files.length > remainingSlots) {
        newErrors.push({
          message: `You can only add ${remainingSlots} more image${remainingSlots === 1 ? "" : "s"}. Maximum ${MAX_IMAGE_COUNT} images allowed.`,
          type: "count",
        });
        // Only process the files that fit
        files = files.slice(0, remainingSlots);
      }

      // Validate each file
      for (const file of files) {
        const error = validateImage(file);
        if (error) {
          newErrors.push(error);
        } else {
          validFiles.push(file);
        }
      }

      setErrors(newErrors);

      if (validFiles.length > 0) {
        setSelectedImages((prev) => [...prev, ...validFiles]);
      }
    },
    [selectedImages.length, validateImage]
  );

  const removeImage = useCallback((index: number) => {
    setSelectedImages((prev) => {
      const newImages = [...prev];
      newImages.splice(index, 1);
      return newImages;
    });
    setErrors([]);
  }, []);

  const clearImages = useCallback(() => {
    setSelectedImages([]);
    setErrors([]);
  }, []);

  return {
    selectedImages,
    previewUrls,
    errors,
    addImages,
    removeImage,
    clearImages,
    hasImages: selectedImages.length > 0,
    canAddMore: selectedImages.length < MAX_IMAGE_COUNT,
  };
}

