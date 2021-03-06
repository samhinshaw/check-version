/**
 * Check Version Action for GitHub
 * https://github.com/marketplace/actions/check-version
 */

const path = require("path");
const cp = require("child_process");

// https://semver.org
const SEMVER_REGEX = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

// Input parameters. See action.yaml
const { INPUT_PATH, INPUT_TOKEN, INPUT_FORMAT } = process.env;

const event = require(process.env.GITHUB_EVENT_PATH);
const file = path.join(INPUT_PATH, "package.json");

// Fetch the base package.json file
// https://developer.github.com/v3/repos/contents/#get-contents
const res = cp.spawnSync("curl", [
  "--header",
  "Accept: application/vnd.github.v3.raw",
  "--header",
  `Authorization: token ${INPUT_TOKEN}`,
  `${event.repository.url}/contents/${file}?ref=${event.pull_request.base.sha}`,
]);

if (res.status != 0) {
  console.log(`::error ::${res.stderr.toString()}`);
  process.exit(res.status);
}

const base = JSON.parse(res.stdout.toString());
const head = require(path.resolve(process.cwd(), file));

console.log(`${base.name} v${base.version} => ${head.name} v${head.version}`);

if (base.name == head.name) {
  if (base.version === head.version) {
    console.log(`::error file=${file},line=3::Requires a new version number.`);
    process.exit(1);
  }

  const from = base.version.match(SEMVER_REGEX);
  const to = head.version.match(SEMVER_REGEX);

  if (
    Number(to[1]) < Number(from[1]) ||
    Number(to[2]) < Number(from[2]) ||
    Number(to[3]) < Number(from[3])
  ) {
    console.log(
      `::error file=${file},line=3::Requires a newer version number.`
    );
    process.exit(1);
  }
} else {
  console.log(`::warning file=${file},line=2::Package has a different name.`);
}

// Release name, e.g. "api_v1.0.0+build.345.zip"
const release = INPUT_FORMAT.replace(/\{pkg\}/gi, head.name)
  .replace(/\{name\}/gi, head.name)
  .replace(/\{version\}/gi, head.version)
  .replace(/\{pr\}/gi, event.pull_request.number)
  .replace(/\{pr_number\}/gi, event.pull_request.number);

// Set the action output values (name, version, release)
console.log(`::set-output name=name::${head.name}`);
console.log(`::set-output name=version::${head.version}`);
console.log(`::set-output name=release::${release}`);
