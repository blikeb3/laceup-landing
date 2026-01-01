/**
 * HTML sanitization and escaping utilities
 * Centralized location for XSS prevention
 */

import DOMPurify from 'dompurify';

/**
 * Escapes HTML to prevent XSS
 * Converts special HTML characters to their entity equivalents
 */
export const escapeHtml = (text: string): string => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
};

/**
 * Validates URL scheme to prevent javascript: and data: URLs
 * Only allows http: and https: protocols
 */
export const isSafeUrl = (url: string): boolean => {
    try {
        const parsed = new URL(url);
        return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
        return false; // Invalid URL
    }
};

/**
 * Renders post content with mentions, hashtags, and URLs
 * Escapes HTML, then converts @mentions, URLs, and #hashtags to clickable elements
 * Finally sanitizes with DOMPurify before rendering
 */
export const renderPostContent = (content: string): string => {
    const escapedContent = escapeHtml(content);

    // Convert @mentions to clickable profile links
    // Format: @[userId:DisplayName] -> clickable link
    const mentionRegex = /@\[([a-f0-9-]+):([^\]]+)\]/g;
    const contentWithMentions = escapedContent.replace(
        mentionRegex,
        (_, userId, displayName) => {
            return `<a href="/profile/${userId}" class="text-gold font-semibold hover:underline">@${displayName}</a>`;
        }
    );

    // Convert URLs to clickable links (only safe URLs)
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const contentWithLinks = contentWithMentions.replace(
        urlRegex,
        (url) => {
            // Double-check URL safety before creating link
            if (!isSafeUrl(url)) {
                return url; // Return as plain text if unsafe
            }
            return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-gold hover:text-gold-light underline">${url}</a>`;
        }
    );

    // Convert hashtags to styled spans
    const contentWithHashtags = contentWithLinks.replace(
        /#(\w+)/g,
        '<span class="text-gold font-semibold">#$1</span>'
    );

    // Use DOMPurify to sanitize HTML content before rendering
    return DOMPurify.sanitize(contentWithHashtags, {
        ALLOWED_TAGS: ['span', 'a'],
        ALLOWED_ATTR: ['class', 'href', 'target', 'rel']
    });
};
