import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { secureLog } from "@/lib/secureLog";

// Allowed file types for uploads
const ALLOWED_FILE_TYPES = {
    images: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
    documents: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    all: [] as string[]
};

// Combine all allowed types
ALLOWED_FILE_TYPES.all = [...ALLOWED_FILE_TYPES.images, ...ALLOWED_FILE_TYPES.documents];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

interface FileData {
    url: string;
    name: string;
    type: string;
}

export const useFileUpload = () => {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [filePreview, setFilePreview] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!ALLOWED_FILE_TYPES.all.includes(file.type)) {
            toast({
                title: "Invalid file type",
                description: "Please select an image (JPEG, PNG, GIF, WebP) or document (PDF, Word)",
                variant: "destructive"
            });
            secureLog.security("Rejected file upload - invalid type", { fileType: file.type });
            return;
        }

        // Validate file size (max 10MB)
        if (file.size > MAX_FILE_SIZE) {
            toast({
                title: "File too large",
                description: "Please select a file smaller than 10MB",
                variant: "destructive"
            });
            secureLog.security("Rejected file upload - too large", { fileSize: file.size });
            return;
        }

        setSelectedFile(file);

        // Create preview only for images
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFilePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        } else {
            setFilePreview(null);
        }
    };

    const uploadFile = async (userId: string): Promise<FileData | null> => {
        if (!selectedFile) return null;

        setUploading(true);
        try {
            const fileExt = selectedFile.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `${userId}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('message-files')
                .upload(filePath, selectedFile);

            if (uploadError) {
                throw uploadError;
            }

            const { data } = supabase.storage.from('message-files').getPublicUrl(filePath);
            return {
                url: data.publicUrl,
                name: selectedFile.name,
                type: selectedFile.type
            };
        } catch (error) {
            secureLog.error('File upload failed', error);
            toast({
                title: "Upload failed",
                description: "Failed to upload file",
                variant: "destructive"
            });
            return null;
        } finally {
            setUploading(false);
        }
    };

    const clearFileSelection = () => {
        setSelectedFile(null);
        setFilePreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const openFilePicker = () => {
        fileInputRef.current?.click();
    };

    return {
        selectedFile,
        filePreview,
        uploading,
        fileInputRef,
        handleFileSelect,
        uploadFile,
        clearFileSelection,
        openFilePicker
    };
};
