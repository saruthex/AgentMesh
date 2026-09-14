import { workspaceTools } from './agent-tools.js';
import type { ToolDefinition, ToolResult, ToolCall } from '../providers/tools.js';
import { emitActivity } from './activity.js';

export const workspaceToolDefinitions: ToolDefinition[] = [
  {
    name: 'list_files',
    description: 'List files and directories in the AgentMesh project workspace.',
    inputSchema: { type: 'object', properties: { path: { type: 'string', description: 'Relative directory path. Defaults to .' } } }
  },
  {
    name: 'read_file',
    description: 'Read a UTF-8 text file from the AgentMesh project workspace.',
    inputSchema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] }
  },
  {
    name: 'write_file',
    description: 'Create or replace a UTF-8 text file in the AgentMesh project workspace. Parent directories are created automatically.',
    inputSchema: { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' } }, required: ['path', 'content'] }
  },
  {
    name: 'mkdir',
    description: 'Create a directory in the AgentMesh project workspace.',
    inputSchema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] }
  },
  {
    name: 'delete_path',
    description: 'Delete a file or directory inside the AgentMesh project workspace.',
    inputSchema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] }
  }
];

function stringArg(args: Record<string, unknown>, key: string): string {
  const value = args[key];
  if (typeof value !== 'string' || !value.trim()) throw new Error(`Tool argument '${key}' must be a non-empty string.`);
  return value;
}

export function executeWorkspaceTool(call: ToolCall): ToolResult {
  emitActivity({ kind: 'tool', message: `Running ${call.name}`, detail: typeof call.arguments.path === 'string' ? call.arguments.path : undefined });
  try {
    switch (call.name) {
      case 'list_files':
        return { toolCallId: call.id, content: JSON.stringify(workspaceTools.list(typeof call.arguments.path === 'string' ? call.arguments.path : '.')) };
      case 'read_file':
        return { toolCallId: call.id, content: workspaceTools.read(stringArg(call.arguments, 'path')) };
      case 'write_file':
        workspaceTools.write(stringArg(call.arguments, 'path'), typeof call.arguments.content === 'string' ? call.arguments.content : (() => { throw new Error("Tool argument 'content' must be a string."); })());
        return { toolCallId: call.id, content: 'File written successfully.' };
      case 'mkdir':
        workspaceTools.mkdir(stringArg(call.arguments, 'path'));
        return { toolCallId: call.id, content: 'Directory created successfully.' };
      case 'delete_path':
        workspaceTools.delete(stringArg(call.arguments, 'path'));
        return { toolCallId: call.id, content: 'Path deleted successfully.' };
      default:
        throw new Error(`Unknown workspace tool: ${call.name}`);
    }
  } catch (error) {
    return { toolCallId: call.id, content: `Tool error: ${error instanceof Error ? error.message : String(error)}` };
  }
}
