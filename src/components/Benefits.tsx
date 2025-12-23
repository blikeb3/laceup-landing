import { Heart, Eye, Clock, Sparkles, Handshake } from "lucide-react";
import { AnimatedSection } from "./AnimatedSection";

export function Benefits() {
  const benefits = [
    {
      icon: Heart,
      title: "Mentorship that matters",
      description: "Athletes helping athletes.",
      color: "bg-[#E8B555]/20 text-[#E8B555]"
    },
    {
      icon: Eye,
      title: "Equal visibility",
      description: "Not just for NIL stars.",
      color: "bg-[#0A2849]/10 text-[#0A2849]"
    },
    {
      icon: Clock,
      title: "Time-efficient networking",
      description: "5 minutes a day.",
      color: "bg-[#E8B555]/20 text-[#E8B555]"
    },
    {
      icon: Sparkles,
      title: "Career confidence",
      description: "Transition with purpose.",
      color: "bg-[#0A2849]/10 text-[#0A2849]"
    },
    {
      icon: Handshake,
      title: "Business credibility",
      description: "Partner with proven talent.",
      color: "bg-[#E8B555]/20 text-[#E8B555]"
    }
  ];

  return (
    <div className="py-20 bg-white" id="benefits">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatedSection>
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl mb-4 text-[#0A2849]">The LaceUp Advantage</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Built for athletes, by athletes
            </p>
          </div>
        </AnimatedSection>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <AnimatedSection key={index} delay={index * 50}>
                <div className="flex items-start gap-4 bg-[#f8fafc] rounded-xl p-6 hover:shadow-lg transition-shadow border border-[#0A2849]/10 h-full">
                  <div className={`w-12 h-12 ${benefit.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="mb-1 text-[#0A2849]">{benefit.title}</h4>
                    <p className="text-sm text-muted-foreground">{benefit.description}</p>
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