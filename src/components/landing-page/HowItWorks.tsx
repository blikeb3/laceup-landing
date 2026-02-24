import { UserPlus, Users, Briefcase } from "lucide-react";
import { AnimatedSection } from "./AnimatedSection";

export function HowItWorks() {
  const steps = [
    {
      number: "1",
      icon: UserPlus,
      title: "Sign Up & Build Your Profile",
      description: "Share your athletic background, skills, and career aspirations. It takes just 5 minutes.",
      color: "navy"
    },
    {
      number: "2",
      icon: Users,
      title: "Connect with Your Community",
      description: "Discover mentors, peers, and professionals who understand your journey and can support your growth.",
      color: "gold"
    },
    {
      number: "3",
      icon: Briefcase,
      title: "Unlock Your Next Opportunity",
      description: "Access curated internships, jobs, mentorships, and collaborations tailored to your strengths.",
      color: "navy"
    }
  ];

  return (
    <div className="py-20 bg-white" id="how-it-works">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatedSection>
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold mb-4 text-[#0A2849]">How LaceUP Works</h2>
            <p className="text-xl text-[#0A2849]/70 max-w-2xl mx-auto">
              Three simple steps to launch your professional career
            </p>
          </div>
        </AnimatedSection>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const bgColor = step.color === "navy" ? "bg-[#0A2849]" : "bg-[#E8B555]";
            
            return (
              <AnimatedSection key={index} delay={index * 100}>
                <div className="relative h-full group">
                  <div className="bg-white rounded-xl p-8 border-2 border-[#0A2849]/10 h-full transition-all hover:border-[#E8B555] hover:shadow-xl">
                    {/* Step Number */}
                    <div className={`${bgColor} w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg mb-6 group-hover:shadow-lg transition-shadow`}>
                      {step.number}
                    </div>
                    
                    {/* Icon */}
                    <div className="mb-4">
                      <Icon className="w-8 h-8 text-[#E8B555]" />
                    </div>
                    
                    {/* Title */}
                    <h3 className="text-xl font-bold mb-3 text-[#0A2849] group-hover:text-[#E8B555] transition-colors">
                      {step.title}
                    </h3>
                    
                    {/* Description */}
                    <p className="text-[#0A2849]/70 leading-relaxed">
                      {step.description}
                    </p>
                  </div>

                  {/* Horizontal connector */}
                  {index < steps.length - 1 && (
                    <div className="hidden md:flex absolute -right-6 top-1/2 transform -translate-y-1/2 z-20">
                      <div className="w-28 h-px bg-gradient-to-r from-[#0A2849]/30 to-[#E8B555]/30 rounded-full" />
                    </div>
                  )} 
                </div>
              </AnimatedSection>
            );
          })}
        </div>

        {/* Timeline visual for mobile */}
        <div className="md:hidden flex flex-col space-y-4">
          {steps.map((_, index) => (
            index < steps.length - 1 && (
              <div key={index} className="flex justify-center">
                <div className="w-px h-8 bg-gradient-to-b from-[#0A2849]/20 to-[#E8B555]/20 rounded-full" />
              </div>
            )
          ))}
        </div>
      </div>
    </div>
  );
}