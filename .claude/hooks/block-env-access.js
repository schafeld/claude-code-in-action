#!/usr/bin/env node
// .claude/hooks/block-env-access.js
//
// PreToolUse hook: denies any tool call that would expose a .env file
// to Claude or any AI agent (Read, Write, Edit, Bash, Grep, Glob, etc.).
//
// Covered patterns:
//   - file_path ending in .env, .env.local, .env.*, etc.
//   - Bash commands referencing .env files (cat, source, echo, etc.)
//   - Grep/Glob paths or patterns pointing at a .env file

const ENV_PATH_RE = /(^|\/)\.env(\.[^/]*)?$/;
const ENV_BASH_RE = /(^|[\s/])\.env([^a-zA-Z0-9_]|$)/;

function deny(reason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: reason,
      },
    })
  );
  process.exit(0);
}

async function main() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const input = JSON.parse(Buffer.concat(chunks).toString("utf8"));

  const { tool_name, tool_input = {} } = input;
  const { file_path, command, path, pattern } = tool_input;

  // 1. File-path tools: Read, Write, Edit
  if (file_path && ENV_PATH_RE.test(file_path)) {
    deny(`Access to .env files is blocked by security policy. File: ${file_path}`);
  }

  // 2. Bash commands
  if (tool_name === "Bash" && command && ENV_BASH_RE.test(command)) {
    deny("Bash commands referencing .env files are blocked by security policy.");
  }

  // 3. Grep / Glob path argument
  if (path && ENV_PATH_RE.test(path)) {
    deny("Grep/Glob access to .env files is blocked by security policy.");
  }

  // 4. Glob pattern explicitly targeting .env files
  if (pattern && /\.env/.test(pattern)) {
    deny("Glob patterns targeting .env files are blocked by security policy.");
  }

  process.exit(0);
}

main();
