# GPT-5.6 model catalog

Use this checked-in catalog when recommending a model and reasoning setting. It intentionally covers only the GPT-5.6 family. Do not query runtime model metadata.

## Model selection

### GPT-5.6 Sol

- Model ID: `gpt-5.6-sol`.
- Choose for: difficult, ambiguous, or high-consequence professional work; architecture; advanced debugging; and security-sensitive reviews.
- Tradeoff: highest cost in this family.

### GPT-5.6 Terra

- Model ID: `gpt-5.6-terra`.
- Choose for: the default for ordinary multi-file implementation, refactoring, reviews, and other established-pattern work.
- Tradeoff: less headroom than Sol on the most demanding work.

### GPT-5.6 Luna

- Model ID: `gpt-5.6-luna`.
- Choose for: small, clear, low-risk edits; extraction; classification; and repetitive transformations.
- Tradeoff: least suitable for ambiguity or deep judgment.

- The API alias `gpt-5.6` resolves to `gpt-5.6-sol`.
- All three accept text and image input and produce text. They have a 1,050,000-token context window and a 128,000-token maximum output.
- The GPT-5.6 knowledge cutoff is February 16, 2026.

## Reasoning recommendations

In the API, GPT-5.6 supports `none`, `low`, `medium`, `high`, `xhigh`, and `max`; the documented default is `medium`. In Codex, select only an effort available in the current client. Codex may additionally offer `ultra`: it orchestrates parallel subagents and is not an API `reasoning.effort` value.

Start at the lowest setting that responsibly fits the task. More reasoning increases latency and token use; increase it only when planning, uncertainty, or failure cost warrants it.

- Mechanical, tightly scoped work: Luna with `low`; use `none` only for truly mechanical API work.
- Routine implementation or review: Terra with `medium`.
- Complex, ambiguous, or higher-risk work: Sol with `high`.
- Difficult investigation or cross-system design: Sol with `xhigh`.
- Exceptional risk or deep analysis where time and cost are justified: Sol with `max`.

Recommend Codex `ultra` only when work separates into genuinely independent, useful parallel streams. Do not use it merely because a task is large.

## Pricing scope

- Standard API USD rates per 1M text tokens, for requests up to 272K input tokens: Sol $4 input / $0.40 cached input / $20 output; Terra $2 / $0.20 / $12; Luna $0.20 / $0.02 / $1.20.
- Prompts over 272K input tokens are priced at 2x input and 1.5x output for the full request.
- Cache writes are billed at 1.25x the uncached input rate.
- These are API rates, not Codex subscription or credit prices. Product availability and usage limits vary by plan and client.

## Sources

Verified September 30, 2026 from official OpenAI documentation.

- [GPT-5.6 Sol, Terra, and Luna comparison](https://developers.openai.com/api/docs/models/gpt-4-and-gpt-4-turbo)
- [GPT-5.6 Terra model details and pricing](https://developers.openai.com/api/docs/models/gpt-5.6-terra)
- [Reasoning models guide](https://developers.openai.com/api/docs/guides/reasoning)
- [Codex models, selection, and reasoning efforts](https://learn.chatgpt.com/docs/models)
