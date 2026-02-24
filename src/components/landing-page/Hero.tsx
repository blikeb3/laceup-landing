import { useNavigate } from "react-router-dom";
import { Button } from "../ui/button";
import { ArrowRight, Zap, Shield, Users } from "lucide-react";


export function Hero() {
  const navigate = useNavigate();

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50">
      {/* Decorative elements */}
      <div className="absolute top-20 right-10 w-72 h-72 bg-[#E8B555]/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-20 left-10 w-96 h-96 bg-[#0A2849]/5 rounded-full blur-3xl"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            {/* Trust badge removed for a cleaner hero design */}

            {/* Main Headline */}
            <div className="space-y-4">
              <h1 className="text-5xl lg:text-6xl font-bold text-[#0A2849] leading-tight">
                Your Next Chapter <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#E8B555] to-[#F2C877]">Starts Here</span>
              </h1>
              <p className="text-xl text-[#0A2849]/70 leading-relaxed max-w-xl">
                Transform your athletic excellence into career success. Connect with mentors, employers, and peers who understand the athlete mindset.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-6">
              <Button
                size="lg"
                className="bg-gradient-to-r from-[#E8B555] to-[#F2C877] text-[#0A2849] hover:from-[#F2C877] hover:to-[#FCDBA8] font-bold text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center justify-center gap-2"
                onClick={() => navigate('/auth?tab=signup')}
              >
                Get Started Free
                <ArrowRight className="w-5 h-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-2 border-[#0A2849] text-[#0A2849] hover:bg-[#0A2849]/5 font-semibold text-lg px-8 py-6"
                onClick={() => scrollToSection('why-we-exist')}
              >
                Learn More
              </Button>
            </div>

            
          </div>

          {/* Right Visual - Hero Illustration */}
          <div className="relative hidden lg:flex items-center justify-center">
            <div className="relative w-full h-96">
              {/* Card stack effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#0A2849]/20 to-[#E8B555]/20 rounded-2xl transform -rotate-6 blur-xl"></div>
              <div className="absolute inset-0 bg-white rounded-2xl shadow-2xl transform rotate-3 border border-[#0A2849]/10"></div>
              
              {/* Hero Card Content */}
              <div className="absolute inset-0 bg-white rounded-2xl shadow-2xl p-8 flex flex-col justify-between overflow-hidden border border-[#0A2849]/10">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#E8B555] to-[#F2C877] rounded-full"></div>
                    <div>
                      <p className="font-bold text-[#0A2849]">Todd Lacey</p>
                      <p className="text-sm text-[#0A2849]/60">Former College Athlete/Mentor</p>
                    </div>
                  </div>
                  <p className="text-[#0A2849]/80 italic">"I'm very excited about the LaceUp platform and watching it take off from here..."</p>
                </div>
                
                <div className="space-y-3">
                  <div className="h-2 bg-[#E8B555]/20 rounded-full overflow-hidden">
                    <div className="h-full w-3/4 bg-gradient-to-r from-[#E8B555] to-[#F2C877]"></div>
                  </div>
                  <div className="flex justify-between text-xs text-[#0A2849]/60">
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}