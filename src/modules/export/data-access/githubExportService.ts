import type { GithubTreeItem } from "../model";
import { Octokit } from "@octokit/rest";

type OctokitInstance = InstanceType<typeof Octokit>;

const ghOwner = process.env.GITHUB_EXPORT_OWNER ?? "globalbibletools";
const ghRepo = process.env.GITHUB_EXPORT_REPO ?? "data";
const ghBranch = process.env.GITHUB_EXPORT_BRANCH ?? "main";

let client: OctokitInstance | undefined;
function getClient(): OctokitInstance {
  if (client) return client;

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error("GITHUB_TOKEN env var missing");
  }

  client = new Octokit({ auth: token });
  return client;
}

async function createBlob({
  content,
  path,
}: {
  content: string;
  path: string;
}): Promise<GithubTreeItem> {
  const client = getClient();

  const result = await client.git.createBlob({
    owner: ghOwner,
    repo: ghRepo,
    content,
    encoding: "utf-8",
  });

  return {
    path,
    mode: "100644",
    type: "blob",
    sha: result.data.sha,
  };
}

async function createCommit({
  items,
  message,
}: {
  items: GithubTreeItem[];
  message: string;
}): Promise<void> {
  const client = getClient();

  const baseTreeResult = await client.git.getTree({
    owner: ghOwner,
    repo: ghRepo,
    tree_sha: ghBranch,
  });

  const treeResult = await client.git.createTree({
    owner: ghOwner,
    repo: ghRepo,
    base_tree: baseTreeResult.data.sha,
    tree: items,
  });

  const parentResult = await client.git.getRef({
    owner: ghOwner,
    repo: ghRepo,
    ref: `heads/${ghBranch}`,
  });

  const commitResult = await client.git.createCommit({
    owner: ghOwner,
    repo: ghRepo,
    tree: treeResult.data.sha,
    message,
    parents: [parentResult.data.object.sha],
  });

  await client.git.updateRef({
    owner: ghOwner,
    repo: ghRepo,
    ref: `heads/${ghBranch}`,
    sha: commitResult.data.sha,
  });
}

export const githubExportService = {
  createBlob,
  createCommit,
};
