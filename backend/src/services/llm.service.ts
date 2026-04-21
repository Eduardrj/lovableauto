import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../config/env.js';

interface CodeEditRequest {
  prompt: string;
  files: Array<{ path: string; content: string }>;
  projectContext?: string;
}

interface CodeEditPlan {
  summary: string;
  riskLevel: 'low' | 'medium' | 'high';
  explanation: string;
  filesAffected: Array<{
    path: string;
    action: 'create' | 'update' | 'delete';
    additions: number;
    deletions: number;
  }>;
  diffs: Array<{
    path: string;
    before: string;
    after: string;
    diff: string;
  }>;
  commitMessage: string;
}

const SYSTEM_PROMPT = `You are an expert code editor assistant integrated with a Lovable project.
Your job is to analyze user requests and produce precise code changes.

RULES:
1. Only modify files that are necessary to fulfill the user's request.
2. Preserve existing code structure and style.
3. Return changes as a JSON object with the exact structure specified.
4. For each file, provide the COMPLETE new file content (not just the changed lines).
5. Assess risk level: low (cosmetic), medium (logic changes), high (breaking changes).
6. Write a concise, conventional commit message (e.g., "feat: add dark mode toggle").

RESPONSE FORMAT (strict JSON):
{
  "summary": "Brief description of all changes",
  "riskLevel": "low" | "medium" | "high",
  "explanation": "Detailed explanation of what was changed and why",
  "filesAffected": [
    {
      "path": "src/components/Example.tsx",
      "action": "update",
      "additions": 5,
      "deletions": 2
    }
  ],
  "diffs": [
    {
      "path": "src/components/Example.tsx",
      "before": "...original content...",
      "after": "...new content...",
      "diff": "...unified diff..."
    }
  ],
  "commitMessage": "feat: description of changes"
}`;

export class LlmService {
  private openai?: OpenAI;
  private gemini?: GoogleGenerativeAI;

  constructor() {
    if (env.LLM_PROVIDER === 'google') {
      if (!env.GOOGLE_API_KEY) throw new Error('GOOGLE_API_KEY is missing');
      this.gemini = new GoogleGenerativeAI(env.GOOGLE_API_KEY);
    } else if (env.LLM_PROVIDER === 'anthropic') {
      this.openai = new OpenAI({
        apiKey: env.ANTHROPIC_API_KEY,
        baseURL: 'https://api.anthropic.com/v1/',
      });
    } else {
      this.openai = new OpenAI({
        apiKey: env.OPENAI_API_KEY,
      });
    }
  }

  async generatePlan(request: CodeEditRequest): Promise<CodeEditPlan> {
    const fileContext = request.files
      .map((f) => `--- FILE: ${f.path} ---\n${f.content}\n--- END FILE ---`)
      .join('\n\n');

    const userMessage = `
${request.projectContext ? `PROJECT CONTEXT:\n${request.projectContext}\n\n` : ''}
CURRENT FILES:
${fileContext}

USER REQUEST:
${request.prompt}

Respond with ONLY valid JSON matching the specified format.`;

    if (this.gemini) {
      const model = this.gemini.getGenerativeModel({ 
        model: env.LLM_MODEL,
        generationConfig: { responseMimeType: "application/json" }
      });
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: SYSTEM_PROMPT + '\n\n' + userMessage }] }]
      });
      const response = await result.response;
      return JSON.parse(response.text()) as CodeEditPlan;
    }

    const response = await this.openai!.chat.completions.create({
      model: env.LLM_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.2,
      max_tokens: 16_000,
      response_format: { type: 'json_object' },
    });

    return JSON.parse(response.choices[0]?.message?.content || '{}') as CodeEditPlan;
  }

  async identifyRelevantFiles(
    prompt: string,
    allFiles: Array<{ path: string; size: number }>,
  ): Promise<string[]> {
    const fileList = allFiles
      .filter((f) => f.size < 100_000)
      .map((f) => f.path)
      .join('\n');

    const instruction = `You are a code analysis assistant. Given a user request and a list of file paths,
return a JSON array of file paths that are most likely relevant to fulfilling the request.
Return at most 15 files. Prioritize component files, style files, and configuration files.
Response format: { "files": ["path1", "path2"] }`;

    const userMsg = `REQUEST: ${prompt}\n\nFILE LIST:\n${fileList}`;

    if (this.gemini) {
      const model = this.gemini.getGenerativeModel({ 
        model: env.LLM_MODEL,
        generationConfig: { responseMimeType: "application/json" }
      });
      const result = await model.generateContent(instruction + '\n\n' + userMsg);
      const response = await result.response;
      const parsed = JSON.parse(response.text());
      return parsed.files ?? [];
    }

    const response = await this.openai!.chat.completions.create({
      model: env.LLM_MODEL,
      messages: [
        { role: 'system', content: instruction },
        { role: 'user', content: userMsg },
      ],
      temperature: 0,
      max_tokens: 2_000,
      response_format: { type: 'json_object' },
    });

    const parsed = JSON.parse(response.choices[0]?.message?.content || '{}');
    return parsed.files ?? [];
  }
}

export const llmService = new LlmService();
