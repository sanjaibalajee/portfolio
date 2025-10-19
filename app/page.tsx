import { Footer } from "@/components/footer"
import { ExperienceItem } from "@/components/experience-item"

export default function Home() {
  return (
    <div className="flex flex-col min-h-[calc(100vh-200px)]">
      <div className="flex-grow">
        <section>
          <h1 className="font-semibold text-3xl mb-8 tracking-tight text-neutral-900 dark:text-neutral-100">about</h1>

          <div className="space-y-8">
            <p className="leading-relaxed text-base text-neutral-800 dark:text-neutral-200">
              Always learning, always shipping. I build for fun, mostly doing stupid things that teach me something new. I mess with new tech, break things, fix them better, and chase whatever idea keeps me up at night. It&apos;s not always useful, but it&apos;s always worth building.
            </p>

            <div className="border-t border-neutral-300 dark:border-neutral-700 pt-8">
              <h2 className="font-semibold text-2xl mb-6 tracking-tight text-neutral-900 dark:text-neutral-100">experience</h2>

              <ExperienceItem
                company="Citi Bank"
                role="Technology Analyst"
                location="chennai"
                period="jul 2025 - present"
              />

              <ExperienceItem
                company="Fanpit"
                role="Founding Engineer"
                location="chennai"
                period="feb 2025 - jul 2025"
              >
                <p>
                  Built and shipped{' '}
                  <a
                    href="https://outworld.fanpit.live"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors"
                  >
                    Outworld by Fanpit
                  </a>
                  {' '}with over 25k visitors and 2k tickets sold. Developed the Fanpit app, the Check-in Manager, and the dashboard and registration portal for the Fanpit India Hackathon with more than 1.5k users.
                </p>
                <p>
                  Also built agent pipelines and outreach tools to streamline operations and engagement across the Fanpit platform.
                </p>
              </ExperienceItem>

              <ExperienceItem
                company="Carnegie Mellon University"
                role="Research Intern"
                location="pittsburgh, united states"
                period="jun 2024 - jul 2024"
              />

              <ExperienceItem
                company="Indian Institute of Science (IISc)"
                role="Research Intern"
                location="bengaluru, karnataka"
                period="jul 2023 - aug 2023"
              >
                <p>
                  Worked at the DREAM Lab, SERC, IISc, contributing to XFaaS. Automated function and workflow deployment across AWS and Azure, built benchmarking tools including a variant of Cornell&apos;s Death Star Benchmark, and developed complex UTM workflow applications. Published in the Proceedings of HiPC 2023.
                </p>
              </ExperienceItem>
            </div>

            <div className="border-t border-neutral-300 dark:border-neutral-700 pt-8">
              <h2 className="font-semibold text-2xl mb-6 tracking-tight text-neutral-900 dark:text-neutral-100">education</h2>

              <div className="mb-6">
                <div className="flex flex-col md:flex-row md:justify-between md:items-baseline mb-2 gap-1">
                  <h3 className="font-semibold text-base sm:text-lg tracking-tight text-neutral-900 dark:text-neutral-100">Sri Sivasubramaniya Nadar College of Engineering</h3>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">2021-2025</p>
                </div>
                <p className="text-sm sm:text-base text-neutral-700 dark:text-neutral-300">Bachelors in Computer Science and Engineering</p>
              </div>
            </div>

            <div className="border-t border-neutral-300 dark:border-neutral-700 pt-8">
              <h2 className="font-semibold text-2xl mb-4 tracking-tight text-neutral-900 dark:text-neutral-100">skills</h2>
              <p className="text-base text-neutral-800 dark:text-neutral-200 leading-relaxed">
                TypeScript; Go; Java; Python; C; SwiftUI
              </p>
            </div>

            <div className="border-t border-neutral-300 dark:border-neutral-700 pt-8">
              <h2 className="font-semibold text-2xl mb-4 tracking-tight text-neutral-900 dark:text-neutral-100">interests</h2>
              <p className="text-base text-neutral-800 dark:text-neutral-200 leading-relaxed">
                open source, research, ai, anime
              </p>
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </div>
  );
}
