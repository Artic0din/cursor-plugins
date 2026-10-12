import assert from "node:assert/strict";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pluginRoot = resolve(root, "pstack");
const readJson = (path) => JSON.parse(readFileSync(resolve(root, path), "utf8"));
const cursor = readJson("pstack/.cursor-plugin/plugin.json");
for (const host of ["codex", "claude"]) {
  const manifest = readJson(`pstack/.${host}-plugin/plugin.json`);
  for (const key of ["name", "version", "description", "author", "license"]) {
    assert.deepEqual(manifest[key], cursor[key], `${host}: ${key} drift`);
  }
  assert(existsSync(resolve(pluginRoot, manifest.skills)), `${host}: skills missing`);
}
for (const path of [".agents/plugins/marketplace.json", ".claude-plugin/marketplace.json"]) {
  const entries = readJson(path).plugins.filter((entry) => entry.name === "pstack");
  assert.equal(entries.length, 1, `${path}: pstack must be listed once`);
  const source = typeof entries[0].source === "string" ? entries[0].source : entries[0].source.path;
  assert.equal(resolve(root, source), pluginRoot, `${path}: wrong source`);
}
const claudeAgents = readJson("pstack/.claude-plugin/plugin.json").agents;
for (const directory of ["agents", "claude-agents"]) {
  for (const name of readdirSync(resolve(pluginRoot, directory))) {
    if (name.endsWith(".md")) assert(claudeAgents.includes(`./${directory}/${name}`), `${name}: not registered for Claude`);
  }
}

function markdownFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === "node_modules") return [];
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? markdownFiles(path) : entry.name.endsWith(".md") ? [path] : [];
  });
}

const skills = readdirSync(resolve(pluginRoot, "skills"), { withFileTypes: true })
  .filter((entry) => entry.isDirectory());
for (const skill of skills) {
  const path = resolve(pluginRoot, "skills", skill.name, "SKILL.md");
  const body = readFileSync(path, "utf8");
  assert.equal(body.match(/^name: (.+)$/m)?.[1], skill.name, `${path}: invalid skill name`);
  assert.match(body, /^description: .+/m, `${path}: description missing`);
  if (/^disable-model-invocation: true$/m.test(body)) {
    const policy = readFileSync(resolve(dirname(path), "agents/openai.yaml"), "utf8");
    assert.match(policy, /^policy:\n  allow_implicit_invocation: false\s*$/, `${path}: explicit-only policy missing`);
  }
}
for (const path of markdownFiles(resolve(pluginRoot, "skills"))) {
  const body = readFileSync(path, "utf8");
  for (const match of body.matchAll(/\]\(([^\s)]+)\)/g)) {
    const target = match[1].split("#")[0];
    if (!target || /^(https?:|mailto:|\/)/.test(target) || target.includes("<")) continue;
    if (!target.includes("/") && !target.endsWith(".md")) continue;
    assert(existsSync(resolve(dirname(path), target)), `${path}: broken link ${target}`);
  }
  if (path.endsWith("SKILL.md") && /Task|pstack-models|\.cursor\/|Cursor's built-in/.test(body)) {
    assert.match(body, /\]\(.*runtime\.md\)/, `${path}: runtime reference missing`);
  }
}
const fixture = mkdtempSync(resolve(tmpdir(), "pstack-history-"));
try {
  const bin = resolve(fixture, "bin");
  const main = resolve(fixture, "main");
  const worker = resolve(fixture, "worker");
  const history = resolve(fixture, "history");
  for (const directory of [bin, main, worker, history]) mkdirSync(directory);
  const fakeGit = `#!/bin/sh
if [ "$1" = -C ]; then shift 2; fi
case "$1" in
  worktree) printf 'worktree ${main}\\n\\nworktree ${worker}\\n' ;;
  fetch|merge-base) exit 0 ;;
  rev-parse) printf '%040d\\n' 1 ;;
  log) echo 1 ;;
  status) exit 0 ;;
  symbolic-ref) echo feature ;;
  show-ref) exit 1 ;;
  *) echo "unexpected git call: $*" >&2; exit 2 ;;
esac
`;
  for (const [name, body] of [["git", fakeGit], ["gh", "#!/bin/sh\nprintf '[]\\n'\n"]]) {
    const path = resolve(bin, name);
    writeFileSync(path, body);
    chmodSync(path, 0o755);
  }
  for (const [transcripts, expected] of [["", "review-history"], [history, "safe"]]) {
    const output = execFileSync("bash", [resolve(pluginRoot, "skills/poteto-mode/scripts/worktree-audit.sh"), main], {
      encoding: "utf8",
      env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, PSTACK_TRANSCRIPTS_DIR: transcripts },
    });
    const row = output.trim().split("\n").find((line) => line.endsWith(`\t${worker}`));
    assert(row, "worktree audit did not return the fixture worker");
    assert.equal(row.split("\t")[7], expected, "worktree audit misclassified session history");
  }
} finally {
  rmSync(fixture, { recursive: true, force: true });
}
console.log(`pstack packaging, ${skills.length} skills, and history safety validated`);
