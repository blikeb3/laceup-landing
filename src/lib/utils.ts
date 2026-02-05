import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Download a resume file with a proper filename containing the user's name
 * @param resumeUrl - The URL of the resume file
 * @param firstName - User's first name
 * @param lastName - User's last name
 */
export async function downloadResume(
  resumeUrl: string,
  firstName: string,
  lastName: string
): Promise<void> {
  try {
    const response = await fetch(resumeUrl);
    const blob = await response.blob();
    
    // Create filename with user's first and last name
    const fileName = `${firstName}_${lastName}_resume.pdf`;
    
    // Create a temporary URL and trigger download
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to download resume:', error);
    throw error;
  }
}
