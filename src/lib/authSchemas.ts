/**
 * Centralized authentication validation schemas
 * Ensures consistent password requirements across sign-up and sign-in
 */

import { z } from "zod";

// Shared password validation schema with strong requirements
const passwordSchema = z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number");

// Sign-in validation schema
export const signInSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: passwordSchema, // Use same requirements as sign-up for consistency
});

// Sign-up validation schema
export const signUpSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: passwordSchema,
    confirmPassword: passwordSchema,
    firstName: z.string().min(1, "First name is required").max(50, "First name must not exceed 50 characters"),
    lastName: z.string().min(1, "Last name is required").max(50, "Last name must not exceed 50 characters"),
    phone: z.string().regex(/^\+?[\d\s\-()]+$/, "Invalid phone number format").optional().or(z.literal("")),
    university: z.string().min(2, "University name must be at least 2 characters").max(100, "University name must not exceed 100 characters"),
    sport: z.string().min(2, "Sport must be at least 2 characters").max(50, "Sport must not exceed 50 characters"),
    userType: z.enum(["athlete", "mentor", "employer"]),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
});
