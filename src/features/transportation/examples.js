// Example prompts, one or more per tool the transport MCP server exposes
// (mr-mtd/springboot_MCP_server, TransportTools). The orchestrator discovers the
// tools at runtime; these just give visitors a starting point that exercises each.
// The seed data has loads LD-000001 to LD-002000 and carriers 1 to 50.
export const TRANSPORT_EXAMPLES = [
  { tag: 'getLoadStatus', text: 'What is the status of load LD-000420?' },
  { tag: 'getCarrierDetails', text: 'Show me carrier 7: safety rating, contact and on-time percentage.' },
  { tag: 'findDelayedShipments', text: 'Which loads from Texas are running more than 4 hours late?' },
  { tag: 'multi-tool', text: 'Find the most delayed shipment right now and tell me about its carrier.' },
]
