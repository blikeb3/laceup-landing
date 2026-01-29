import { Heart, Eye, Clock, Sparkles, Handshake, Zap } from "lucide-react";
import { AnimatedSection } from "./AnimatedSection";

export function Benefits() {
  const benefits = [
    {
      icon: Heart,
      title: "Mentorship That Matters",
      description: "Get guidance from athletes who've walked your path.",
      color: "bg-[#E8B555]/20 text-[#E8B555]"
    },
    {
      icon: Eye,
      title: "Equal Visibility",
      description: "Stand out based on your potential, not your NIL value.",
      color: "bg-[#0A2849]/10 text-[#0A2849]"
    },
    {
      icon: Clock,
      title: "Time-Efficient Networking",
      description: "Connect meaningfully in just minutes a day.",
      color: "bg-[#E8B555]/20 text-[#E8B555]"
    },
    {
      icon: Sparkles,
      title: "Career Confidence",
      description: "Navigate your transition with clarity and purpose.",
      color: "bg-[#0A2849]/10 text-[#0A2849]"
    },
    {
      icon: Handshake,
      title: "Real Connections",
      description: "Partner with talent that shares your values.",
      color: "bg-[#E8B555]/20 text-[#E8B555]"
    },
    {
      icon: Zap,
      title: "Fast-Track Opportunities",
      description: "Access exclusive roles before public posting.",
      color: "bg-[#0A2849]/10 text-[#0A2849]"
    }
  ];

  return (
    <div className="py-20 bg-gradient-to-b from-white to-slate-50" id="benefits">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatedSection>
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold mb-4 text-[#0A2849]">The LaceUP Advantage</h2>
            <p className="text-xl text-[#0A2849]/70 max-w-2xl mx-auto">
              Everything you need to succeed in your next chapter
            </p>
          </div>
        </AnimatedSection>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <AnimatedSection key={index} delay={index * 50}>
                <div className="group relative">
                  {/* Hover glow effect */}
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-[#E8B555]/20 to-[#0A2849]/20 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  
                  <div className="relative flex items-start gap-4 bg-white rounded-xl p-6 hover:shadow-lg transition-all duration-300 border border-[#0A2849]/10 h-full">
                    <div className={`w-12 h-12 ${benefit.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="mb-2 font-bold text-[#0A2849] group-hover:text-[#E8B555] transition-colors">{benefit.title}</h4>
                      <p className="text-sm text-[#0A2849]/70 leading-relaxed">{benefit.description}</p>
                    </div>
                  </div>
                </div>
              </AnimatedSection>
            );
          })}
        </div>
      </div>
    </div>
  );
}