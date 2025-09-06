#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { execSync, spawnSync } from "child_process";
import { existsSync } from "fs";
import { resolve } from "path";

interface AstGrepParams {
  pattern: string;
  replacement?: string;
  path?: string;
  glob?: string;
  language?: string;
  mode?: "search" | "replace" | "count";
  context?: number;
  dry_run?: boolean;
  head_limit?: number;
}

const SUPPORTED_LANGUAGES = [
  "javascript", "typescript", "python", "rust", "go", "java", "c", "cpp", 
  "csharp", "html", "css", "json", "yaml", "bash", "lua", "php", "ruby", 
  "swift", "kotlin", "dart", "scala"
];

class AstGrepServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: "mcp-ast-grep",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "ast_grep",
          description: "A powerful AST-based code search and refactoring tool that understands code structure across 20+ programming languages. Performs syntax-aware pattern matching and transformations.",
          inputSchema: {
            type: "object",
            properties: {
              pattern: {
                type: "string",
                description: "AST pattern to search for using ast-grep syntax (e.g., 'console.log($MSG)', 'function $NAME($ARGS) { $$$BODY }')",
                minLength: 1,
              },
              replacement: {
                type: "string",
                description: "Replacement pattern (optional). If provided, performs replacement instead of search. Uses same variable syntax as pattern.",
              },
              path: {
                type: "string",
                description: "File or directory to search in. Defaults to current working directory.",
              },
              glob: {
                type: "string",
                description: "Glob pattern to filter files (e.g. '*.js', '**/*.{ts,tsx}')",
              },
              language: {
                type: "string",
                description: "Target language for parsing. Auto-detected if not specified.",
                enum: SUPPORTED_LANGUAGES,
              },
              mode: {
                type: "string",
                description: "Operation mode",
                enum: ["search", "replace", "count"],
                default: "search",
              },
              context: {
                type: "number",
                description: "Number of lines to show around matches (like grep -C)",
                minimum: 0,
                maximum: 20,
              },
              dry_run: {
                type: "boolean",
                description: "Preview changes without modifying files (default: true for replace mode)",
                default: true,
              },
              head_limit: {
                type: "number",
                description: "Limit output to first N matches",
                minimum: 1,
                maximum: 1000,
              },
            },
            required: ["pattern"],
            additionalProperties: false,
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (request.params.name !== "ast_grep") {
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${request.params.name}`);
      }

      const params = (request.params.arguments as unknown) as AstGrepParams;
      return await this.executeAstGrep(params);
    });
  }

  private async executeAstGrep(params: AstGrepParams) {
    try {
      // Validate parameters
      this.validateParams(params);

      // Check if ast-grep is available
      this.checkAstGrepAvailable();

      // Build command
      const command = this.buildCommand(params);

      // Execute command
      const result = spawnSync(command[0], command.slice(1), {
        encoding: "utf-8",
        maxBuffer: 10 * 1024 * 1024, // 10MB
        cwd: params.path && existsSync(params.path) ? resolve(params.path) : process.cwd(),
      });

      if (result.error) {
        throw new Error(`Failed to execute ${command[0]}: ${result.error.message}`);
      }

      if (result.status !== 0) {
        throw new Error(`ast-grep exited with code ${result.status}: ${result.stderr}`);
      }

      const output = result.stdout || "";

      return {
        content: [
          {
            type: "text",
            text: this.formatOutput(output, params),
          },
        ],
      };
    } catch (error) {
      if (error instanceof McpError) {
        throw error;
      }
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new McpError(ErrorCode.InternalError, `ast-grep execution failed: ${errorMessage}`);
    }
  }

  private validateParams(params: AstGrepParams) {
    if (!params.pattern || params.pattern.trim() === "") {
      throw new McpError(ErrorCode.InvalidParams, "Pattern is required and cannot be empty");
    }

    if (params.language && !SUPPORTED_LANGUAGES.includes(params.language)) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Language '${params.language}' not supported. Available: ${SUPPORTED_LANGUAGES.join(", ")}`
      );
    }

    if (params.context !== undefined && (params.context < 0 || params.context > 20)) {
      throw new McpError(ErrorCode.InvalidParams, "Context must be between 0 and 20");
    }

    if (params.head_limit !== undefined && (params.head_limit < 1 || params.head_limit > 1000)) {
      throw new McpError(ErrorCode.InvalidParams, "Head limit must be between 1 and 1000");
    }

    if (params.path && !existsSync(params.path)) {
      throw new McpError(ErrorCode.InvalidParams, `Path '${params.path}' does not exist`);
    }
  }

  private checkAstGrepAvailable() {
    try {
      execSync("ast-grep --version", { encoding: "utf-8" });
    } catch {
      throw new McpError(
        ErrorCode.InternalError,
        "ast-grep binary not found. Please install: npm install -g @ast-grep/cli"
      );
    }
  }

  private buildCommand(params: AstGrepParams): string[] {
    const cmd = ["ast-grep"];

    // Determine mode
    const mode = params.replacement ? "replace" : (params.mode || "search");

    if (mode === "replace") {
      cmd.push("-p", params.pattern, "-r", params.replacement!);
      if (!params.dry_run) {
        cmd.push("--update-all");
      }
    } else {
      cmd.push("-p", params.pattern);
    }

    // File filtering
    if (params.glob) {
      cmd.push("--globs", params.glob);
    }
    if (params.language) {
      cmd.push("-l", params.language);
    }

    // Output options
    if (params.context !== undefined) {
      cmd.push("-C", params.context.toString());
    }
    if (params.head_limit !== undefined) {
      cmd.push("--max-count", params.head_limit.toString());
    }

    // Count mode
    if (mode === "count") {
      cmd.push("-c");
    }

    // Add path if specified
    if (params.path) {
      cmd.push(params.path);
    }

    return cmd;
  }

  private formatOutput(output: string, params: AstGrepParams): string {
    const mode = params.replacement ? "replace" : (params.mode || "search");
    
    if (!output.trim()) {
      return mode === "search" ? "No matches found" : "No changes made";
    }

    // Add helpful header based on mode
    let formatted = "";
    
    if (mode === "replace") {
      if (params.dry_run !== false) {
        formatted += "Preview of changes (dry run mode):\n\n";
      } else {
        formatted += "Applied changes:\n\n";
      }
    } else if (mode === "count") {
      formatted += "Match counts:\n\n";
    }

    formatted += output;

    // Add summary footer for replace operations
    if (mode === "replace" && output.includes("@@")) {
      const diffBlocks = (output.match(/@@/g) || []).length / 2;
      formatted += `\n\n${params.dry_run !== false ? "Would apply" : "Applied"} changes in ${diffBlocks} location(s)`;
    }

    return formatted;
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }
}

// Start the server
const server = new AstGrepServer();
server.run().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});