import { Card } from "./ui/card";
import { Award, Calendar, Trophy } from "lucide-react";
import { AnimatedSection } from "./AnimatedSection";
import waldronImage from 'figma:asset/a9d21567b6128f03ce6f53f85430a841b0b83a35.png';

export function Partnership() {
  return (
    <div className="py-20 bg-gradient-to-br from-[#f8fafc] to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatedSection>
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-[#E8B555]/20 px-6 py-3 rounded-full mb-6 shadow-sm">
              <Trophy className="w-6 h-6 text-[#E8B555]" />
              <span className="text-[#0A2849]">Shark Tank Finalist</span>
            </div>
            <h2 className="text-4xl lg:text-5xl mb-6 text-[#0A2849]">
              Validated by Leading Institutions
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Recognized by entrepreneurship leaders who believe in transforming athlete careers
            </p>
          </div>
        </AnimatedSection>

        <AnimatedSection delay={100}>
          <div className="grid md:grid-cols-2 gap-8 items-center max-w-5xl mx-auto">
            <Card className="p-8 border-2 border-[#0A2849]/10 hover:border-[#E8B555] transition-all">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-14 h-14 bg-[#E8B555]/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Award className="w-7 h-7 text-[#E8B555]" />
                </div>
                <div>
                  <h3 className="text-xl text-[#0A2849] mb-2">
                    Waldron Center for Entrepreneurship
                  </h3>
                  <p className="text-[#E8B555]">Harding University</p>
                </div>
              </div>
              
              <p className="text-muted-foreground mb-6">
                Selected as a finalist for Harding University's prestigious Shark Tank competition, hosted by the Waldron Center for Entrepreneurship and Family Business.
              </p>

              <div className="flex items-center gap-3 bg-[#0A2849]/5 rounded-lg p-4">
                <Calendar className="w-5 h-5 text-[#E8B555]" />
                <div>
                  <p className="text-sm text-[#0A2849]">Shark Tank Competition</p>
                  <p className="text-sm text-muted-foreground">October 30, 2025</p>
                </div>
              </div>
            </Card>

            <div className="relative">
              <div className="aspect-[4/3] rounded-2xl overflow-hidden border-4 border-[#E8B555]/20 shadow-xl">
                <img 
                  src={waldronImage}
                  alt="Waldron Center for Entrepreneurship and Family Business - Harding University"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-4 -right-4 bg-[#E8B555] text-[#0A2849] px-6 py-3 rounded-xl shadow-lg">
                <p className="text-sm">🏆 Shark Tank Finalist</p>
              </div>
            </div>
          </div>
        </AnimatedSection>

        <AnimatedSection delay={200}>
          <div className="mt-16 text-center">
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              The Waldron Center's recognition validates our mission to revolutionize athlete career transitions. We're honored to represent Harding University and empower the next generation of athlete leaders.
            </p>
          </div>
        </AnimatedSection>
      </div>
    </div>
  );
}