import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Card } from "./ui/card";
import { CheckCircle, Loader2 } from "lucide-react";
import { toast } from "sonner@2.0.3";

// Replace this with your Google Apps Script Web App URL
const GOOGLE_SHEET_URL = "YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL";

export function WaitlistForm() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "",
    sport: "",
    university: ""
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Send to Google Sheets
      const response = await fetch(GOOGLE_SHEET_URL, {
        method: 'POST',
        mode: 'no-cors', // Required for Google Apps Script
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          timestamp: new Date().toISOString()
        }),
      });

      // With no-cors mode, we can't read the response, so we assume success
      setSubmitted(true);
      toast.success("Welcome to LaceUp!", {
        description: "You're on the waitlist. We'll reach out soon with exclusive early access.",
      });
      
      // Reset form after showing success message
      setTimeout(() => {
        setFormData({ name: "", email: "", role: "", sport: "", university: "" });
        setSubmitted(false);
      }, 5000);

    } catch (error) {
      console.error("Waitlist submission error:", error);
      toast.error("Oops! Something went wrong", {
        description: "Please try again or email us at hello@laceupnetwork.com",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="waitlist" className="py-24 bg-gradient-to-br from-[#0A2849] via-[#154170] to-[#0A2849] relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#E8B555] rounded-full blur-3xl opacity-5"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#E8B555] rounded-full blur-3xl opacity-5"></div>
      
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-12 text-white">
          <h2 className="text-4xl lg:text-5xl mb-4">Join the Waitlist</h2>
          <p className="text-xl text-[#E8B555]/90 max-w-2xl mx-auto">
            Be among the first athletes and businesses to transform how talent connects with opportunity.
          </p>
        </div>

        <Card className="p-8 lg:p-10 shadow-2xl border-2 border-[#E8B555]/30 bg-white/98 backdrop-blur-sm">
          {submitted ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-[#E8B555]/10 rounded-full flex items-center justify-center mx-auto mb-6 ring-4 ring-[#E8B555]/20">
                <CheckCircle className="w-10 h-10 text-[#E8B555]" />
              </div>
              <h3 className="text-3xl mb-3 text-[#0A2849]">You're In!</h3>
              <p className="text-lg text-muted-foreground max-w-md mx-auto">
                Welcome to the LaceUp community. Check your email for next steps and exclusive updates.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="name" className="text-[#0A2849]">Full Name *</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  disabled={loading}
                  className="mt-2 border-gray-300 focus:border-[#E8B555] focus:ring-[#E8B555]"
                />
              </div>

              <div>
                <Label htmlFor="email" className="text-[#0A2849]">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  disabled={loading}
                  className="mt-2 border-gray-300 focus:border-[#E8B555] focus:ring-[#E8B555]"
                />
              </div>

              <div>
                <Label htmlFor="role" className="text-[#0A2849]">I am a... *</Label>
                <Select 
                  value={formData.role} 
                  onValueChange={(value) => setFormData({ ...formData, role: value })}
                  disabled={loading}
                  required
                >
                  <SelectTrigger className="mt-2 border-gray-300 focus:border-[#E8B555] focus:ring-[#E8B555]">
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="athlete">Current Student-Athlete</SelectItem>
                    <SelectItem value="alumni">Former Athlete / Alumni</SelectItem>
                    <SelectItem value="recruiter">Recruiter / Talent Acquisition</SelectItem>
                    <SelectItem value="business">Business Leader / Employer</SelectItem>
                    <SelectItem value="mentor">Mentor / Career Advisor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(formData.role === "athlete" || formData.role === "alumni") && (
                <>
                  <div>
                    <Label htmlFor="sport" className="text-[#0A2849]">Sport</Label>
                    <Input
                      id="sport"
                      type="text"
                      placeholder="e.g., Basketball, Soccer, Track & Field"
                      value={formData.sport}
                      onChange={(e) => setFormData({ ...formData, sport: e.target.value })}
                      disabled={loading}
                      className="mt-2 border-gray-300 focus:border-[#E8B555] focus:ring-[#E8B555]"
                    />
                  </div>

                  <div>
                    <Label htmlFor="university" className="text-[#0A2849]">University / College</Label>
                    <Input
                      id="university"
                      type="text"
                      placeholder="e.g., Harding University"
                      value={formData.university}
                      onChange={(e) => setFormData({ ...formData, university: e.target.value })}
                      disabled={loading}
                      className="mt-2 border-gray-300 focus:border-[#E8B555] focus:ring-[#E8B555]"
                    />
                  </div>
                </>
              )}

              <Button 
                type="submit" 
                size="lg" 
                disabled={loading || !formData.role}
                className="w-full bg-[#E8B555] text-[#0A2849] hover:bg-[#E8B555]/90 disabled:opacity-50 text-lg py-6 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Secure My Spot"
                )}
              </Button>

              <p className="text-center text-sm text-muted-foreground mt-4">
                By joining, you agree to receive updates about LaceUp. Unsubscribe anytime.
              </p>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
