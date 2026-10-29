export type InlineContent = string | { label: string; href: string }

export type Experience = {
  company: string
  role: string
  location: string
  period: string
  paragraphs?: InlineContent[][]
}

const introParts = [
  "hi, i'm sanjai. i build ",
  { text: 'backends', tone: 'blue' },
  ', ',
  { text: 'ios apps', tone: 'amber' },
  ' and ',
  { text: 'agents', tone: 'green' },
  '. i love building, so most of my evenings go into it.',
] as const

export const profile = {
  name: 'sanjai balajee',
  intro: introParts.map(part => typeof part === 'string' ? part : part.text).join(''),
  introParts,
}

export const selectedWork = [
  {
    title: 'outworld',
    description: 'event bookings, payments and tickets, and the migrations behind them.',
    links: [{ label: 'the story', href: '/blog/building-outworld-from-0-to-1' }, { label: 'visit', href: 'https://outworld.fanpit.live' }],
  },
  {
    title: 'fanpit live',
    description: 'the native swiftui app for finding events, booking tickets and running the door.',
    links: [{ label: 'app store', href: 'https://apps.apple.com/in/app/fanpit-live/id6753718568' }],
  },
  {
    title: 'xfaas · dream lab, iisc',
    description: 'research work on deploying and benchmarking serverless workflows across aws and azure.',
    links: [{ label: 'code', href: 'https://github.com/dream-lab/XFaaS' }],
  },
]

export const currently = {
  updated: '2026-10-26',
  date: 'oct 26, 2026',
  text: 'working on fanpit live in swiftui and writing down what changed underneath outworld.',
}

export const experiences: Experience[] = [
  { company: 'Citi Bank', role: 'Technology Analyst', location: 'chennai', period: 'jul 2025 - present' },
  {
    company: 'Fanpit', role: 'Founding Engineer', location: 'chennai', period: 'feb 2025 - jul 2025',
    paragraphs: [
      ['Built and shipped ', { label: 'Outworld by Fanpit', href: 'https://outworld.fanpit.live' }, ' with over 25k visitors and 2k tickets sold. Developed the Fanpit app, the Check-in Manager, and the dashboard and registration portal for the Fanpit India Hackathon with more than 1.5k users.'],
      ['Also built agent pipelines and outreach tools to streamline operations and engagement across the Fanpit platform.'],
    ],
  },
  { company: 'Carnegie Mellon University', role: 'Research Intern', location: 'pittsburgh, united states', period: 'jun 2024 - jul 2024' },
  {
    company: 'Indian Institute of Science (IISc)', role: 'Research Intern', location: 'bengaluru, karnataka', period: 'jul 2023 - aug 2023',
    paragraphs: [["Worked at the DREAM Lab, SERC, IISc, contributing to XFaaS. Automated function and workflow deployment across AWS and Azure, built benchmarking tools including a variant of Cornell's Death Star Benchmark, and developed complex UTM workflow applications. Published in the Proceedings of HiPC 2023."]],
  },
]

export const education = {
  school: 'Sri Sivasubramaniya Nadar College of Engineering',
  period: '2021-2025',
  degree: 'Bachelors in Computer Science and Engineering',
}

export const skills = ['TypeScript', 'Go', 'Java', 'Python', 'C', 'SwiftUI']
export const interests = ['open source', 'research', 'ai', 'anime']
