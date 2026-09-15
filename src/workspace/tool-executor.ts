import { execSync } from 'node:child_process';
import path from 'node:path';
import { workspaceTools } from './agent-tools.js';
import type { ToolDefinition, ToolResult, ToolCall } from '../providers/tools.js';
import { emitActivity } from './activity.js';
import { requirePermission } from '../permissions/manager.js';
import { conflictManager } from './conflict.js';
import { isGitRepo, getGitStatus, getGitDiff, getGitLog, gitBranch, gitCheckout, gitCommit } from '../git/client.js';
import { getGitHubToken } from '../github/auth.js';
import { parseRepoSlug, cloneRepo } from '../github/client.js';
import { messageBus } from '../collaboration/messageBus.js';
import { createTask, getTask, listTasks, delegateTask, requestReview } from '../tasks/manager.js';
import { findProjectRoot, readProjectConfig } from '../storage/project.js';

export const workspaceToolDefinitions: ToolDefinition[] = [
  // Workspace File Tools
  {
    name: 'list_files',
    description: 'List files and directories in the AgentMesh project workspace.',
    inputSchema: { type: 'object', properties: { path: { type: 'string', description: 'Relative directory path. Defaults to .' } } }
  },
  {
    name: 'read_file',
    description: 'Read a UTF-8 text file from the AgentMesh project workspace.',
    inputSchema: { type: 'object', properties: { path: { type: 'string', description: 'Relative path to file' } }, required: ['path'] }
  },
  {
    name: 'write_file',
    description: 'Create or replace a UTF-8 text file in the AgentMesh project workspace. Parent directories are created automatically.',
    inputSchema: { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' } }, required: ['path', 'content'] }
  },
  {
    name: 'create_file',
    description: 'Create a new text file in the AgentMesh project workspace. If content is omitted, an empty file is created.',
    inputSchema: { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' } }, required: ['path'] }
  },
  {
    name: 'mkdir',
    description: 'Create a directory in the AgentMesh project workspace.',
    inputSchema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] }
  },
  {
    name: 'delete_file',
    description: 'Delete a file or directory in the AgentMesh project workspace.',
    inputSchema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] }
  },
  {
    name: 'delete_path',
    description: 'Delete a file or directory inside the AgentMesh project workspace.',
    inputSchema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] }
  },
  {
    name: 'move_file',
    description: 'Move or rename a file or directory in the workspace.',
    inputSchema: { type: 'object', properties: { source: { type: 'string' }, destination: { type: 'string' } }, required: ['source', 'destination'] }
  },
  {
    name: 'search_files',
    description: 'Search for text across workspace files.',
    inputSchema: { type: 'object', properties: { query: { type: 'string' }, path: { type: 'string' } }, required: ['query'] }
  },

  // Git Tools
  {
    name: 'git_status',
    description: 'Get git status of the project workspace.',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'git_diff',
    description: 'Get git diff of the workspace changes.',
    inputSchema: { type: 'object', properties: { file: { type: 'string' }, cached: { type: 'boolean' } } }
  },
  {
    name: 'git_log',
    description: 'Get recent git commit history.',
    inputSchema: { type: 'object', properties: { limit: { type: 'number' } } }
  },
  {
    name: 'git_branch',
    description: 'List git branches or create a new branch.',
    inputSchema: { type: 'object', properties: { name: { type: 'string' } } }
  },
  {
    name: 'git_checkout',
    description: 'Checkout a git branch or commit. Set create=true to create a new branch.',
    inputSchema: { type: 'object', properties: { target: { type: 'string' }, create: { type: 'boolean' } }, required: ['target'] }
  },
  {
    name: 'git_commit',
    description: 'Commit changes to git.',
    inputSchema: { type: 'object', properties: { message: { type: 'string' }, files: { type: 'array', items: { type: 'string' } } }, required: ['message'] }
  },

  // Execution Tools
  {
    name: 'run_command',
    description: 'Run a shell command inside the project workspace directory.',
    inputSchema: { type: 'object', properties: { command: { type: 'string' } }, required: ['command'] }
  },
  {
    name: 'run_tests',
    description: 'Run project tests.',
    inputSchema: { type: 'object', properties: { testPath: { type: 'string' } } }
  },
  {
    name: 'run_build',
    description: 'Run project build command.',
    inputSchema: { type: 'object', properties: {} }
  },

  // Agent Coordination Tools
  {
    name: 'list_agents',
    description: 'List all connected agents in the project.',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'send_message',
    description: 'Send a message to another connected agent.',
    inputSchema: { type: 'object', properties: { to: { type: 'string' }, content: { type: 'string' } }, required: ['to', 'content'] }
  },
  {
    name: 'broadcast_message',
    description: 'Broadcast a message to all agents on the message bus.',
    inputSchema: { type: 'object', properties: { content: { type: 'string' } }, required: ['content'] }
  },
  {
    name: 'delegate_task',
    description: 'Delegate a task to another agent.',
    inputSchema: { type: 'object', properties: { to: { type: 'string' }, task: { type: 'string' }, description: { type: 'string' } }, required: ['to', 'task'] }
  },
  {
    name: 'get_task_status',
    description: 'Get current status of a task by its ID.',
    inputSchema: { type: 'object', properties: { taskId: { type: 'string' } }, required: ['taskId'] }
  },
  {
    name: 'request_review',
    description: 'Request a review from a reviewer agent for a task.',
    inputSchema: { type: 'object', properties: { taskId: { type: 'string' }, reviewer: { type: 'string' } }, required: ['taskId'] }
  },

  // GitHub Tools
  {
    name: 'github_list_repositories',
    description: 'List GitHub repositories for the authenticated user.',
    inputSchema: { type: 'object', properties: { limit: { type: 'number' } } }
  },
  {
    name: 'github_clone',
    description: 'Clone a GitHub repository.',
    inputSchema: { type: 'object', properties: { repo: { type: 'string' }, destination: { type: 'string' } }, required: ['repo'] }
  },
  {
    name: 'github_create_branch',
    description: 'Create a new branch in the current git repository.',
    inputSchema: { type: 'object', properties: { branch: { type: 'string' } }, required: ['branch'] }
  },
  {
    name: 'github_create_pull_request',
    description: 'Create a pull request on GitHub.',
    inputSchema: { type: 'object', properties: { repo: { type: 'string' }, title: { type: 'string' }, head: { type: 'string' }, base: { type: 'string' }, body: { type: 'string' } }, required: ['repo', 'title', 'head'] }
  },
  {
    name: 'github_create_issue',
    description: 'Create an issue on GitHub.',
    inputSchema: { type: 'object', properties: { repo: { type: 'string' }, title: { type: 'string' }, body: { type: 'string' } }, required: ['repo', 'title'] }
  },
  {
    name: 'github_get_issue',
    description: 'Get details for a GitHub issue.',
    inputSchema: { type: 'object', properties: { repo: { type: 'string' }, issueNumber: { type: 'number' } }, required: ['repo', 'issueNumber'] }
  },
  {
    name: 'github_get_pull_request',
    description: 'Get details for a GitHub pull request.',
    inputSchema: { type: 'object', properties: { repo: { type: 'string' }, pullNumber: { type: 'number' } }, required: ['repo', 'pullNumber'] }
  },
  {
    name: 'github_get_ci_status',
    description: 'Get CI workflow check status for a repo and ref.',
    inputSchema: { type: 'object', properties: { repo: { type: 'string' }, ref: { type: 'string' } }, required: ['repo'] }
  }
];

function stringArg(args: Record<string, unknown>, key: string, required = true): string {
  const value = args[key];
  if (typeof value !== 'string' || !value.trim()) {
    if (required) throw new Error(`Tool argument '${key}' must be a non-empty string.`);
    return '';
  }
  return value;
}

function syncGithubApi(endpoint: string, method = 'GET', body?: any): any {
  const current = getGitHubToken();
  if (!current) throw new Error('GitHub authentication required. Run `agentmesh github login`.');
  const token = current.token;
  const url = endpoint.startsWith('http') ? endpoint : `https://api.github.com${endpoint}`;
  
  const headers = [
    `-H "Authorization: Bearer ${token}"`,
    '-H "Accept: application/vnd.github+json"',
    '-H "User-Agent: AgentMesh-CLI"'
  ];

  let bodyArg = '';
  if (body) {
    headers.push('-H "Content-Type: application/json"');
    const escaped = JSON.stringify(body).replace(/'/g, "'\\''");
    bodyArg = `-d '${escaped}'`;
  }

  const cmd = `curl -s -X ${method} ${headers.join(' ')} ${bodyArg} "${url}"`;
  const raw = execSync(cmd, { encoding: 'utf8', timeout: 20000 });
  const parsed = JSON.parse(raw);
  if (parsed && typeof parsed === 'object' && parsed.message && !parsed.id && !parsed.number && !Array.isArray(parsed)) {
    throw new Error(`GitHub API error: ${parsed.message}`);
  }
  return parsed;
}

export interface ToolExecutionContext {
  agentId?: string;
  role?: string;
  taskId?: string;
}

export function executeWorkspaceTool(call: ToolCall, context?: ToolExecutionContext): ToolResult {
  emitActivity({
    kind: 'tool',
    message: `Running ${call.name}`,
    detail: typeof call.arguments.path === 'string'
      ? call.arguments.path
      : typeof call.arguments.command === 'string'
        ? call.arguments.command
        : undefined
  });

  const agentId = context?.agentId ?? 'agent';
  const role = context?.role;

  try {
    switch (call.name) {
      // --- Workspace File Tools ---
      case 'list_files': {
        if (context?.agentId) requirePermission(agentId, 'read', 'list_files', role);
        const p = typeof call.arguments.path === 'string' ? call.arguments.path : '.';
        return { toolCallId: call.id, content: JSON.stringify(workspaceTools.list(p)) };
      }

      case 'read_file': {
        if (context?.agentId) requirePermission(agentId, 'read', 'read_file', role);
        const p = stringArg(call.arguments, 'path');
        return { toolCallId: call.id, content: workspaceTools.read(p) };
      }

      case 'write_file':
      case 'create_file': {
        if (context?.agentId) requirePermission(agentId, 'write', call.name, role);
        const p = stringArg(call.arguments, 'path');
        const content = typeof call.arguments.content === 'string' ? call.arguments.content : '';
        const { hasConflict, conflict } = conflictManager.checkOrRecordWrite(agentId, p, content, context?.taskId);
        workspaceTools.write(p, content);
        const conflictNotice = hasConflict
          ? ` ⚠ Conflict detected: file was modified concurrently by ${conflict?.firstAgent}.`
          : '';
        return { toolCallId: call.id, content: `File written successfully.${conflictNotice}` };
      }

      case 'mkdir': {
        if (context?.agentId) requirePermission(agentId, 'write', 'mkdir', role);
        const p = stringArg(call.arguments, 'path');
        workspaceTools.mkdir(p);
        return { toolCallId: call.id, content: 'Directory created successfully.' };
      }

      case 'delete_file':
      case 'delete_path': {
        if (context?.agentId) requirePermission(agentId, 'write', call.name, role);
        const p = stringArg(call.arguments, 'path');
        workspaceTools.delete(p);
        return { toolCallId: call.id, content: 'Path deleted successfully.' };
      }

      case 'move_file': {
        if (context?.agentId) requirePermission(agentId, 'write', 'move_file', role);
        const src = stringArg(call.arguments, 'source');
        const dest = stringArg(call.arguments, 'destination');
        workspaceTools.move(src, dest);
        return { toolCallId: call.id, content: `Moved ${src} to ${dest}.` };
      }

      case 'search_files': {
        if (context?.agentId) requirePermission(agentId, 'read', 'search_files', role);
        const q = stringArg(call.arguments, 'query');
        const p = typeof call.arguments.path === 'string' ? call.arguments.path : '.';
        return { toolCallId: call.id, content: JSON.stringify(workspaceTools.search(q, p)) };
      }

      // --- Git Tools ---
      case 'git_status': {
        if (context?.agentId) requirePermission(agentId, 'git', 'git_status', role);
        const status = getGitStatus();
        return { toolCallId: call.id, content: JSON.stringify(status) };
      }

      case 'git_diff': {
        if (context?.agentId) requirePermission(agentId, 'git', 'git_diff', role);
        const diff = getGitDiff(process.cwd(), {
          file: typeof call.arguments.file === 'string' ? call.arguments.file : undefined,
          cached: Boolean(call.arguments.cached)
        });
        return { toolCallId: call.id, content: diff || 'No diff.' };
      }

      case 'git_log': {
        if (context?.agentId) requirePermission(agentId, 'git', 'git_log', role);
        const limit = typeof call.arguments.limit === 'number' ? call.arguments.limit : 5;
        const logs = getGitLog(process.cwd(), limit);
        return { toolCallId: call.id, content: JSON.stringify(logs) };
      }

      case 'git_branch': {
        if (context?.agentId) requirePermission(agentId, 'git', 'git_branch', role);
        const name = typeof call.arguments.name === 'string' ? call.arguments.name : undefined;
        return { toolCallId: call.id, content: gitBranch(process.cwd(), name) };
      }

      case 'git_checkout': {
        if (context?.agentId) requirePermission(agentId, 'git', 'git_checkout', role);
        const target = stringArg(call.arguments, 'target');
        const create = Boolean(call.arguments.create);
        return { toolCallId: call.id, content: gitCheckout(target, create, process.cwd()) };
      }

      case 'git_commit': {
        if (context?.agentId) requirePermission(agentId, 'git', 'git_commit', role);
        const msg = stringArg(call.arguments, 'message');
        const files = Array.isArray(call.arguments.files) ? call.arguments.files.map(String) : undefined;
        return { toolCallId: call.id, content: gitCommit(msg, files, process.cwd()) };
      }

      // --- Execution Tools ---
      case 'run_command': {
        if (context?.agentId) requirePermission(agentId, 'execute', 'run_command', role);
        const cmd = stringArg(call.arguments, 'command');
        const out = execSync(cmd, { encoding: 'utf8', timeout: 30000 });
        return { toolCallId: call.id, content: out || 'Command completed with no output.' };
      }

      case 'run_tests': {
        if (context?.agentId) requirePermission(agentId, 'execute', 'run_tests', role);
        const testPath = typeof call.arguments.testPath === 'string' ? call.arguments.testPath : '';
        const cmd = testPath ? `npm test -- ${testPath}` : 'npm test';
        const out = execSync(cmd, { encoding: 'utf8', timeout: 60000 });
        return { toolCallId: call.id, content: out || 'Tests completed.' };
      }

      case 'run_build': {
        if (context?.agentId) requirePermission(agentId, 'execute', 'run_build', role);
        const out = execSync('npm run build', { encoding: 'utf8', timeout: 60000 });
        return { toolCallId: call.id, content: out || 'Build completed successfully.' };
      }

      // --- Agent Coordination Tools ---
      case 'list_agents': {
        const root = findProjectRoot(process.cwd());
        const config = root ? readProjectConfig(root) : { agents: [] };
        return { toolCallId: call.id, content: JSON.stringify(config.agents) };
      }

      case 'send_message': {
        const to = stringArg(call.arguments, 'to');
        const content = stringArg(call.arguments, 'content');
        const msg = messageBus.sendMessage({ from: agentId, to, content, taskId: context?.taskId });
        return { toolCallId: call.id, content: `Message sent to ${to} (id: ${msg.id}).` };
      }

      case 'broadcast_message': {
        const content = stringArg(call.arguments, 'content');
        const msg = messageBus.broadcastMessage(agentId, content, context?.taskId);
        return { toolCallId: call.id, content: `Message broadcast to all agents (id: ${msg.id}).` };
      }

      case 'delegate_task': {
        const to = stringArg(call.arguments, 'to');
        const taskTitle = stringArg(call.arguments, 'task');
        const desc = typeof call.arguments.description === 'string' ? call.arguments.description : undefined;
        const task = delegateTask(agentId, to, taskTitle, desc);
        messageBus.sendMessage({
          from: agentId,
          to,
          type: 'task',
          content: `Task delegated: ${taskTitle}`,
          taskId: task.id
        });
        return { toolCallId: call.id, content: `Task delegated to ${to} with ID ${task.id}.` };
      }

      case 'get_task_status': {
        const taskId = stringArg(call.arguments, 'taskId');
        const task = getTask(taskId);
        if (!task) return { toolCallId: call.id, content: `Task not found: ${taskId}` };
        return { toolCallId: call.id, content: JSON.stringify(task) };
      }

      case 'request_review': {
        const taskId = stringArg(call.arguments, 'taskId');
        const reviewer = typeof call.arguments.reviewer === 'string' ? call.arguments.reviewer : 'reviewer';
        const task = requestReview(taskId, reviewer);
        messageBus.sendMessage({
          from: agentId,
          to: reviewer,
          type: 'review',
          content: `Review requested for task ${taskId}: ${task.title}`,
          taskId
        });
        return { toolCallId: call.id, content: `Review requested from ${reviewer} for task ${taskId}.` };
      }

      // --- GitHub Tools ---
      case 'github_list_repositories': {
        if (context?.agentId) requirePermission(agentId, 'github', 'github_list_repositories', role);
        const limit = typeof call.arguments.limit === 'number' ? call.arguments.limit : 10;
        const repos = syncGithubApi(`/user/repos?sort=updated&per_page=${limit}`);
        const simplified = (Array.isArray(repos) ? repos : []).map((r: any) => ({
          name: r.name,
          full_name: r.full_name,
          private: r.private,
          html_url: r.html_url
        }));
        return { toolCallId: call.id, content: JSON.stringify(simplified) };
      }

      case 'github_clone': {
        if (context?.agentId) requirePermission(agentId, 'github', 'github_clone', role);
        const repo = stringArg(call.arguments, 'repo');
        const dest = typeof call.arguments.destination === 'string' ? call.arguments.destination : undefined;
        const slug = parseRepoSlug(repo);
        const url = `https://github.com/${slug.owner}/${slug.repo}.git`;
        const out = cloneRepo(url, dest);
        return { toolCallId: call.id, content: `Cloned ${slug.owner}/${slug.repo}. ${out}` };
      }

      case 'github_create_branch': {
        if (context?.agentId) requirePermission(agentId, 'github', 'github_create_branch', role);
        const branch = stringArg(call.arguments, 'branch');
        return { toolCallId: call.id, content: gitCheckout(branch, true, process.cwd()) };
      }

      case 'github_create_pull_request': {
        if (context?.agentId) requirePermission(agentId, 'github', 'github_create_pull_request', role);
        const repo = stringArg(call.arguments, 'repo');
        const title = stringArg(call.arguments, 'title');
        const head = stringArg(call.arguments, 'head');
        const base = typeof call.arguments.base === 'string' ? call.arguments.base : 'main';
        const body = typeof call.arguments.body === 'string' ? call.arguments.body : '';
        const slug = parseRepoSlug(repo);
        const pr = syncGithubApi(`/repos/${slug.owner}/${slug.repo}/pulls`, 'POST', { title, head, base, body });
        return { toolCallId: call.id, content: `Pull request #${pr.number} created: ${pr.html_url}` };
      }

      case 'github_create_issue': {
        if (context?.agentId) requirePermission(agentId, 'github', 'github_create_issue', role);
        const repo = stringArg(call.arguments, 'repo');
        const title = stringArg(call.arguments, 'title');
        const body = typeof call.arguments.body === 'string' ? call.arguments.body : '';
        const slug = parseRepoSlug(repo);
        const issue = syncGithubApi(`/repos/${slug.owner}/${slug.repo}/issues`, 'POST', { title, body });
        return { toolCallId: call.id, content: `Issue #${issue.number} created: ${issue.html_url}` };
      }

      case 'github_get_issue': {
        if (context?.agentId) requirePermission(agentId, 'github', 'github_get_issue', role);
        const repo = stringArg(call.arguments, 'repo');
        const num = call.arguments.issueNumber;
        const slug = parseRepoSlug(repo);
        const issue = syncGithubApi(`/repos/${slug.owner}/${slug.repo}/issues/${num}`);
        return { toolCallId: call.id, content: JSON.stringify({ number: issue.number, title: issue.title, state: issue.state, body: issue.body }) };
      }

      case 'github_get_pull_request': {
        if (context?.agentId) requirePermission(agentId, 'github', 'github_get_pull_request', role);
        const repo = stringArg(call.arguments, 'repo');
        const num = call.arguments.pullNumber;
        const slug = parseRepoSlug(repo);
        const pr = syncGithubApi(`/repos/${slug.owner}/${slug.repo}/pulls/${num}`);
        return { toolCallId: call.id, content: JSON.stringify({ number: pr.number, title: pr.title, state: pr.state, head: pr.head?.ref, base: pr.base?.ref }) };
      }

      case 'github_get_ci_status': {
        if (context?.agentId) requirePermission(agentId, 'github', 'github_get_ci_status', role);
        const repo = stringArg(call.arguments, 'repo');
        const ref = typeof call.arguments.ref === 'string' ? call.arguments.ref : 'HEAD';
        const slug = parseRepoSlug(repo);
        const data = syncGithubApi(`/repos/${slug.owner}/${slug.repo}/commits/${ref}/check-runs`);
        return { toolCallId: call.id, content: JSON.stringify(data) };
      }

      default:
        throw new Error(`Unknown workspace tool: ${call.name}`);
    }
  } catch (error) {
    return { toolCallId: call.id, content: `Tool error: ${error instanceof Error ? error.message : String(error)}` };
  }
}
