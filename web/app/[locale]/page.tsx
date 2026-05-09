import { setRequestLocale } from "next-intl/server";

import { Faq } from "@/components/landing/Faq";
import { Features } from "@/components/landing/Features";
import { Footer } from "@/components/landing/Footer";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Navbar } from "@/components/landing/Navbar";
import { UseCases } from "@/components/landing/UseCases";

import { ConverterApp } from "./ConverterApp";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <section
          id="convert"
          className="relative px-4 py-16 md:py-24 scroll-mt-20"
        >
          <div className="mx-auto w-full max-w-3xl">
            <ConverterApp />
          </div>
        </section>
        <Features />
        <HowItWorks />
        <UseCases />
        <Faq />
      </main>
      <Footer />
    </>
  );
}
