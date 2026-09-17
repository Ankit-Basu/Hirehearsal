import type { Persona, Track } from '@/lib/types';

/** One-tap interview packs for common placement scenarios. */
export interface InterviewPack {
  id: string;
  name: string;
  blurb: string;
  track: Track;
  persona: Persona;
  questionCount: number;
  role?: string;
  topic?: string;
}

export const PACKS: InterviewPack[] = [
  {
    id: 'service-company',
    name: 'Service company tech round',
    blurb: 'The classic fundamentals sweep: DBMS, OOP and operating systems.',
    track: 'technical',
    persona: 'panelist',
    questionCount: 5,
    role: 'Software Engineer',
    topic: 'DBMS, OOP and Operating Systems',
  },
  {
    id: 'product-sde',
    name: 'Product company SDE loop',
    blurb: 'Algorithms and system design, with a bar raiser who pushes back.',
    track: 'mixed',
    persona: 'bar_raiser',
    questionCount: 7,
    role: 'SDE-1',
    topic: 'Data Structures, Algorithms and System Design',
  },
  {
    id: 'full-stack',
    name: 'Full-stack startup',
    blurb: 'JavaScript, React and databases, the way small teams interview.',
    track: 'technical',
    persona: 'panelist',
    questionCount: 5,
    role: 'Full-stack Developer',
    topic: 'JavaScript, React and databases',
  },
  {
    id: 'java-backend',
    name: 'Java backend intern',
    blurb: 'Java, Spring Boot and SQL fundamentals at intern depth.',
    track: 'technical',
    persona: 'mentor',
    questionCount: 5,
    role: 'Backend Developer Intern',
    topic: 'Java, Spring Boot and SQL',
  },
  {
    id: 'hr-warmup',
    name: 'HR round warm-up',
    blurb: 'Tell me about yourself, strengths, failures and why this role.',
    track: 'hr',
    persona: 'mentor',
    questionCount: 4,
    role: 'Software Engineer',
  },
  {
    id: 'project-defense',
    name: 'Project defence',
    blurb: 'Your resume project, grilled on architecture and trade-offs.',
    track: 'project',
    persona: 'bar_raiser',
    questionCount: 5,
  },
];
