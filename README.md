# mcp-openmockup

MCP server for [OpenMockup](https://openmockup.dev) — generate 3D device mockup images (iPhone, MacBook) from any AI agent.

No local OpenMockup install required. Rendering runs against `https://openmockup.dev`.

## Install

Add to your MCP config (`~/.cursor/mcp.json`, `~/.claude/.mcp.json`, etc.):

```json
{
  "mcpServers": {
    "mcp-openmockup": {
      "command": "npx",
      "args": ["-y", "mcp-openmockup"]
    }
  }
}
```

Requires [Node.js](https://nodejs.org/) 18+. On first render, Playwright downloads Chromium (~150 MB, one-time).

## Tools

### Render (no auth)

| Tool | Description |
|------|-------------|
| `render_mockup` | Single device mockup → PNG |
| `render_mockup_multi` | Multiple devices in one scene → PNG |

Pass `image_url` or `image_data` (base64). Optional: `device` (`phone`/`mac`), `device_color`, `bg_color`, `device_rotation`, `zoom`, `transparent`, `width`, `height`.

### Projects (optional auth)

| Tool | Description |
|------|-------------|
| `list_projects` | List saved projects |
| `get_project` | Get project by UUID |
| `create_project` | Create empty project |

Requires env vars:

```
OPENMOCKUP_EMAIL=
OPENMOCKUP_PASSWORD=
OPENMOCKUP_SUPABASE_URL=
OPENMOCKUP_SUPABASE_ANON_KEY=
```

## Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENMOCKUP_URL` | `https://openmockup.dev` | Override renderer URL |

## License

MIT
