import { Card } from "../ui/card";
import { Quote } from "lucide-react";

export function Testimonials() {
  const testimonials = [
    {
      quote: "More resources dedicated to balancing the transition, specifically looking at identity, purpose, and lifestyle. For me personally, that's what worries me the most.",
      sport: "Women's Soccer",
      year: "Graduate/5th Year"
    },
    {
      quote: "Finding a place to seek guidance from other athletes that have already made the transition into the workforce.",
      sport: "Baseball",
      year: "Sophomore"
    },
    {
      quote: "More recognition from companies sooner so I'm not stuck in a dead period of unemployment after school.",
      sport: "Baseball",
      year: "Senior"
    }
  ];

  const businessTestimonials = [
    {
      quote: "Generally, athletes are among the hardest working, performance driven, most coachable prospects available.",
      name: "Ken Bissell",
      role: "Senior Director, Legacy Planning",
      company: "University of Central Arkansas"
    },
    {
      quote: "Those with athletic backgrounds tend to have more of the basic necessities required to be successful.",
      name: "Jason Luce",
      role: "Managing Partner",
      company: "Northwestern Mutual"
    },
    {
      quote: "Athletes I've hired standout in their understanding of the preparation and extra work that is necessary. Their experience working within a team. Their ability to accept failure or defeats as a challenge and make adjustments in order to achieve a higher level of performance.",
      name: "Brad Jay",
      role: "Executive Partner",
      company: "Weaver"
    }
  ];

  return (
    <div className="py-24 bg-gradient-to-br from-[#f8fafc] to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Athletes Section */}
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl mb-4 text-[#0A2849]">What Athletes Are Saying</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Real feedback from student-athletes on what they need most
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-24">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="p-8 border-2 border-[#0A2849]/10 hover:border-[#E8B555] transition-all duration-300 hover:shadow-lg bg-white">
              <Quote className="w-10 h-10 text-[#E8B555] mb-6" />
              <p className="text-muted-foreground mb-6 italic leading-relaxed text-lg">
                "{testimonial.quote}"
              </p>
              <div className="border-t border-[#0A2849]/10 pt-4">
                <p className="text-[#0A2849]">{testimonial.sport}</p>
                <p className="text-sm text-muted-foreground">{testimonial.year}</p>
              </div>
            </Card>
          ))}
        </div>

        {/* Business Leaders Section */}
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl mb-4 text-[#0A2849]">What Business Leaders Value</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Why top companies are eager to hire athlete talent
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {businessTestimonials.map((testimonial, index) => (
            <Card key={index} className="p-8 border-2 border-[#0A2849]/10 hover:border-[#0A2849]/30 transition-all duration-300 hover:shadow-lg bg-white">
              <Quote className="w-10 h-10 text-[#0A2849] mb-6" />
              <p className="text-muted-foreground mb-6 italic leading-relaxed">
                "{testimonial.quote}"
              </p>
              <div className="border-t border-[#0A2849]/10 pt-4">
                <p className="text-[#0A2849]">{testimonial.name}</p>
                <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                <p className="text-sm text-[#E8B555]">{testimonial.company}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
