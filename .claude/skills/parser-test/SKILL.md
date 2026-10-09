---
name: parser-test
description: Run the 15 Taglish cases in tests/prompts.md against the rule parser (and LLM output if provided) and report pass/fail. Use after changing lib/parse or prompts.
---
1. Run `npx vitest run tests/parse.test.ts`.
2. Report a table: case #, request, expected vs actual for failing fields.
3. Pass target: rule parser ≥10/15, LLM ≥13/15 (TASKS.md #3, #8).
4. Fix the parser or prompt hints (SPEC.md §4.2) — never edit expected values in tests/prompts.md without asking the user.
