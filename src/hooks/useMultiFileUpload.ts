import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { secureLog } from "@/lib/secureLog";
import { ALLOWED_IMAGE_AND_VIDEO_TYPES, MAX_VIDEO_SIZE, MAX_IMAGE_SIZE, MAX_FILES_PER_POST } from "@/constants/fileUpload";

interface PostMediaFile {
    file: File;
    preview: string;
    id: string; // Temporary ID for UI
}

interface UploadedMedia {
    url: string;
    media_type: string;
}

export const useMultiFileUpload = () => {
    const [mediaFiles, setMediaFiles] = useState<PostMediaFile[]>([]);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    const handleFilesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        const newMediaFiles: PostMediaFile[] = [];

        for (const file of files) {
            // Check max files limit
            if (mediaFiles.length + newMediaFiles.length >= MAX_FILES_PER_POST) {
                toast({
                    title: "Too many files",
                    description: `Maximum ${MAX_FILES_PER_POST} files allowed per post`,
                    variant: "destructive"
                });
                break;
            }

            // Validate file type
            if (!ALLOWED_IMAGE_AND_VIDEO_TYPES.includes(file.type)) {
                toast({
                    title: "Invalid file type",
                    description: `${file.name} - Only images (JPEG, PNG, GIF, WebP) and videos (MP4, MOV, AVI) are allowed`,
                    variant: "destructive"
                });
                secureLog.security("Rejected file upload - invalid type", { fileType: file.type, fileName: file.name });
                continue;
            }

            // Validate file size
            const maxSize = file.type.startsWith('video') ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
            if (file.size > maxSize) {
                toast({
                    title: "File too large",
                    description: `${file.name} - Please select a file smaller than ${maxSize / (1024 * 1024)}MB`,
                    variant: "destructive"
                });
                secureLog.security("Rejected file upload - too large", { fileSize: file.size, fileName: file.name });
                continue;
            }

            // Create preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setMediaFiles(prev => [...prev, {
                    file,
                    preview: reader.result as string,
                    id: `${Date.now()}_${Math.random().toString(36).substring(7)}`
                }]);
            };
            reader.readAsDataURL(file);
        }

        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const removeMediaFile = (id: string) => {
        setMediaFiles(prev => prev.filter(m => m.id !== id));
    };

    const uploadMediaFiles = async (userId: string): Promise<UploadedMedia[]> => {
        if (mediaFiles.length === 0) return [];

        setUploading(true);
        const uploadedMedia: UploadedMedia[] = [];

        try {
            for (const media of mediaFiles) {
                const file = media.file;
                const bucket = file.type.startsWith('video') ? 'post-videos' : 'post-images';
                const fileExt = file.name.split('.').pop();
                const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
                const filePath = `${userId}/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from(bucket)
                    .upload(filePath, file);

                if (uploadError) {
                    throw uploadError;
                }

                const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
                uploadedMedia.push({
                    url: data.publicUrl,
                    media_type: file.type
                });
            }

            toast({
                title: "Success",
                description: `${uploadedMedia.length} file(s) uploaded successfully`,
            });

            return uploadedMedia;
        } catch (error) {
            secureLog.error('File upload failed', error);
            toast({
                title: "Upload failed",
                description: "Failed to upload some files",
                variant: "destructive"
            });
            return uploadedMedia;
        } finally {
            setUploading(false);
        }
    };

    const clearMediaFiles = () => {
        setMediaFiles([]);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const openFilePicker = () => {
        fileInputRef.current?.click();
    };

    return {
        mediaFiles,
        uploading,
        fileInputRef,
        handleFilesSelect,
        uploadMediaFiles,
        removeMediaFile,
        clearMediaFiles,
        openFilePicker
    };
};
