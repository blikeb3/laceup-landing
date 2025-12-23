import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion";

export function FAQ() {
  const faqs = [
    {
      question: "What makes LaceUp different from LinkedIn?",
      answer: "LaceUp is built exclusively for the athlete community. Unlike LinkedIn where athletes can get lost in the noise, LaceUp highlights your athletic journey as a strength and connects you with people who understand and value the athlete mindset."
    },
    {
      question: "Is LaceUp only for current athletes?",
      answer: "No! LaceUp serves current athletes, alumni who've transitioned to professional careers, recruiters looking for athlete talent, and mentors who want to give back to the athlete community."
    },
    {
      question: "How much does LaceUp cost?",
      answer: "We're currently in our pilot phase building our waitlist. Early members will receive exclusive access and special benefits. Pricing details will be announced as we approach launch."
    },
    {
      question: "When will LaceUp launch?",
      answer: "We're competing in Harding University's Shark Tank on October 30th, 2025, and plan to launch our beta platform in early 2026. Join the waitlist to be among the first to access the platform and help shape its development."
    }
  ];

  return (
    <div className="py-20 bg-white" id="faq">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl mb-4 text-[#0A2849]">Frequently Asked Questions</h2>
          <p className="text-xl text-muted-foreground">
            Everything you need to know about LaceUp
          </p>
        </div>

        <Accordion type="single" collapsible className="space-y-4">
          {faqs.map((faq, index) => (
            <AccordionItem 
              key={index} 
              value={`item-${index}`}
              className="bg-gradient-to-br from-[#f8fafc] to-white border-2 border-[#0A2849]/10 rounded-xl px-6 hover:border-[#E8B555] transition-all duration-300 shadow-sm hover:shadow-md"
            >
              <AccordionTrigger className="text-left text-[#0A2849] hover:text-[#E8B555] hover:no-underline py-5">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground pb-5 leading-relaxed">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
}
