import { UserPlus, Users, Briefcase } from "lucide-react";
import { AnimatedSection } from "./AnimatedSection";

export function HowItWorks() {
  const steps = [
    {
      number: "1",
      icon: UserPlus,
      title: "Create Your Profile",
      description: "Highlight your athletic journey and professional skills.",
      color: "navy"
    },
    {
      number: "2",
      icon: Users,
      title: "Make Real Connections",
      description: "Engage with alumni, advisors, and business leaders who want to invest in athletes.",
      color: "gold"
    },
    {
      number: "3",
      icon: Briefcase,
      title: "Unlock Opportunities",
      description: "Internships, jobs, mentorships, and collaborations tailored to your strengths.",
      color: "navy"
    }
  ];

  return (
    <div className="py-20 bg-[#f8fafc]" id="how-it-works">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl mb-4 text-[#0A2849]">How LaceUp Works</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Three simple steps to start your professional journey
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const bgColor = step.color === "navy" ? "bg-[#0A2849]" : "bg-[#E8B555]";
            const borderColor = step.color === "navy" ? "border-[#0A2849]/20" : "border-[#E8B555]/30";
            const textColor = step.color === "navy" ? "text-[#0A2849]" : "text-[#E8B555]";
            
            return (
              <div key={index} className="relative">
                <div className={`bg-white rounded-xl p-8 border-2 ${borderColor} h-full transition-all hover:shadow-lg`}>
                  <div className={`w-16 h-16 ${bgColor} rounded-xl flex items-center justify-center mb-6 text-white`}>
                    <Icon className="w-8 h-8" />
                  </div>
                  <div className={`absolute top-4 right-4 text-6xl opacity-20 ${textColor}`}>
                    {step.number}
                  </div>
                  <h3 className="text-xl mb-3 text-[#0A2849]">
                    {step.number}️⃣ {step.title}
                  </h3>
                  <p className="text-muted-foreground">
                    {step.description}
                  </p>
                </div>
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                    <div className="w-8 h-0.5 bg-gradient-to-r from-[#0A2849] to-[#E8B555]"></div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}