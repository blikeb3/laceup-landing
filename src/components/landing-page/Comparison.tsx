import { Card } from "../ui/card";
import { X, Lightbulb } from "lucide-react";

export function Comparison() {
  const platforms = [
    {
      name: "LinkedIn",
      issue: "Too broad, athletes get lost.",
    },
    {
      name: "Handshake",
      issue: "School-focused, not long-term.",
    },
    {
      name: "Athlete Network",
      issue: "Alumni-only, not full transition support.",
    }
  ];

  return (
    <div className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl mb-4">Why LaceUp is Different</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Unlike traditional platforms...
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {platforms.map((platform, index) => (
            <Card key={index} className="p-6 bg-gray-50 border-gray-200">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <X className="w-4 h-4 text-red-600" />
                </div>
                <div>
                  <h4 className="mb-1">{platform.name}</h4>
                  <p className="text-sm text-muted-foreground">{platform.issue}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Card className="p-8 bg-gradient-to-br from-[#0A2849] to-[#154170] border-2 border-[#E8B555] text-white">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-[#E8B555]/20 backdrop-blur rounded-lg flex items-center justify-center flex-shrink-0">
              <Lightbulb className="w-6 h-6 text-[#E8B555]" />
            </div>
            <div>
              <h3 className="text-2xl mb-2 text-[#E8B555]">LaceUp</h3>
              <p className="text-lg text-white/90">
                The first holistic networking hub for athletes, alumni, and businesses.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}