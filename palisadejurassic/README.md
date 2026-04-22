# OpenClaw × GEPA Self-Evolution Adapter

Evolve your OpenClaw SKILL.md files automatically using [GEPA](https://github.com/gepa-ai/gepa) — the same reflective prompt optimizer from the ICLR 2026 oral paper.

## Why Gemini's Version Was Wrong

| Problem | Gemini's approach | This adapter |
|---|---|---|
| **Execution command** | `ollama launch openclaw` — fabricated; Ollama runs LLMs, not agent frameworks | Uses `acpx openclaw exec` (headless ACP client) or the `openclaw` CLI with `--non-interactive` |
| **Optimizer** | Hand-rolled DSPy `ChainOfThought` loop | Uses the real `gepa.optimize()` with proper `GEPAAdapter` interface |
| **Pareto selection** | None — single candidate, binary pass/fail | Full Pareto frontier maintained by GEPA: best candidate *per task type*, merge proposals across complementary winners |
| **Trace quality** | Checks `"ERROR" in stderr` — nearly useless | Captures full session traces (tool calls, reasoning chains, timing) as Actionable Side Information (ASI) |
| **Scoring** | Binary 0.0 or 1.0 | Multi-dimensional: crash detection, timeout, per-criterion success/failure, penalty patterns — continuous [0,1] score |
| **Skill parsing** | Mentions "YAML frontmatter" but never parses it | Properly splits frontmatter (preserved) from body (evolved) using `pyyaml` |
| **Isolation** | Writes to a temp dir, never tests with a real workspace | Copies the full workspace (SOUL.md, AGENTS.md, memory, etc.) into an isolated sandbox per candidate |
| **Reflection** | Feeds raw error text back to the mutator | Builds a structured reflective dataset with input/output/feedback per criterion — what GEPA's reflector LLM actually needs |

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    GEPA Engine                       │
│  Pareto frontier · reflective mutation · merge       │
└────────────────────────┬────────────────────────────┘
                         │
                   GEPAAdapter
                   (this file)
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
    ┌──────────┐  ┌──────────┐  ┌──────────┐
    │ Sandbox 1│  │ Sandbox 2│  │ Sandbox N│   ← isolated workspaces
    │ (mutated │  │ (mutated │  │ (mutated │
    │  SKILL)  │  │  SKILL)  │  │  SKILL)  │
    └─────┬────┘  └─────┬────┘  └─────┬────┘
          │             │             │
          ▼             ▼             ▼
    ┌──────────────────────────────────────┐
    │     OpenClaw Gateway (running)       │
    │     acpx / CLI headless exec         │
    └──────────────────────────────────────┘
```

## Setup

```bash
# 1. Python deps
pip install gepa litellm pyyaml

# 2. OpenClaw must be installed and gateway running
npm install -g openclaw@latest
openclaw gateway start

# 3. (Recommended) Install acpx for better headless execution
npm install -g acpx@latest
```

## Usage

```bash
# Basic: evolve a skill with 80 rollouts
python openclaw_gepa_adapter.py \
  --skill ~/.openclaw/workspace/skills/web_researcher/SKILL.md \
  --tasks example_tasks.jsonl \
  --budget 80 \
  --model openai/gpt-4o

# Use Claude as the reflection LLM
python openclaw_gepa_adapter.py \
  --skill ~/.openclaw/workspace/skills/web_researcher/SKILL.md \
  --tasks example_tasks.jsonl \
  --budget 50 \
  --model anthropic/claude-sonnet-4-20250514

# Write output to a separate file (don't overwrite original)
python openclaw_gepa_adapter.py \
  --skill ~/.openclaw/workspace/skills/web_researcher/SKILL.md \
  --tasks example_tasks.jsonl \
  --output ./evolved_SKILL.md
```

## Writing Task Files

Each line in the JSONL file defines one evaluation task:

```json
{
  "prompt": "Find the top 3 AI news articles from today and summarize them",
  "success_criteria": ["summary", "article", "AI"],
  "failure_patterns": ["error", "I cannot", "I don't have"],
  "max_duration_s": 90
}
```

- **prompt**: What to ask the agent
- **success_criteria**: Substrings that should appear in the output (partial credit per criterion)
- **failure_patterns**: Substrings that indicate failure (score deductions)
- **max_duration_s**: Time budget before timeout penalty

For Pareto selection to work well, include diverse tasks that test different capabilities of the skill. A web_researcher skill should be tested on news lookup, factual queries, comparison research, and time-sensitive data.

## How It Works

1. **Parse**: Reads your SKILL.md, separates YAML frontmatter (preserved) from the markdown body (evolved)
2. **Sandbox**: For each candidate, copies your entire workspace into an isolated temp directory and swaps in the mutated SKILL.md
3. **Execute**: Runs each task via `acpx openclaw exec` (or CLI fallback) against the sandbox
4. **Score**: Multi-dimensional scoring with granular per-criterion feedback
5. **Reflect**: GEPA's reflection LLM reads the full session traces and proposes targeted edits
6. **Select**: Pareto frontier keeps the best candidate *per task type* — a skill that's great at news but bad at factual lookup competes with one that has the opposite profile
7. **Merge**: GEPA can combine two Pareto-optimal candidates that excel on different tasks
8. **Repeat**: Until the rollout budget is exhausted

## Adapting for Your Palisade Agents

Since you're running an 11-agent team on OpenClaw for Palisade, you could evolve each agent's skill independently:

```bash
# Evolve Agent 0 (orchestrator) with coordination-focused tasks
python openclaw_gepa_adapter.py \
  --skill ~/palisade/agents/agent0/skills/orchestrator/SKILL.md \
  --tasks tasks_orchestration.jsonl \
  --workspace ~/palisade/agents/agent0/workspace

# Evolve a build agent with compilation-focused tasks
python openclaw_gepa_adapter.py \
  --skill ~/palisade/agents/build/skills/chromium_build/SKILL.md \
  --tasks tasks_build.jsonl \
  --workspace ~/palisade/agents/build/workspace
```

Or evolve the SOUL.md itself by treating it as a "skill body" — GEPA doesn't care what text it's optimizing, as long as you can measure the result.
