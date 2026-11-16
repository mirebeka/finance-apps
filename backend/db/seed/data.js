module.exports = {
  people: [
    "Alex Morgan", "Jamie Rivera", "Sam Patel", "Riley Chen", "Taylor Brooks", "Jordan Lee",
    "Casey Nguyen", "Morgan Fischer", "Avery Novak", "Quinn Larsen", "Drew Kowalski", "Robin Santos",
  ],
  projectManagers: ["Alex Morgan", "Jamie Rivera", "Sam Patel", "Riley Chen", "Taylor Brooks"],

  departments: [
    "General Ledger", "Financial Reporting", "Cash Operations", "Accounts Payable", "Accounts Receivable",
    "Fixed Assets", "Leases", "Tax", "FP&A", "Treasury", "Internal Audit", "Shared Services",
  ],
  tools: ["Python", "Power Automate", "UiPath", "Alteryx", "Excel VBA", "SQL", "Node.js"],

  processes: [
    "Bank reconciliation", "Intercompany matching", "Accrual posting", "Invoice intake", "Vendor master cleanup",
    "Month-end checklist", "FX revaluation", "Fixed asset roll-forward", "Lease schedule update", "Expense audit",
    "Journal upload", "Tax provision pack", "Budget variance report", "Payroll accrual", "Royalty statement import",
    "Cash forecast", "Aging report", "Credit memo matching", "PO accrual review", "Close calendar tracker",
  ],
  artifacts: ["robot", "report", "dashboard", "upload tool", "validation script", "notification flow"],
  runDates: ["Daily", "Weekly, Monday", "Monthly, WD1", "Monthly, WD3", "Monthly, WD5", "Quarterly", "On demand"],

  projectStatuses: [
    ["4 - Active", 46],
    ["3 - Testing", 8],
    ["2 - Scripting", 10],
    ["1 - Initiation/Planning", 8],
    ["E - To be fixed", 6],
    ["0 - On Hold", 6],
    ["R - Retired", 8],
  ],
  modificationStatuses: [
    ["3 - Finished", 40],
    ["2 - Testing", 12],
    ["1 - Scripting", 16],
    ["0 - Backlog", 14],
    ["H - On Hold", 8],
    ["N - Not Needed", 4],
  ],
  modificationNotes: [
    "Add support for a new legal entity",
    "Fix rounding issue in the summary tab",
    "Switch the data source to the new warehouse table",
    "Send a notification email when the run completes",
    "Handle missing values in the input file",
    "Extend the report with a prior-year comparison",
    "Improve runtime by batching the queries",
    "Add a manual override column",
  ],
  pendingOn: ["Business owner", "IT support", "Process owner", "Data team", "Vendor", null, null],

  vendors: [
    "Brightline Supplies", "Harborview Logistics", "Pinecrest Catering", "Northgate Equipment Rental",
    "Silverlake Post Production", "Cobalt Security Services", "Meridian Travel", "Evergreen Facilities",
    "Lumen Lighting & Grip", "Atlas Courier", "Bluebird Staffing", "Redwood Legal Services",
    "Summit Software Licensing", "Foxglove Creative Studio",
  ],
  orgElements: ["Studios", "Streaming", "Networks", "Corporate", "Consumer Products"],
  companyCodes: [1000, 2000, 3000, 4000],
  comments: [
    "Waiting for approval from budget owner",
    "Vendor confirmed new bank details",
    "Duplicate suspected, checking with AP",
    "Sent reminder to requester",
    "Missing PO reference",
    "Escalated to team lead",
  ],

  deals: {
    adjectives: ["Midnight", "Silent", "Golden", "Crimson", "Hidden", "Electric", "Paper", "Northern", "Velvet", "Last"],
    nouns: ["Harbor", "Orbit", "Garden", "Signal", "Archive", "Horizon", "Circuit", "Voyage", "Lantern", "Frontier"],
    kinds: ["Licensing", "Co-production", "Distribution", "Acquisition", "Post-production"],
    companies: ["Acme Pictures LLC", "Acme Television Inc", "Acme Streaming Ltd", "Acme Studios GmbH"],
    segments: ["Film", "Television", "Streaming", "Consumer Products"],
    locations: ["Los Angeles", "New York", "London", "Berlin"],
    teams: ["Content Finance", "Programming", "Rights & Royalties", "Legal Finance"],
    rtr: ["Alex Morgan", "Jamie Rivera", "Sam Patel", "Riley Chen", null],
    conversations: [
      "Waiting for signed contract from the counterparty.",
      "Budget code corrected, please re-review.",
      "Programming lead asked for the revised delivery schedule.",
      "Finance lead requested an updated cost breakdown.",
    ],
  },
};
