# GPT-5.6 model catalog

Use this checked-in catalog for model recommendations. Do not query runtime model metadata.

## Shared configuration

- API reasoning efforts: `none`, `low`, `medium`, `high`, `xhigh`, `max`.
- Default API reasoning effort: `medium` when omitted.
- Codex also offers `ultra` on eligible plans. Treat it as a Codex execution option for complex work that benefits from parallel agents, not as an API `reasoning.effort` value.
- Context window: 1,050,000 tokens.
- Maximum output: 128,000 tokens.
- Knowledge cutoff: February 16, 2026.
- Inputs: text and images. Output: text.

## Models

### GPT-5.6 Sol

- Model ID: `gpt-5.6-sol`.
- Description: flagship model for complex reasoning, coding, and professional work.
- Recommend for: architectural changes, difficult debugging, security-sensitive work, ambiguous cross-system tasks, and other quality-first work where failure is costly.
- Tradeoff: highest capability and highest cost in the family.
- API price per 1M text tokens: $5 input, $0.50 cached input, $30 output.

### GPT-5.6 Terra

- Model ID: `gpt-5.6-terra`.
- Description: balanced model for everyday work, combining strong intelligence with lower cost.
- Recommend for: most repository implementation, review, refactoring, and multi-file work that follows established patterns.
- Tradeoff: default balance of quality, speed, and cost.
- API price per 1M text tokens: $2.50 input, $0.25 cached input, $15 output.

### GPT-5.6 Luna

- Model ID: `gpt-5.6-luna`.
- Description: fastest and most affordable GPT-5.6 model, optimized for cost-sensitive, high-volume workloads.
- Recommend for: simple localized edits, mechanical transformations, classification, extraction, and repetitive low-risk work with clear instructions.
- Tradeoff: lowest cost and latency, but not the first choice for complex or high-risk reasoning.
- API price per 1M text tokens: $1 input, $0.10 cached input, $6 output.

## Selection defaults

- Low difficulty: Luna with `low`; use `none` only for purely mechanical work.
- Medium difficulty: Terra with `medium`.
- High difficulty: Sol with `high`.
- Escalate to `xhigh` or `max` only when task risk or ambiguity justifies more reasoning.
- Recommend Codex `ultra` only when the task divides into useful parallel workstreams and the expected gain justifies the added compute.

## Sources

Verified July 22, 2026 from official OpenAI documentation:

- [OpenAI model catalog](https://developers.openai.com/api/docs/models)
- [GPT-5.6 model guidance](https://developers.openai.com/api/docs/guides/latest-model)
- [GPT-5.6 launch announcement](https://openai.com/index/gpt-5-6/)
