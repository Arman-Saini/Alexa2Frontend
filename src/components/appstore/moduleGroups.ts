import type { AppStoreModule } from '../../api/appStoreApi';

export interface AppStoreItem {
  id: string;
  name: string;
  category: 'memory' | 'app' | 'agentic';
  description: string;
  status: 'live' | 'concept';
  author: string;
  capabilities: string[];
  rules: string[];
}

export const MEMORY_MODULES: AppStoreItem[] = [
  {
    id: 'semantic-cache',
    name: 'Semantic Cache',
    category: 'memory',
    description: 'Intercepts repeating user commands locally in <10ms to save Bedrock invocation costs and maximize response speed.',
    status: 'live',
    author: 'Hearth Core',
    capabilities: ['Sub-10ms Command Interception', 'Ember Vector Database Search', 'Offline Similarity Matching'],
    rules: ['Local matching of identical voice triggers', 'Automatic cache invalidation on manual state overrides'],
  },
  {
    id: 'knowledge-packs',
    name: 'Knowledge Packs',
    category: 'memory',
    description: 'Structured RAG embeddings containing home layouts, user preferences, and custom device rules.',
    status: 'live',
    author: 'Hearth Core',
    capabilities: ['Structured RAG Embeddings', 'Dynamic Room Bounding Ingestion', 'Hardware Layout Synchronization'],
    rules: ['Room context injection into planning pipeline', 'User routine preferences mapping'],
  },
  {
    id: 'rule-miner',
    name: 'Rule Miner',
    category: 'memory',
    description: 'Autonomously discovers recurring patterns in sensor streams and proposes T0 automation rules for confirmation.',
    status: 'live',
    author: 'Hearth Core',
    capabilities: ['Sensor Stream Association Learning', 'T0 Rule Recommendation Engine', 'Conflict Resolution Analysis'],
    rules: ['Identify persistent heating anomalies', 'Suggest night safety optimizations'],
  },
];

export const AGENTIC_MODULES: AppStoreItem[] = [
  {
    id: 'bedrock-supervisor',
    name: 'Bedrock Supervisor',
    category: 'agentic',
    description: 'Top-level orchestrator that receives home event anomalies and dispatches specific tool calls or specialists.',
    status: 'live',
    author: 'AWS Bedrock Client',
    capabilities: ['Multi-agent Dispatching', 'LLM Planning Supervisor', 'Cost-minimizing Logic Routing'],
    rules: ['Escalate unresolved local T1 failures to T3', 'Coordinate multi-room event streams'],
  },
  {
    id: 'scenario-builder',
    name: 'Scenario Builder',
    category: 'agentic',
    description: 'Generates step-by-step logic plans and explanations explaining how the home resolved complex requests.',
    status: 'live',
    author: 'AWS Bedrock Client',
    capabilities: ['Step Diagram Generator', 'Action Explanation Compiler', 'Validation Logic Engine'],
    rules: ['Compile visual execution steps for complex tasks', 'Formulate textual user-facing trace explanations'],
  },
];

export const MOCK_APPS: AppStoreItem[] = [
  {
    id: 'zomato',
    name: 'Zomato Food Delivery',
    category: 'app',
    description: 'Reorder a regular dish the moment the kitchen sensor notices the fridge is running low — concept only, no backend behind this card.',
    status: 'concept',
    author: 'Concept App',
    capabilities: ['Automated Grocery Dispatching', 'Low Stock Trigger Processing', 'User Preference Matching'],
    rules: ['Order fresh groceries when fridge inventory drops below 15%'],
  },
  {
    id: 'swiggy',
    name: 'Swiggy Instamart',
    category: 'app',
    description: 'Grocery top-ups triggered from the same pantry signals Bookkeeper already reads — same MCP Server shape, not wired up yet.',
    status: 'concept',
    author: 'Concept App',
    capabilities: ['Instamart Dispatch Automation', 'Kitchen Pantry Syncing', 'Fast Delivery Coordination'],
    rules: ['Shed milk delivery tasks to Swiggy if local dhobi/milk ledger is empty'],
  },
  {
    id: 'urban-company',
    name: 'Urban Company',
    category: 'app',
    description: 'Book a technician the moment a device reports a fault state, instead of a person noticing days later.',
    status: 'concept',
    author: 'Concept App',
    capabilities: ['Automatic Fault Code Parsing', 'Vendor Dispatch Orchestration', 'Calendar Syncing'],
    rules: ['Book a technician on hot geyser temperature critical faults'],
  },
  {
    id: 'ecobee',
    name: 'Ecobee HVAC Sync',
    category: 'app',
    description: 'Mirror the smart thermostat schedule from this twin onto a real HVAC controller.',
    status: 'concept',
    author: 'Concept App',
    capabilities: ['External API Synchronization', 'Thermostat Mirroring', 'Energy Saving Scheduling'],
    rules: ['Sync AC setpoint limits on power cut events'],
  },
];

export function getAppModules(realModules: AppStoreModule[]): AppStoreItem[] {
  const normalizedReal: AppStoreItem[] = realModules.map((m) => ({
    id: m.module_id,
    name: m.name,
    category: 'app',
    description: m.description || `${m.device_type} integration for ${m.brand ?? 'connected'} devices.`,
    status: 'live',
    author: m.verified ? `Verified · ${m.author}` : m.author,
    capabilities: [
      `${m.device_type} State Tracking`,
      `Local MQTT Broker Integration`,
      `${m.brand ?? 'Standard'} API Control`
    ],
    rules: [
      `Register automation rules for ${m.device_type}`,
      `Track device power safety states`
    ]
  }));

  const hasBookkeeper = normalizedReal.some((m) => m.id === 'bookkeeper' || m.id === 'bookkeeper-ledger');
  const bookkeeperList: AppStoreItem[] = hasBookkeeper
    ? []
    : [
        {
          id: 'bookkeeper',
          name: 'Bookkeeper Ledger',
          category: 'app',
          description:
            'Real-time ledger tracking Indian smart home expenses (dhobi, milk, papers). Speaks MCP to settle accounts.',
          status: 'live',
          author: 'Hearth Certified',
          capabilities: ['Dhobi and Milk Expense Tracking', 'Web3 Account Settlement', 'Direct Agentic Accounting Interface'],
          rules: ['Record milk quantity and cost in the local ledger daily', 'Audit ledger records automatically weekly'],
        },
      ];

  return [...bookkeeperList, ...normalizedReal, ...MOCK_APPS];
}
