#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { renderMockup, renderMockupMulti } from './render.js'
import { listProjects, getProject, createProject } from './projects.js'

const server = new Server(
  { name: 'mcp-openmockup', version: '0.1.0' },
  { capabilities: { tools: {} } },
)

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'render_mockup',
      description:
        'Render a 3D device mockup image (iPhone or MacBook) with a screenshot on the screen. Returns a PNG image. No auth required.',
      inputSchema: {
        type: 'object',
        properties: {
          image_url: {
            type: 'string',
            description: 'Public URL of the screenshot to display on the device screen',
          },
          image_data: {
            type: 'string',
            description: 'Base64-encoded image (PNG or JPEG). Use this OR image_url.',
          },
          device: {
            type: 'string',
            enum: ['phone', 'mac'],
            default: 'phone',
            description: 'Device type: iPhone (phone) or MacBook (mac)',
          },
          device_color: {
            type: 'string',
            description:
              'Hex color for the device frame. iPhone 17 colors: #DFCEEA (Lavender), #96AED1 (Mist Blue), #A9B689 (Sage), #353839 (Black), #F5F5F5 (White). iPhone 17 Pro: #32374A (Deep Blue), #F77E2D (Cosmic Orange), #F5F5F5 (Silver).',
          },
          bg_color: {
            type: 'string',
            description:
              'Background color (hex) or CSS gradient. E.g. "#0a0a0a", "#ffffff", "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"',
          },
          device_rotation: {
            type: 'array',
            items: { type: 'number' },
            minItems: 3,
            maxItems: 3,
            description:
              '[x, y, z] rotation in radians. E.g. [0, 0.3, 0] for a slight Y-axis rotation.',
          },
          zoom: {
            type: 'number',
            description: 'Camera zoom. 1 = default, >1 = closer, <1 = wider. Range 0.3–3.',
          },
          camera_offset_x: {
            type: 'number',
            description: 'Horizontal camera offset. Negative moves camera left (shows more right edge).',
          },
          camera_offset_y: {
            type: 'number',
            description: 'Vertical camera offset. Negative = lower camera (hero/contrapicado angle).',
          },
          camera_roll: {
            type: 'number',
            description: 'Camera roll in radians. 0 = upright, 1.5708 ≈ 90°.',
          },
          camera_preset: {
            type: 'string',
            enum: ['front', 'hero', 'dramatic', 'topdown'],
            description:
              'Built-in camera view. front = straight-on; hero = slight tilt; dramatic = strong angle with roll; topdown = high lean. Easier than manual zoom/offsets.',
          },
          transparent: {
            type: 'boolean',
            description: 'Render with transparent background (alpha PNG). Ignores bg_color.',
          },
          width: {
            type: 'number',
            description: 'Output PNG width in pixels. Default: 1440.',
          },
          height: {
            type: 'number',
            description: 'Output PNG height in pixels. Default: 2880.',
          },
        },
      },
    },
    {
      name: 'render_mockup_multi',
      description:
        'Render a scene with multiple 3D device mockups side by side. Returns a PNG image. No auth required.',
      inputSchema: {
        type: 'object',
        required: ['devices'],
        properties: {
          devices: {
            type: 'array',
            description: 'List of devices to include in the scene (1–4 recommended)',
            items: {
              type: 'object',
              properties: {
                image_url: {
                  type: 'string',
                  description: 'Public URL of the screenshot for this device',
                },
                image_data: {
                  type: 'string',
                  description: 'Base64 image data for this device',
                },
                kind: {
                  type: 'string',
                  enum: ['phone', 'mac'],
                  default: 'phone',
                },
                device_color: { type: 'string', description: 'Hex frame color' },
                device_rotation: {
                  type: 'array',
                  items: { type: 'number' },
                  minItems: 3,
                  maxItems: 3,
                  description: '[x, y, z] in radians',
                },
                position_x: {
                  type: 'number',
                  description:
                    'Horizontal position in scene units. 0 = center, ±14 = adjacent devices.',
                },
                position_y: {
                  type: 'number',
                  description: 'Vertical position in scene units.',
                },
              },
            },
          },
          bg_color: {
            type: 'string',
            description: 'Background color or CSS gradient',
          },
          zoom: {
            type: 'number',
            description: 'Camera zoom (0.3–3)',
          },
          camera_roll: {
            type: 'number',
            description: 'Camera roll in radians',
          },
          camera_preset: {
            type: 'string',
            enum: ['front', 'hero', 'dramatic', 'topdown'],
            description: 'Built-in camera view (front, hero, dramatic, topdown)',
          },
          transparent: {
            type: 'boolean',
            description: 'Transparent background PNG',
          },
          width: {
            type: 'number',
            description: 'Output PNG width in pixels. Default: 2880.',
          },
          height: {
            type: 'number',
            description: 'Output PNG height in pixels. Default: 2880.',
          },
        },
      },
    },
    {
      name: 'list_projects',
      description:
        'List your saved OpenMockup projects. Requires OPENMOCKUP_EMAIL, OPENMOCKUP_PASSWORD, OPENMOCKUP_SUPABASE_URL, and OPENMOCKUP_SUPABASE_ANON_KEY env vars.',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'get_project',
      description: 'Get a specific OpenMockup project and its full scene snapshot by ID.',
      inputSchema: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', description: 'Project UUID' },
        },
      },
    },
    {
      name: 'create_project',
      description: 'Create a new empty OpenMockup project.',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Project name' },
        },
      },
    },
  ],
}))

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params

  try {
    switch (name) {
      case 'render_mockup':
        return await renderMockup(args as any)
      case 'render_mockup_multi':
        return await renderMockupMulti(args as any)
      case 'list_projects':
        return await listProjects()
      case 'get_project':
        return await getProject(args as { id: string })
      case 'create_project':
        return await createProject(args as { name?: string })
      default:
        throw new Error(`Unknown tool: ${name}`)
    }
  } catch (err) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${err instanceof Error ? err.message : String(err)}`,
        },
      ],
      isError: true,
    }
  }
})

const transport = new StdioServerTransport()
await server.connect(transport)
