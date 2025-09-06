# MCP ast-grep Server

A Model Context Protocol (MCP) server that provides ast-grep integration for
Claude Code, enabling powerful structural code search and refactoring across
20+ programming languages.

## Features

- **AST-aware pattern matching**: Search and replace based on code structure, not just text
- **Multi-language support**: JavaScript, TypeScript, Python, Rust, Go, Java, C/C++, and more
- **Safe refactoring**: Dry-run mode by default for replacements
- **Flexible filtering**: Support for file globs and language-specific parsing
- **Rich output**: Contextual matches with diff previews for replacements

## Prerequisites

1. **Node.js** (>= 18.0.0)
2. **ast-grep CLI**: Install globally with `npm install -g @ast-grep/cli`
3. **Claude Code** with MCP support

## Installation

### Quick Install (Recommended)

Install both prerequisites and configure Claude Code in one go:

```bash
# Install ast-grep CLI
npm install -g @ast-grep/cli

# Clone and build the MCP server
git clone <repository-url>
cd mcp-ast-grep
npm install
npm run build

# Add to Claude Code using the MCP CLI tool
claude mcp install ast-grep node ./dist/index.js
```

### Manual Installation

#### Option 1: npm install (if published)

```bash
npm install -g mcp-ast-grep
claude mcp install ast-grep mcp-ast-grep
```

#### Option 2: Build from source

```bash
git clone <repository-url>
cd mcp-ast-grep
npm install
npm run build
```

## Configuration

### Using Claude MCP CLI (Recommended)

The easiest way to add this server to Claude Code is using the `claude mcp` CLI tool:

```bash
# Add the server (from built source)
claude mcp install ast-grep node /path/to/mcp-ast-grep/dist/index.js

# Or if installed globally
claude mcp install ast-grep mcp-ast-grep

# Verify installation
claude mcp list

# Remove if needed
claude mcp remove ast-grep
```

### Manual Configuration

If you prefer manual configuration, add the server to your Claude Code MCP settings:

#### macOS
`~/Library/Application Support/Claude/claude_desktop_config.json`

#### Windows
`%APPDATA%/Claude/claude_desktop_config.json`

#### Linux
`~/.config/claude/claude_desktop_config.json`

Add this configuration:

```json
{
  "mcpServers": {
    "ast-grep": {
      "command": "mcp-ast-grep",
      "args": []
    }
  }
}
```

Or if building from source:

```json
{
  "mcpServers": {
    "ast-grep": {
      "command": "node",
      "args": ["/path/to/mcp-ast-grep/dist/index.js"]
    }
  }
}
```

Restart Claude Code after adding the configuration.

## Usage

Once installed, Claude Code will have access to the `ast_grep` tool. Here are some examples:

### Basic Search

```typescript
// Find all console.log calls
ast_grep({
  pattern: "console.log($msg)"
})
```

### Search with File Filtering

```typescript
// Find console.log only in JavaScript files
ast_grep({
  pattern: "console.log($msg)",
  glob: "**/*.js",
  language: "javascript"
})
```

### Replace with Preview (Safe)

```typescript
// Preview replacing console.log with logger.info
ast_grep({
  pattern: "console.log($msg)",
  replacement: "logger.info($msg)",
  dry_run: true  // default
})
```

### Apply Changes

```typescript
// Actually apply the replacement
ast_grep({
  pattern: "console.log($msg)",
  replacement: "logger.info($msg)",
  dry_run: false
})
```

### Complex Patterns

```typescript
// Convert function declarations to arrow functions
ast_grep({
  pattern: "function $name($args) { $$$body }",
  replacement: "const $name = ($args) => { $$$body }",
  language: "javascript"
})
```

### Count Matches

```typescript
// Count occurrences
ast_grep({
  pattern: "console.log($msg)",
  mode: "count"
})
```

## Parameters

| Parameter | Type | Description | Required |
|-----------|------|-------------|----------|
| `pattern` | string | AST pattern to search for | ✅ |
| `replacement` | string | Replacement pattern (enables replace mode) | ❌ |
| `path` | string | File or directory to search (default: cwd) | ❌ |
| `glob` | string | File glob pattern (e.g., `**/*.js`) | ❌ |
| `language` | string | Target language for parsing | ❌ |
| `mode` | "search" \| "replace" \| "count" | Operation mode | ❌ |
| `context` | number | Lines of context around matches (0-20) | ❌ |
| `dry_run` | boolean | Preview mode (default: true for replacements) | ❌ |
| `head_limit` | number | Limit results to first N matches (1-1000) | ❌ |

## Supported Languages

JavaScript, TypeScript, Python, Rust, Go, Java, C, C++, C#, HTML, CSS, JSON, YAML, Bash, Lua, PHP, Ruby, Swift, Kotlin, Dart, Scala

## Pattern Syntax

ast-grep uses powerful pattern matching syntax:

- `$VAR` - matches any single AST node
- `$$$VAR` - matches multiple AST nodes (like function body)
- `console.log($msg)` - matches console.log with any argument
- `function $name($args) { $$$body }` - matches any function declaration

For more details, see the [ast-grep documentation](https://ast-grep.github.io/guide/pattern-syntax.html).

## Error Handling

The server provides helpful error messages for common issues:

- **ast-grep not found**: Install with `npm install -g @ast-grep/cli`
- **Invalid pattern**: Check ast-grep pattern syntax
- **File not found**: Verify the path parameter
- **Language not supported**: Use one of the supported languages listed above

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Troubleshooting

### Tool not appearing in Claude Code

1. Verify installation: `claude mcp list` (should show "ast-grep")
2. Check that ast-grep CLI is installed: `ast-grep --version`
3. Restart Claude Code after configuration changes
4. If using manual config, verify the JSON syntax is correct
5. Check Claude Code logs for MCP connection errors

### Using the claude mcp CLI

```bash
# List all installed MCP servers
claude mcp list

# Check if ast-grep is installed
claude mcp status ast-grep

# Reinstall if there are issues
claude mcp remove ast-grep
claude mcp install ast-grep node /path/to/mcp-ast-grep/dist/index.js

# View Claude Code MCP configuration
claude mcp config
```

### Permission errors

Make sure the server has read/write access to the target files and directories.

### Pattern not matching

- Verify the pattern syntax using ast-grep CLI directly
- Check that the correct language is specified
- Use the playground at https://ast-grep.github.io/playground.html

## License

MIT

## Contributing

Contributions welcome! Please open issues for bugs or feature requests.
