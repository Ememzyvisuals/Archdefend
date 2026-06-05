// ArchDefend AI Prompt Templates

export const SYSTEM_PROMPTS = {
  architect: `You are a principal software architect with 15 years of experience analyzing production codebases. 
You provide deep, actionable architectural insights. Be specific, use technical terminology correctly, 
and focus on real engineering concerns like scalability, maintainability, and security.
Respond only with valid JSON when asked for structured output — no markdown, no preamble.`,

  security: `You are a senior security engineer performing thorough code review for production systems.
You identify real vulnerabilities with severity ratings and actionable remediation steps.
Focus on: secrets/credentials exposure, injection vulnerabilities, authentication flaws, 
insecure dependencies, architecture-level security risks.
Respond only with valid JSON when asked for structured output.`,

  writer: `You are a senior technical writer creating documentation for engineering teams.
Write clearly, concisely, and with technical precision. Use concrete examples.
Format output as clean Markdown with proper headings, code blocks, and tables where appropriate.`,
} as const;

export const buildArchitecturePrompt = (
  repoName: string,
  summary: string,
  techStack: string[],
  symbolsSummary: string
): string => `Analyze this repository and return structured JSON:

Repository: ${repoName}
Summary: ${summary}
Tech Stack: ${techStack.join(", ")}
Symbols: ${symbolsSummary}

Return JSON with:
{
  "overview": "2-3 sentence architecture overview",
  "architectural_style": "e.g. Monolith, Microservices, MVC, Event-driven, Layered",
  "strengths": ["3-5 architectural strengths"],
  "risks": ["3-5 architectural risks or concerns"],
  "recommendations": ["3-5 specific improvement recommendations"],
  "scalability_score": 75,
  "maintainability_score": 80,
  "security_score": 70,
  "complexity_level": "low|medium|high|very_high",
  "onboarding_time_estimate": "e.g. 2-3 days",
  "key_services": ["list of key services/modules"],
  "data_flow": "description of data flow",
  "external_dependencies": ["external services/APIs identified"]
}`;

export const buildReportPrompt = (
  reportType: string,
  repoName: string,
  architectureData: object,
  techStack: string[]
): string => {
  const base = `Repository: ${repoName}\nTech Stack: ${techStack.join(", ")}\nArchitecture Data: ${JSON.stringify(architectureData, null, 2)}\n\n`;

  const templates: Record<string, string> = {
    architecture_overview: `${base}Write a comprehensive architecture overview report in Markdown.
Include: Executive Summary, System Architecture, Tech Stack Analysis, Key Components, Data Flow, Scalability Assessment, Recommendations.`,

    onboarding: `${base}Write a new developer onboarding guide in Markdown.
Include: Quick Start, Codebase Structure, Key Concepts, Important Files, Development Workflow, Common Patterns, Gotchas.`,

    interview_defense: `${base}Write an architecture defense document for technical interviews in Markdown.
Include: Why We Built It This Way, Key Design Decisions, Trade-offs Made, Scalability Approach, Security Considerations, Technical Debt, What We'd Do Differently, Q&A Prep.`,

    security: `${base}Write a security analysis report in Markdown.
Include: Executive Summary, Threat Model, Security Findings, Authentication & Authorization, Data Protection, Dependency Risks, Recommendations, Compliance Notes.`,

    technical_debt: `${base}Write a technical debt analysis report in Markdown.
Include: Debt Summary, Critical Issues, Architecture Debt, Code Quality Issues, Dependency Debt, Remediation Roadmap, Effort Estimates.`,

    dependency_analysis: `${base}Write a dependency analysis report in Markdown.
Include: Dependency Graph Overview, External Dependencies, Internal Module Dependencies, Circular Dependencies, Risk Assessment, Update Recommendations.`,

    scalability: `${base}Write a scalability assessment report in Markdown.
Include: Current Architecture Limits, Bottlenecks Identified, Horizontal Scaling Options, Database Scalability, Caching Strategy, Recommendations for 10x Growth.`,
  };

  return templates[reportType] || templates.architecture_overview;
};

export const buildSecurityPrompt = (
  repoName: string,
  codeSamples: Array<{ path: string; language: string; content: string }>
): string => {
  const samplesText = codeSamples
    .map((s) => `File: ${s.path}\nLanguage: ${s.language}\n\`\`\`\n${s.content.slice(0, 2000)}\n\`\`\``)
    .join("\n\n---\n\n");

  return `Review these code samples from ${repoName} for security vulnerabilities.

${samplesText}

Return a JSON array of findings (empty array if none found):
[
  {
    "severity": "critical|high|medium|low|info",
    "category": "Secret Exposure|SQL Injection|XSS|Insecure Auth|Unsafe Pattern|Circular Dependency|Architecture Smell",
    "title": "Brief descriptive title",
    "description": "Detailed description of the issue",
    "file_path": "path/to/file.py",
    "line_number": 42,
    "recommendation": "Specific fix recommendation"
  }
]

Focus on: hardcoded secrets/API keys, SQL injection, XSS, insecure direct object references, 
broken authentication, sensitive data exposure, security misconfiguration.`;
};
