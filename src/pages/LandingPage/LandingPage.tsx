import { Header } from "../../components/landing-page/Header";
import { Hero } from "../../components/landing-page/Hero";
import { ValueProposition } from "../../components/landing-page/ValueProposition";
import { HowItWorks } from "../../components/landing-page/HowItWorks";
import { Benefits } from "../../components/landing-page/Benefits";
import { CTABanner } from "../../components/landing-page/CTABanner";
import { Footer } from "../../components/landing-page/Footer";
import { SEOHead } from "../../components/landing-page/SEOHead";


export default function LandingPage() {
    return (
        <div className="min-h-screen">
            <SEOHead />
            <Header />
            <Hero />
            <ValueProposition />
            <HowItWorks />
            <Benefits />
            <CTABanner />
            <Footer />
        </div>
    );
}