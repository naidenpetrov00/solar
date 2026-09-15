# GPT-6 Astra and GPT-5.6 model catalog

Use this checked-in catalog for model recommendations. Do not query runtime model metadata.

## Shared configuration

- GPT-5.6 API reasoning efforts: `none`, `low`, `medium`, `high`, `xhigh`, `max`; default: `medium`.
- GPT-6 Astra API reasoning efforts: `low`, `medium`, `high`, `xhigh`, `max`. It does not support `none` or `minimal`. Set the effort explicitly; the cited Astra model page does not specify an omitted-value default.
- Codex also offers `ultra` where available. It uses subagents for parallel work and is not an API `reasoning.effort` value. Model and effort availability depend on the plan, client, and rollout. See [Codex models and reasoning](https://learn.chatgpt.com/docs/models).
- Context window: 1,050,000 tokens.
- Maximum output: 128,000 tokens.
- Knowledge cutoff: April 30, 2026 for Astra; February 16, 2026 for Sol, Terra, and Luna.
- Inputs: text and images. Output: text.

## Models

### GPT-6 Astra

- Model ID: `gpt-6-astra`.
- Description: OpenAI's most capable model for difficult workflows spanning reasoning, coding, computer use, research, and document creation.
- Recommend for: the hardest tasks spanning multiple systems and tools, sustained implementation, difficult investigations, and work requiring strong judgment throughout.
- Tradeoff: highest capability and per-token price in this catalog; fewer output tokens can offset the higher rate on some tasks, so token price alone does not establish total task cost.
- API price per 1M text tokens: $10 input, $1 cached input, $50 output; cache writes: $12.50.
- API tool calling requires Responses, even though Chat Completions is supported.
- Sources: [Astra model details](https://developers.openai.com/api/docs/models/gpt-6-astra), [Astra model guidance](https://developers.openai.com/api/docs/guides/latest-model).

### GPT-5.6 Sol

- Model ID: `gpt-5.6-sol`.
- Description: most capable GPT-5.6 model for complex professional work. The API alias `gpt-5.6` routes to Sol.
- Recommend for: architectural changes, difficult debugging, security-sensitive work, ambiguous cross-system tasks, and other quality-first work where failure is costly.
- Tradeoff: highest capability and cost within GPT-5.6, with lower per-token pricing than Astra.
- API price per 1M text tokens: $4 input, $0.40 cached input, $20 output. This promotional pricing is available at least through November 21, 2026.
- Source: [Sol model details](https://developers.openai.com/api/docs/models/gpt-5.6-sol).

### GPT-5.6 Terra

- Model ID: `gpt-5.6-terra`.
- Description: balanced model for everyday work, combining strong intelligence with lower cost.
- Recommend for: most repository implementation, review, refactoring, and multi-file work that follows established patterns.
- Tradeoff: default balance of quality, speed, and cost.
- API price per 1M text tokens: $2 input, $0.20 cached input, $12 output.
- Source: [Terra model details](https://developers.openai.com/api/docs/models/gpt-5.6-terra).

### GPT-5.6 Luna

- Model ID: `gpt-5.6-luna`.
- Description: fast, most affordable GPT-5.6 model, optimized for cost-sensitive, high-volume workloads.
- Recommend for: simple localized edits, mechanical transformations, classification, extraction, and repetitive low-risk work with clear instructions.
- Tradeoff: lowest token cost in this catalog; best suited to clear, repeatable tasks with limited ambiguity.
- API price per 1M text tokens: $0.20 input, $0.02 cached input, $1.20 output.
- Source: [Luna model details](https://developers.openai.com/api/docs/models/gpt-5.6-luna).

## Pricing scope

- Prices above are Standard API USD rates per 1M text tokens for requests with up to 272,000 input tokens; they are not Codex subscription or credit prices.
- Above 272,000 input tokens, the model pages specify 2x input and 1.5x output pricing for the entire request. Astra explicitly applies the 2x multiplier to cache rates too.
- Cache writes are billed at 1.25x the uncached input rate.
- Astra Batch and Flex cost 50% of Standard rates; Fast mode costs 2x the applicable rates. Tool charges are separate. See the model pages above for pricing conditions.

## Selection defaults

These are this skill's task-selection heuristics, informed by [official model selection guidance](https://learn.chatgpt.com/docs/models#choosing-astra-sol-terra-and-luna), rather than API defaults.

- Low difficulty: Luna with `low`; use `none` only for purely mechanical API work where supported.
- Medium difficulty: Terra with `medium`.
- High difficulty: Sol with `high`.
- Hardest sustained work across multiple steps and tools: Astra with `high`; consider `xhigh` when deeper analysis is justified.
- Escalate to `xhigh` or `max` only when task risk or ambiguity justifies more reasoning.
- Recommend Codex `ultra` only when the task divides into useful parallel workstreams and the expected gain justifies the added compute.

## Sources

Verified September 14, 2026 from official OpenAI documentation. Direct model-page citations appear with each entry above.

- [OpenAI model catalog](https://developers.openai.com/api/docs/models)
- [Current model guidance (GPT-6 Astra)](https://developers.openai.com/api/docs/guides/latest-model)
- [Codex models, selection, and reasoning efforts](https://learn.chatgpt.com/docs/models)
