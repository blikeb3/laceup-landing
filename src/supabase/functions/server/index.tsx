import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-65c3c4f7/health", (c) => {
  return c.json({ status: "ok" });
});

// Waitlist signup endpoint
app.post("/make-server-65c3c4f7/waitlist", async (c) => {
  try {
    const body = await c.req.json();
    const { name, email, role, sport, university } = body;

    // Validate required fields
    if (!name || !email || !role) {
      return c.json({ error: "Name, email, and role are required" }, 400);
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return c.json({ error: "Invalid email format" }, 400);
    }

    // Check if email already exists
    const existingUser = await kv.get(`waitlist:${email}`);
    if (existingUser) {
      return c.json({ error: "Email already registered" }, 409);
    }

    // Create waitlist entry
    const waitlistEntry = {
      name,
      email,
      role,
      sport: sport || null,
      university: university || null,
      timestamp: new Date().toISOString(),
    };

    // Store in KV
    await kv.set(`waitlist:${email}`, waitlistEntry);

    console.log(`New waitlist signup: ${email} as ${role}`);

    return c.json({ 
      success: true, 
      message: "Successfully added to waitlist" 
    }, 201);

  } catch (error) {
    console.error("Error processing waitlist signup:", error);
    return c.json({ 
      error: "Failed to process signup. Please try again." 
    }, 500);
  }
});

// Get all waitlist entries (for admin purposes)
app.get("/make-server-65c3c4f7/waitlist", async (c) => {
  try {
    const entries = await kv.getByPrefix("waitlist:");
    return c.json({ 
      count: entries.length,
      entries: entries.map(e => ({
        ...e,
        // Don't expose full email in list view for privacy
        email: e.email?.substring(0, 3) + "***@" + e.email?.split("@")[1]
      }))
    });
  } catch (error) {
    console.error("Error fetching waitlist entries:", error);
    return c.json({ error: "Failed to fetch entries" }, 500);
  }
});

Deno.serve(app.fetch);