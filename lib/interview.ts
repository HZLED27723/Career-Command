import type { InterviewEntry, QuestionCategory } from "./types";

/**
 * STAR structure for the question bank: the four fields, the prompt shown
 * above each, and the counting rules the Interview page and Dashboard share.
 */

export const STAR_FIELDS = ["situation", "task", "action", "result"] as const;
export type StarField = (typeof STAR_FIELDS)[number];

export const STAR_LABELS: Record<StarField, string> = {
  situation: "Situation",
  task: "Task",
  action: "Action",
  result: "Result",
};

export type StarPrompts = Record<StarField, string>;

/** Prompts for a custom question, by category. */
const CATEGORY_DEFAULTS: Record<QuestionCategory, StarPrompts> = {
  behavioral: {
    situation: "Where were you, who was involved and what was happening?",
    task: "What were you personally responsible for? What outcome did you need?",
    action: "What did you do, in what order, and why?",
    result: "What changed? Which observation, feedback or lesson supports that?",
  },
  technical: {
    situation: "Which part, system or problem does this question touch?",
    task: "Which concept or constraint are you being asked to work with?",
    action: "What method or calculation would you use, step by step?",
    result: "Which decision or verification would that lead to?",
  },
  situational: {
    situation: "What do you know about the situation, and what is missing?",
    task: "What would you be responsible for resolving within your role?",
    action: "What would you do, in what order, and who would you involve?",
    result: "What outcome would you seek, and how would you check you got it?",
  },
};

interface StarterQuestion {
  key: string;
  category: QuestionCategory;
  question: string;
  prompts: StarPrompts;
}

/** The 11 starter questions and their tailored prompts. */
export const STARTER_QUESTIONS: StarterQuestion[] = [
  {
    key: "behavioral-01",
    category: "behavioral",
    question: "Tell me about yourself.",
    prompts: {
      situation: "Which part of your background connects to this role?",
      task: "What kind of work or responsibility were you looking for?",
      action: "Which project, job or experience did you pursue?",
      result: "What did it prepare you to contribute here?",
    },
  },
  {
    key: "behavioral-02",
    category: "behavioral",
    question: "Describe a time you worked in a team under pressure.",
    prompts: {
      situation: "What put the team under pressure?",
      task: "What were you personally responsible for delivering?",
      action: "Which steps did you take, and how did you coordinate?",
      result: "What happened to the deadline, quality or team?",
    },
  },
  {
    key: "behavioral-03",
    category: "behavioral",
    question:
      "Tell me about a conflict with a teammate and how you resolved it.",
    prompts: {
      situation: "Where did your approaches differ?",
      task: "What did the team need to agree on?",
      action: "How did you hear their view and work towards a decision?",
      result: "What agreement or change followed?",
    },
  },
  {
    key: "behavioral-04",
    category: "behavioral",
    question: "What's a weakness you're actively working on?",
    prompts: {
      situation: "When did you notice the weakness affecting your work?",
      task: "What specific improvement did you set out to make?",
      action: "What habit, practice or feedback did you put in place?",
      result: "What evidence shows progress, and what still needs work?",
    },
  },
  {
    key: "technical-05",
    category: "technical",
    question: "Walk me through your favourite engineering project.",
    prompts: {
      situation: "What did you build and for whom?",
      task: "Which requirement or constraint did you own?",
      action: "Which design choices and iterations did you make?",
      result: "How did testing compare with the requirement?",
    },
  },
  {
    key: "technical-06",
    category: "technical",
    question: "Explain the difference between stress and strain.",
    prompts: {
      situation: "Pick a simple loaded part or test specimen.",
      task: "What two quantities are you trying to distinguish?",
      action: "Give the definitions and units, then apply them to that part.",
      result: "What does each quantity tell you about the part?",
    },
  },
  {
    key: "technical-07",
    category: "technical",
    question: "What CAD and simulation tools have you used, and for what?",
    prompts: {
      situation: "Which component or problem needed modelling?",
      task: "What did the model need to establish?",
      action: "Which tool, setup and checks did you use, and why?",
      result: "Which design decision or validation came out of it?",
    },
  },
  {
    key: "technical-08",
    category: "technical",
    question: "How would you design a part for manufacturability?",
    prompts: {
      situation: "Choose a part, production volume and candidate process.",
      task: "Which function, cost or tolerance must it meet?",
      action: "How would you simplify the geometry and check it with the maker?",
      result: "How would you confirm the revised design can be made consistently?",
    },
  },
  {
    key: "situational-09",
    category: "situational",
    question: "A customer is upset about a delayed order — what do you do?",
    prompts: {
      situation: "What do you know about the order and the customer's concern?",
      task: "What can you resolve or clarify within your role?",
      action:
        "How would you acknowledge the delay, check the facts and offer options?",
      result:
        "What would a good resolution look like, and how would you confirm it?",
    },
  },
  {
    key: "situational-10",
    category: "situational",
    question: "Your shift is understaffed during a rush. How do you prioritise?",
    prompts: {
      situation: "What is piling up, and where is coverage thin?",
      task: "What must the team keep running first?",
      action: "What would you prioritise, delegate and communicate?",
      result: "How would you know the queue and workload had recovered?",
    },
  },
  {
    key: "situational-11",
    category: "situational",
    question:
      "You disagree with your supervisor's instructions — what do you do?",
    prompts: {
      situation: "Which instruction concerns you, and what information is missing?",
      task: "What needs clarifying before you act?",
      action:
        "How would you raise the concern, explain your reasoning and agree on a way forward?",
      result: "What agreement would you seek and how would you check the outcome?",
    },
  },
];

const BY_KEY = new Map(STARTER_QUESTIONS.map((q) => [q.key, q]));
/** Whitespace/quote-insensitive so a curly apostrophe doesn't break the match. */
const normalise = (s: string) =>
  s.toLowerCase().replace(/[‘’]/g, "'").replace(/\s+/g, " ").trim();
const BY_TEXT = new Map(STARTER_QUESTIONS.map((q) => [normalise(q.question), q]));

/**
 * Prompts for a question. Keyed rows use their key; older starter rows match on
 * their wording (matched at read time, so opening the page writes nothing);
 * anything else gets its category's defaults.
 */
export function promptsFor(entry: Pick<InterviewEntry, "promptKey" | "question" | "category">): StarPrompts {
  const starter =
    (entry.promptKey && BY_KEY.get(entry.promptKey)) ||
    BY_TEXT.get(normalise(entry.question));
  return starter?.prompts ?? CATEGORY_DEFAULTS[entry.category] ?? CATEGORY_DEFAULTS.behavioral;
}

/** 0–4: STAR fields holding something other than whitespace. */
export const filledCount = (entry: InterviewEntry): number =>
  STAR_FIELDS.filter((f) => entry[f]?.trim()).length;

/**
 * One drafted answer per question: original prose, or at least one STAR field.
 * The Dashboard and Tracker both count with this so they can't disagree.
 */
export const isDrafted = (entry: InterviewEntry): boolean =>
  Boolean(entry.answer?.trim()) || filledCount(entry) > 0;
