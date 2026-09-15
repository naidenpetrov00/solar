---
name: prompt-generator
description: Rewrite rough, incomplete, or poorly written requests into clear execution prompts for another agent. Use when the user invokes /prompt or asks for a better prompt with relevant skill names and execution settings, without inspecting or implementing the project.
---

# Prompt Generator

Turn the user's request into a concise, execution-ready prompt for another agent. Improve the instruction; do not perform, investigate, or plan the requested work.

## Process

1. Infer the user's intent from their wording and any context they supplied.
2. Rewrite the outcome and requirements clearly without changing scope or inventing details.
3. Select relevant skills from the active skill catalog using names and descriptions only. Never open candidate `SKILL.md` files.
4. Recommend a model and reasoning effort using [references/models.md](references/models.md).
5. Decide whether the implementing agent should use Plan Mode, Goal Mode, or neither.
6. State the important constraints and expected result.
7. Return only the generated prompt.

Resolve minor wording gaps with the narrowest reasonable interpretation. When missing information would materially change the work, tell the implementing agent what it must confirm or discover instead of researching it yourself.

## Hard boundary

Do not:

- inspect repository files, source code, configuration, branches, diffs, or implementation details;
- search for or read `AGENTS.md`; leave instruction discovery to the implementing agent;
- read skill contents to decide whether a skill applies;
- browse the web or external documentation;
- design the implementation, produce a step-by-step plan, or solve the task;
- claim project context that the user did not provide.

Use only the user's request, user-supplied context, the active skill catalog's names and descriptions, and the model reference. The implementing agent owns repository discovery, scoped `AGENTS.md` discovery, technical decisions, planning, implementation, and verification.

## Output

```text
Task
[Clear statement of the work and desired outcome]

Execution setup
- Required skills: [exact skill names, or None]
- Model: [exact model ID]
- Reasoning: [supported effort]
- Mode: [Plan Mode, Goal Mode, or Default Mode]

Requirements
- Before acting, discover and obey the repository-root and every applicable scoped `AGENTS.md` instruction file.
- [Requirements derived from the user's request]

Constraints
- [Explicit constraints and important scope boundaries]

Expected result
- [Concrete result the implementing agent must deliver or verify]
```

## Skill selection

- Use exact skill names from the active catalog; never invent names.
- Include a skill only when its description clearly matches the requested work.
- Prefer the smallest useful set and the most specific matching skill.
- Do not include `prompt-generator` in the generated prompt's Required skills.
- Write `None` when no listed skill is relevant.

## Execution recommendation

Read [references/models.md](references/models.md) only for model and reasoning selection. Keep the recommendation proportional to the apparent difficulty and risk.

- Use Plan Mode for bounded work with multiple dependent steps, affected layers, or meaningful tradeoffs.
- Use Goal Mode for broad or sustained outcome-oriented work likely to need several iterations or turns.
- Use neither for a small, self-contained request.
- Never recommend Plan Mode and Goal Mode together.

Do not create a plan when recommending Plan Mode. The recommendation only tells the implementing agent which execution mode to use.

Keep the generated prompt direct and compact. Preserve explicit user requirements. Omit empty optional sections, duplicated wording, speculative file paths, generic advice, and implementation steps.
