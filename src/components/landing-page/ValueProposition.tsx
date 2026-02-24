import { Card } from "../ui/card";
import { Users, Target, Award, TrendingUp, Rocket, Network } from "lucide-react";
import { AnimatedSection } from "./AnimatedSection";

export function ValueProposition() {
  return (
    <div className="py-20 bg-white" id="why-we-exist">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatedSection>
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold mb-4 text-[#0A2849]">Why Choose LaceUP?</h2>
            <p className="text-xl text-[#0A2849]/70 max-w-3xl mx-auto">
              We bridge the gap between athletic excellence and professional success
            </p>
          </div>
        </AnimatedSection>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* For Athletes */}
          <AnimatedSection delay={100}>
            <Card className="p-8 border-2 border-[#0A2849]/20 hover:border-[#E8B555] transition-all duration-300 h-full hover:shadow-lg">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-14 h-14 bg-gradient-to-br from-[#E8B555]/20 to-[#F2C877]/20 rounded-xl flex items-center justify-center">
                  <Rocket className="w-7 h-7 text-[#E8B555]" />
                </div>
                <h3 className="text-2xl font-bold text-[#0A2849]">For Athletes</h3>
              </div>
              <p className="text-[#0A2849]/70 mb-6">
                Your athletic career doesn't end when you leave the field. Launch your professional journey with confidence.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <Award className="w-5 h-5 text-[#E8B555] mt-0.5 flex-shrink-0" />
                  <p className="text-[#0A2849]/80">
                    <span className="font-semibold">Build Your Professional Identity</span> — Showcase your discipline, leadership, and work ethic beyond sports.
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <Network className="w-5 h-5 text-[#E8B555] mt-0.5 flex-shrink-0" />
                  <p className="text-[#0A2849]/80">
                    <span className="font-semibold">Connect with Your People</span> — Meet alumni, mentors, and recruiters who get the athlete mindset.
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <Target className="w-5 h-5 text-[#E8B555] mt-0.5 flex-shrink-0" />
                  <p className="text-[#0A2849]/80">
                    <span className="font-semibold">Access Curated Opportunities</span> — Find roles designed for athletes, not buried on LinkedIn.
                  </p>
                </li>
              </ul>
            </Card>
          </AnimatedSection>

          {/* For Businesses */}
          <AnimatedSection delay={200}>
            <Card className="p-8 border-2 border-[#0A2849]/20 hover:border-[#0A2849] transition-all duration-300 h-full hover:shadow-lg">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-14 h-14 bg-[#0A2849]/10 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-7 h-7 text-[#0A2849]" />
                </div>
                <h3 className="text-2xl font-bold text-[#0A2849]">For Businesses & Recruiters</h3>
              </div>
              <p className="text-[#0A2849]/70 mb-6">
                Access high-performing talent before they're visible on traditional platforms.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-[#0A2849] mt-0.5 flex-shrink-0" />
                  <p className="text-[#0A2849]/80">
                    <span className="font-semibold">Tap Into Disciplined Talent</span> — Recruit athletes known for dedication, teamwork, and peak performance.
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <Rocket className="w-5 h-5 text-[#0A2849] mt-0.5 flex-shrink-0" />
                  <p className="text-[#0A2849]/80">
                    <span className="font-semibold">First-Mover Advantage</span> — Reach talented athletes before they commit to other companies.
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <Award className="w-5 h-5 text-[#0A2849] mt-0.5 flex-shrink-0" />
                  <p className="text-[#0A2849]/80">
                    <span className="font-semibold">Build Your Employer Brand</span> — Engage with a community of ambitious, driven professionals.
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