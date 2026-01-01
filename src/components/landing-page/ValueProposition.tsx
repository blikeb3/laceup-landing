import { Card } from "../ui/card";
import { Users, Target, Award, TrendingUp } from "lucide-react";
import { AnimatedSection } from "./AnimatedSection";

export function ValueProposition() {
  return (
    <div className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatedSection>
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl mb-4">Why We Exist</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Bridging the gap between athletic excellence and professional success
            </p>
          </div>
        </AnimatedSection>

        <div className="grid md:grid-cols-2 gap-12">
          {/* For Athletes */}
          <AnimatedSection delay={100}>
            <Card className="p-8 border-2 hover:border-[#E8B555] transition-colors h-full">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-[#E8B555]/20 rounded-lg flex items-center justify-center">
                  <Award className="w-6 h-6 text-[#E8B555]" />
                </div>
                <h3 className="text-2xl text-[#0A2849]">For Athletes</h3>
              </div>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 bg-[#E8B555] rounded-full mt-2.5 flex-shrink-0"></div>
                  <p className="text-muted-foreground">
                    Build your professional identity beyond sports.
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 bg-[#E8B555] rounded-full mt-2.5 flex-shrink-0"></div>
                  <p className="text-muted-foreground">
                    Connect with alumni, mentors, and recruiters who understand the athlete mindset.
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 bg-[#E8B555] rounded-full mt-2.5 flex-shrink-0"></div>
                  <p className="text-muted-foreground">
                    Access opportunities curated for athletes, not buried on generic platforms.
                  </p>
                </li>
              </ul>
            </Card>
          </AnimatedSection>

          {/* For Businesses */}
          <AnimatedSection delay={200}>
            <Card className="p-8 border-2 hover:border-[#0A2849] transition-colors h-full">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-[#0A2849]/10 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-[#0A2849]" />
                </div>
                <h3 className="text-2xl text-[#0A2849]">For Businesses & Recruiters</h3>
              </div>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 bg-[#0A2849] rounded-full mt-2.5 flex-shrink-0"></div>
                  <p className="text-muted-foreground">
                    Tap into disciplined, high-performing talent.
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 bg-[#0A2849] rounded-full mt-2.5 flex-shrink-0"></div>
                  <p className="text-muted-foreground">
                    Reach athletes before they're visible on LinkedIn.
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 bg-[#0A2849] rounded-full mt-2.5 flex-shrink-0"></div>
                  <p className="text-muted-foreground">
                    Build brand credibility through athlete engagement.
                  </p>
                </li>
              </ul>
            </Card>
          </AnimatedSection>
        </div>
      </div>
    </div>
  );
}