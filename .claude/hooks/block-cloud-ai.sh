#!/usr/bin/env bash
# PreToolUse hook: block edits to src/ that add cloud AI SDKs or endpoints (AGENTS.md rule 1).
input=$(cat)
path=$(printf '%s' "$input" | grep -oE '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1)
printf "%s" "$path" | grep -qE '(^|[/\\"])src[/\]' || exit 0
pattern='(from|require\()[[:space:]]*[\\"'"'"']+(openai|@anthropic-ai|@google/generative-ai|@google/genai|@ai-sdk/|ai[\\"'"'"']|@mendable/firecrawl|cohere|groq)|api\.openai\.com|api\.anthropic\.com|generativelanguage\.googleapis|ai-gateway\.vercel|api\.firecrawl'
if printf '%s' "$input" | grep -qiE "$pattern"; then
  echo "Blocked: cloud AI SDK/endpoint in src/. AGENTS.md rule 1 - inference must run on device." >&2
  exit 2
fi
exit 0
