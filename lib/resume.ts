/**
 * Engine-agnostic resume content model (§7.2): the same structure feeds the
 * LaTeX-faithful template, the visual/retail template, and — later — a real
 * LaTeX backend, with no data migration. Stored as JSON in
 * ResumeVersion.content. Bullets edit as one-per-line text; skills as a
 * comma-separated string.
 */

export interface ResumeItem {
  id: string;
  heading: string;
  sub?: string;
  dates?: string;
  bullets: string[];
}

export interface ResumeSection {
  id: string;
  title: string;
  items: ResumeItem[];
}

export interface ResumeContent {
  name: string;
  tagline: string;
  email: string;
  phone: string;
  location: string;
  links: string;
  summary: string;
  skills: string;
  sections: ResumeSection[];
}

export const uid = () => Math.random().toString(36).slice(2, 9);

export const splitSkills = (skills: string) =>
  skills
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

/**
 * Retail/hospitality resume — imported verbatim 2026-07-04 from the user's
 * Hamdan_Zahid_resume.pdf (DM Sans, banded single-column design). Keep
 * content exactly as the PDF; Key Skills and Languages live as sections so
 * they render as spread rows in the PDF's order.
 */
export const DEFAULT_RETAIL: ResumeContent = {
  name: "Hamdan Zahid",
  tagline: "University Student",
  email: "hamdan3809@gmail.com",
  phone: "+61 401-212-713",
  location: "Officer, VIC 3809",
  links: "https://www.linkedin.com/in/hamdanzahid/",
  summary:
    "I'm a reliable and friendly university student who enjoys the busy and helpful nature of customer facing work. I thrive in fast-paced environments and am comfortable with hands-on work. I am also diligent and organised, turn up on time and bring a positive attitude and work ethic. I am quick to learn new systems and adapt to changing scenarios resiliently, working well in team-based environments. I am currently seeking part-time work and would love to add to a positive workplace and provide extensive value contributions.",
  skills: "",
  sections: [
    {
      id: uid(),
      title: "Work Experience",
      items: [
        {
          id: uid(),
          heading: "Student Consultant",
          sub: "Practera",
          dates: "Dec 2025 - Jan 2026",
          bullets: [
            "Led a team of 6 student consultants to deliver a project under a tight two-week deadline, helping organise tasks and keeping the group coordinated under pressure",
            "Compiled & formatted an implementation ready roadmap, ensuring quality & professionalism for project delivery",
            "Communicated clearly with the client, maintaining professionalism and incorporated feedback to ensure streamlined project delivery",
          ],
        },
        {
          id: uid(),
          heading: "Engineering Intern",
          sub: "BOGE Compressors",
          dates: "June 2025 - July 2025",
          bullets: [
            "Reviewed customer requirements, attended to client tenders and helped develop tailored system proposals, for clients",
            "Worked closely with the Marketing team to create LinkedIn posts that translated technical information into appealing assets",
          ],
        },
      ],
    },
    {
      id: uid(),
      title: "Education",
      items: [
        {
          id: uid(),
          heading:
            "Bachelor of Mechanical Engineering (Honours) / Bachelors of Business",
          sub: "Royal Melbourne Institute of Technology (RMIT)",
          dates: "March 2024 - Dec 2028",
          bullets: [
            "Student member of RMIT RUSART's research team (Unmanned Aerial Vehicles Club)",
          ],
        },
        {
          id: uid(),
          heading: "Officer Secondary College (VCE)",
          dates: "Jan 2017 - Dec 2023",
          bullets: [
            "Principal's Pride Award | Year 10",
            "Academic Excellence recognition (Top 10%) | Years 10-12",
          ],
        },
      ],
    },
    {
      id: uid(),
      title: "Key Skills",
      items: [
        { id: uid(), heading: "Teamwork", bullets: [] },
        { id: uid(), heading: "Effective Communicator", bullets: [] },
        { id: uid(), heading: "Adaptable", bullets: [] },
        { id: uid(), heading: "Problem Solver", bullets: [] },
        { id: uid(), heading: "Organised", bullets: [] },
        { id: uid(), heading: "Attention-to-detail", bullets: [] },
      ],
    },
    {
      id: uid(),
      title: "Languages",
      items: [
        { id: uid(), heading: "English", sub: "Proficient", bullets: [] },
        { id: uid(), heading: "Urdu", sub: "Proficient", bullets: [] },
        { id: uid(), heading: "Hindi", sub: "Fluent", bullets: [] },
        { id: uid(), heading: "Punjabi", sub: "Intermediate", bullets: [] },
      ],
    },
  ],
};

/**
 * Extended CV — imported 2026-07-04 from the user's real Awesome CV LaTeX
 * sources (~/Downloads/LaTeXTemplates_awesome-resume-cv_v1.3 2/cv-sections).
 * Skill categories live as a "Skills" section (items, no bullets), so the
 * flat `skills` string stays empty to avoid a duplicate section.
 */
export const DEFAULT_CV: ResumeContent = {
  name: "Hamdan Zahid",
  tagline: "Mechanical Engineering Student",
  email: "hamdan3809@gmail.com",
  phone: "(+61) 401-212-713",
  location: "17 Hercules Drive, Officer, 3809, Victoria, Australia",
  links: "www.linkedin.com/in/hamdanzahid",
  summary:
    "I'm a dedicated and motivated Mechanical Engineering student inquisitive about all facets of engineering. I'm a curious, methodical problem solver driven by a strong interest in applying engineering innovation to solve and tackle real-world problems to deliver well-rounded functional solutions through extensive value contributions. I am proficient in 3D CAD software (SolidWorks), engineering analysis (MATLAB) and structured technical reporting (LaTeX). I am proactive, reliable and collaborative in team environments, I enjoy solving complex problems and delivering clear, practical and buildable solutions.",
  skills: "",
  sections: [
    {
      id: uid(),
      title: "Education",
      items: [
        {
          id: uid(),
          heading:
            "Bachelor of Mechanical Engineering (Honours) / Bachelor of Business",
          sub: "RMIT University · Melbourne, Australia",
          dates: "Expected 2028",
          bullets: [
            "Engineering Minor: Intelligent Manufacturing Technologies",
            "Business Major: Marketing | Business Minor: Supply Chain & Logistics",
          ],
        },
      ],
    },
    {
      id: uid(),
      title: "Skills",
      items: [
        {
          id: uid(),
          heading: "Design & Simulation",
          sub: "SolidWorks, PTC Creo (AR/VR Visualisation)",
          bullets: [],
        },
        {
          id: uid(),
          heading: "Analysis & Programming",
          sub: "MATLAB, Simulink, Microsoft Suite, LaTeX",
          bullets: [],
        },
        {
          id: uid(),
          heading: "Languages",
          sub: "English, Urdu, Punjabi, Hindi",
          bullets: [],
        },
      ],
    },
    {
      id: uid(),
      title: "Experience",
      items: [
        {
          id: uid(),
          heading: "Digital Strategy Consultant",
          sub: "AI Governance Australia Start-up · Melbourne, Australia",
          dates: "Dec. 2025 – Dec. 2025",
          bullets: [
            "Developed a low-cost, evidence-based digital market entry strategy for non-profit AI Governance Australia to establish its brand presence from zero, prioritising high-credibility & traffic media channels including LinkedIn, Instagram & TikTok.",
            "Conducted structured market and audience research to profile target segments, map content consumption patterns, and quantify platform engagement trends to establish campaign positioning and channel strategy.",
            "Designed and delivered a three-pronged, integrated platform-native marketing campaign, specifying content themes, video structures, and scalable content workflows aligned with each platform's algorithm behaviour and attention constraints.",
            "Designed campaigns based on technical KPI frameworks, defining channel-level performance indicators (impressions, retention thresholds, share-to-view ratios, etc.) to enable benchmarking and support content quality.",
            "Presented research findings and strategic recommendations into an implementation-ready digital advertising roadmap, synthesised into a client-ready report and pitched to the client's leadership team.",
          ],
        },
        {
          id: uid(),
          heading: "Student Engineering Intern",
          sub: "BOGE Compressors Australia · Melbourne, Australia",
          dates: "Jun. 2025 – Jul. 2025",
          bullets: [
            "Gained comprehensive knowledge of industrial compressed-air technologies and compressor machinery, identifying critical mechanical components and operating principles to support the engineering team.",
            "Analysed client tenders under supervision to develop tailored compressed-system proposals, determining optimal compressor sizing and configuration under pressure/flow constraints; matched client technical requirements to BOGE's product range to deliver custom solutions that contributed to the sales pipeline.",
            "Modelled a pre-suction filter assembly and compressor rotor in SolidWorks to in-house dimensional specifications.",
            "Leveraged a marketing background to design visual advertising assets and informative technical LinkedIn posts using Canva & Adobe Express.",
          ],
        },
      ],
    },
    {
      id: uid(),
      title: "Projects",
      items: [
        {
          id: uid(),
          heading: "Project Coordinator",
          sub: "Engineering Design Challenge EWB/SYDwest",
          dates: "Mar. 2024 – Oct. 2024",
          bullets: [
            "Co-led a 6-member multidisciplinary team to engineer a sustainable waste-management system for Pu Ngaol Village (Cambodia), translating complex community constraints into a viable recycling and reuse solution.",
            "Spearheaded the development of an LDPE plastic weaving circular-economy solution using human-centered design (HCD) principles to repurpose LDPE soft plastics into durable, saleable goods and reduce plastic waste.",
            "Performed detailed cost & material-sourcing analysis, validated deliverable costs < 15 AUD per household, and developed a scalable phased implementation plan for community adoption.",
            "Selected as a SYDwest finalist and recognised as 'Best Quality Report' from RMIT (Rank 1) by industry stakeholders in the Plastic Waste & Recycling category.",
          ],
        },
        {
          id: uid(),
          heading: "Project Co-lead",
          sub: "Wingbox Design & Optimisation",
          dates: "Aug. 2024 – Oct. 2024",
          bullets: [
            "Engineered a lightweight aluminium wing-box leading end-to-end design and fabrication while optimising cross-sectional geometry to maximise strength-to-weight ratio under specific load conditions.",
            "Conducted tensile and three-point bending tests, supported by SolidWorks modelling of the structure assembly. Produced manufacturing drawings ensuring sheet-metal bend allowances and adherence to dimensional constraints.",
            "Manufactured final prototype using manual sheet-bending and riveting, ensuring precise alignment to minimise stress concentrations and achieve reliable load-bearing performance.",
          ],
        },
        {
          id: uid(),
          heading: "Team Member",
          sub: "Lunar Rover Suspension Design Project",
          dates: "Aug. 2024 – Oct. 2024",
          bullets: [
            "Designed a rocker-bogie suspension subsystem & wheel mount assemblies in SolidWorks, meeting strict mission and weight constraints while ensuring robust chassis interfaces for the uneven lunar terrain.",
            "Produced detailed manufacturing drawings & Bill of Materials (BOM) for assigned components.",
            "Generated immersive augmented reality (AR) model of the rover assembly using PTC Creo Parametric featuring high-fidelity renders, enabling the team to perform 1:1 scale spatial validation and design reviews.",
          ],
        },
        {
          id: uid(),
          heading: "Personal Project",
          sub: "Flight Test Aircraft Stability & Analysis - Nova Systems Virtual Internship",
          dates: "Feb. 2026 - Feb. 2026",
          bullets: [
            "Analysed stick-free elevator control force (Fe) vs indicated airspeed (Vi) data across three centre-of-gravity (CG) locations to assess longitudinal static stability of an aircraft.",
            "Cleaned and processed multi-run flight-test datasets using MATLAB and implemented least-squares linear regression in MATLAB to estimate stability gradients dFe/dVi and compare trends across CG shifts.",
            "Produced a structured technical report to deliver comprehensive trend analysis and engineering interpretations and rationale connecting data to literature regarding aircraft stability.",
            "Compiled the report in LaTeX that contained plots, code, derivations, calculations, assumptions and conclusions drawn regarding CG/configuration impact on aircraft stability and flight.",
          ],
        },
      ],
    },
    {
      id: uid(),
      title: "Honors & Awards",
      items: [
        // heading-only items render as subsection headers (\cvsubsection)
        {
          id: uid(),
          heading: "Academics & Excellence",
          bullets: [],
        },
        {
          id: uid(),
          heading: "Finalist",
          sub: "Engineers Without Borders (EWB) & SYDWest Design Challenge · Australia",
          dates: "2024",
          bullets: [],
        },
        {
          id: uid(),
          heading: "Finalist",
          sub: "SAMSUNG Solve for Tomorrow · Australia",
          dates: "2024",
          bullets: [],
        },
        {
          id: uid(),
          heading: "Academic Award",
          sub: "Academic Excellence (Yr 10 -12) · Australia",
          dates: "2023",
          bullets: [],
        },
        {
          id: uid(),
          heading: "Academic Award",
          sub: "Principal Pride Award (Yr 10) · Australia",
          dates: "2021",
          bullets: [],
        },
        {
          id: uid(),
          heading: "Outside Academics",
          bullets: [],
        },
        {
          id: uid(),
          heading: "Sports",
          sub: "Represented Victoria at the Junior Floorball Australian Open U-13 – Position 2nd Place · Australia",
          dates: "2018",
          bullets: [],
        },
        {
          id: uid(),
          heading: "Sports",
          sub: "Represented Victoria at the Junior Floorball Australian Open U-13 – Position 2nd Place · Australia",
          dates: "2019",
          bullets: [],
        },
      ],
    },
    {
      id: uid(),
      title: "Extracurricular",
      items: [
        {
          id: uid(),
          heading: "Consulting Hackathon",
          sub: "Common Purpose & EG&E Big Industry Challenge · Melbourne, Australia",
          dates: "Nov. 2025",
          bullets: [
            "Participated in the Big Industry Challange 2-day Hackathon hosted by Common Purpose. It provided an opportunity to partner with BG&E Consultancy firm and complete a small consultancy project for them onsite.",
          ],
        },
        {
          id: uid(),
          heading: "Student Consultant",
          sub: "Practera Consultancy Program · Melbourne, Australia",
          dates: "Dec. 2025",
          bullets: [
            "Participated in a consultancy program hosted by Practera where I served as a student consultant for a non-profit startup and completed a pro bono consultancy project over a 2-week period.",
          ],
        },
        {
          id: uid(),
          heading: "Victorian Representative",
          sub: "Australian Junior Floorball Open · Melbourne, Australia",
          dates: "July. 2019",
          bullets: [
            "Represented the State of Victoria at the Junior Australian Floorball Open for the Victorian U13's team. Competed as a starter securing vital goals and assists to help the team reach the finals and place 2nd.",
          ],
        },
        {
          id: uid(),
          heading: "UAS Research Team Member",
          sub: "RMIT Uncrewed Ariel Aircraft Systems · Melbourne, Australia",
          dates: "March. 2026",
          bullets: [
            "From the Onset of Semester 1, I have joined the RMIT UAS research team, where I will be undertaking a research project in due time. Meanwhile I have been attending weekly Advanced CAD modelling workshops and Modelling Competitions to build up Solidworks Skills and nurture competency in 3D CAD Modelling",
          ],
        },
      ],
    },
    {
      id: uid(),
      title: "Licenses and Certifications",
      items: [
        {
          id: uid(),
          heading: "Nova Systems",
          sub: "Flight Test Engineering Virtual Internship",
          dates: "2026",
          bullets: [],
        },
        {
          id: uid(),
          heading: "Common Purpose",
          sub: "Big Industry Challenge Certificate",
          dates: "2025",
          bullets: [],
        },
        {
          id: uid(),
          heading: "MathWorks",
          sub: "MATLAB Onramp Certificate",
          dates: "2025",
          bullets: [],
        },
        {
          id: uid(),
          heading: "Student Member",
          sub: "Engineers Australia",
          dates: "2024",
          bullets: [],
        },
      ],
    },
    {
      id: uid(),
      title: "Clubs",
      items: [
        {
          id: uid(),
          heading: "Student Member",
          sub: "Young Engineers Australia Victoria (YEAV)",
          dates: "[1]",
          bullets: [],
        },
        {
          id: uid(),
          heading: "Member",
          sub: "Pakistani Students Association",
          dates: "[2]",
          bullets: [],
        },
        {
          id: uid(),
          heading: "Member",
          sub: "Mechanical and Automotive Engineering Association (MAEA)",
          dates: "[3]",
          bullets: [],
        },
        {
          id: uid(),
          heading: "Member",
          sub: "Business Students Association (BSA)",
          dates: "[4]",
          bullets: [],
        },
        {
          id: uid(),
          heading: "Research Team Member",
          sub: "RMIT Uncrewed Ariel Systems Research Team",
          dates: "[5]",
          bullets: [],
        },
      ],
    },
  ],
};

/* ── Cover letter ───────────────────────────────────────────────────── */

export interface CoverLetterFields {
  yourName: string;
  company: string;
  position: string;
  hiringManager: string;
  keySkills: string;
  hook: string;
  track: "technical" | "retail";
  contactLine: string;
  locationLine: string;
  greeting: string;
  /** Rendered verbatim; leave empty to show today's date. */
  date: string;
  closing: string;
}

/**
 * Defaults imported verbatim 2026-07-04 from the user's LaTeX-compiled
 * Hamdan_Cover_Letter_Stantec.pdf — he reuses this letter as a template,
 * swapping the company-specific parts per application.
 */
export const DEFAULT_COVER_FIELDS: CoverLetterFields = {
  yourName: "Hamdan Zahid",
  company: "Stantec",
  position: "Mechanical Engineering Internship",
  hiringManager: "",
  keySkills: "",
  hook: "",
  track: "technical",
  contactLine:
    "hamdan3809@gmail.com | +61 401212713 | linkedin.com/in/hamdanzahid",
  locationLine: "Location: Officer, Melbourne, VIC, Australia",
  greeting: "To whom it may concern,",
  date: "February 14, 2026",
  closing: "Sincerely,",
};

export const DEFAULT_COVER_BODY = [
  "I am writing to express my strong interest in the Mechanical Engineering Internship at Stantec. My passion for engineering is driven by a desire to apply innovation toward solving real-world problems. I am keen to contribute to Stantec's team by drawing on my problem-solving skills, creative thinking, and clear communication to deliver practical, buildable solutions.",
  "Stantec's sustainable and community-centered design approach deeply resonates with me. I strive to approach engineering through a lens focused on delivering solutions that are not only feasible on paper but workable in real-world environments. My goal is to improve outcomes for end-users while prioritizing both stakeholder value and community benefit.",
  "What I can bring to Stantec is both a technical and commercial background, grounded in strong mechanical engineering foundation, complemented by marketing experience. In the industry, I completed a Student Engineering Internship at BOGE Compressors Australia, where I supported engineers by reviewing client tenders and helped develop tailored system proposals under pressure/flow constraints. This experience strengthened my ability to interpret requirements and communicate options clearly. I also worked as a digital strategy consultant for non-profit AI Governance Australia, delivering an implementation-ready roadmap for a three-platform digital market-entry strategy and developed KPI frameworks to benchmark campaign performance, delivered to stakeholders in a comprehensive technical report.",
  "Through different projects I've built a deliverable first approach, turning requirements into clear actionable outputs that the team can use to drive critical decisions. In my wing-box design & fabrication project, I progressed a concept from a cardboard prototype into a lightweight manufactured wingbox supported by structural modelling in SolidWorks and validated through calculations and physical tensile/three-point bending testing. Alongside this I prepared a technical report summarising and discussing design decisions, technical outcomes in a clear and structured manner. Another project I took up was Nova Systems' virtual flight test engineering internship where I analysed flight test data in MATLAB, generated trajectory graphs and documented the entire procedure, code, findings, insights and derivations into a structured technical report in LaTeX, demonstrating attention to detail and coordination of design decisions to my team in a structured way.",
  "I would welcome the opportunity to learn and grow within Stantec's supportive environment while contributing from day one across both technical and team-based facets.",
].join("\n\n");

/**
 * Synthesises letter body paragraphs from the metadata (§3 Module 1).
 * Greeting, date, closing and signature are separate fields now, so this
 * returns only the paragraphs that go between them.
 */
export function generateCoverLetter(f: CoverLetterFields): string {
  const skills = splitSkills(f.keySkills);
  const skillLine =
    skills.length > 1
      ? `${skills.slice(0, -1).join(", ")} and ${skills.at(-1)}`
      : (skills[0] ?? "the skills listed in my resume");
  const company = f.company.trim() || "your company";
  const position = f.position.trim() || "advertised";

  const body =
    f.track === "technical"
      ? [
          `I am writing to apply for the ${position} position at ${company}. As a third-year Mechanical Engineering student, I bring a working command of ${skillLine}, sharpened through design-build-test project work rather than theory alone.`,
          f.hook.trim() &&
            `${f.hook.trim()} That is exactly the kind of problem I want to contribute to at ${company}.`,
          `Alongside my studies I hold down part-time customer-facing work, which has taught me to communicate clearly, manage competing deadlines and stay dependable under pressure — habits I bring to every engineering team I join.`,
          `I would welcome the opportunity to discuss how I can contribute. Thank you for your time and consideration.`,
        ]
      : [
          `I would like to apply for the ${position} role at ${company}. I bring ${skillLine}, and a genuine enjoyment of customer-facing work — keeping service quick, shelves presentable and customers looked after.`,
          f.hook.trim() && `${f.hook.trim()}`,
          `As an engineering student I am organised, punctual and quick to learn new systems, and my study timetable gives me reliable availability for evening and weekend shifts.`,
          `I would love the chance to show what I can bring to the team. Thank you for considering my application.`,
        ];

  return body.filter(Boolean).join("\n\n");
}

/** The date line: verbatim if set, otherwise today in the letter's format. */
export function coverLetterDate(f: CoverLetterFields): string {
  return (
    f.date.trim() ||
    new Date().toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    })
  );
}
