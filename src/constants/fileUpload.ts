/**
 * Shared constants for file upload validation
 * Centralized to avoid duplication and ensure consistency
 */

// Allowed file types for uploads
export const ALLOWED_FILE_TYPES = {
    images: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
    videos: ['video/mp4', 'video/quicktime', 'video/x-msvideo'],
    documents: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
} as const;

// Combined allowed types for different contexts
export const ALLOWED_IMAGE_AND_DOCUMENT_TYPES = [
    ...ALLOWED_FILE_TYPES.images,
    ...ALLOWED_FILE_TYPES.documents
];

export const ALLOWED_IMAGE_AND_VIDEO_TYPES = [
    ...ALLOWED_FILE_TYPES.images,
    ...ALLOWED_FILE_TYPES.videos
];

// File size limits
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB
export const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024; // 10MB

// File count limits
export const MAX_FILES_PER_POST = 10;
