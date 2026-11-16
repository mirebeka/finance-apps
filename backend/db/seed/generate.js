const bcrypt = require("bcryptjs");
const d = require("./data");

function makeRng(seed) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min, max) => Math.floor(next() * (max - min + 1)) + min,
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    chance: (p) => next() < p,
    weighted: (pairs) => {
      const total = pairs.reduce((s, [, w]) => s + w, 0);
      let r = next() * total;
      for (const [v, w] of pairs) {
        if ((r -= w) <= 0) return v;
      }
      return pairs[pairs.length - 1][0];
    },
    sample: (arr, n) => {
      const copy = [...arr];
      const out = [];
      while (out.length < n && copy.length) out.push(copy.splice(Math.floor(next() * copy.length), 1)[0]);
      return out;
    },
  };
}

const iso = (dt) => dt.toISOString().slice(0, 10);
const addDays = (dt, n) => new Date(dt.getTime() + n * 86400000);
const startOfDay = (dt) => new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()));
const monthKey = (dt) => iso(dt).slice(0, 7);
const addMonths = (dt, n) => new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth() + n, Math.min(dt.getUTCDate(), 28)));
const round2 = (n) => Math.round(n * 100) / 100;

async function generateSpo(rng, today) {
  const demoPassword = "DemoPass123!";
  const hash = await bcrypt.hash(demoPassword, 10);

  const users = [
    { USERNAME: "Demo Admin", EMAIL: "admin@example.com", USER_PASSWORD: hash, ROLE: "admin", IS_ACTIVE: true, PASSWORD_NOT_YET_CHANGED: false },
    { USERNAME: "Demo User", EMAIL: "user@example.com", USER_PASSWORD: hash, ROLE: "user", IS_ACTIVE: true, PASSWORD_NOT_YET_CHANGED: false },
    { USERNAME: "New Joiner", EMAIL: "newuser@example.com", USER_PASSWORD: await bcrypt.hash("temporary-" + rng.int(1000, 9999), 10), ROLE: "user", IS_ACTIVE: true, PASSWORD_NOT_YET_CHANGED: true },
  ];

  const fx = { USD: 1, EUR: 1.08, GBP: 1.27 };
  const clerks = d.people.slice(0, 5);
  const rows = [];
  const supplierCodes = new Map(d.vendors.map((v, i) => [v, `S${10001 + i * 7}`]));
  const MONTHS = 8;

  for (let m = MONTHS - 1; m >= 0; m--) {
    const monthStart = addMonths(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)), -m);
    const stmtMonth = monthKey(monthStart);
    const count = rng.int(38, 52);

    for (let i = 0; i < count; i++) {
      const vendor = rng.pick(d.vendors);
      const currency = rng.weighted([["USD", 70], ["EUR", 20], ["GBP", 10]]);
      const total = round2(Math.exp(rng.next() * 5.5 + 5.2));
      let invoiceDate = addDays(monthStart, rng.int(0, 27));
      if (invoiceDate > today) invoiceDate = addDays(today, -rng.int(0, 5));
      const terms = rng.pick([30, 30, 45, 60]);
      const missingDue = rng.chance(0.03);
      const dueDate = addDays(invoiceDate, terms);

      let paymentDate = null;
      const age = (today - dueDate) / 86400000;
      const paidProbability = age > 60 ? 0.9 : age > 0 ? 0.55 : 0.2;
      if (!missingDue && rng.chance(paidProbability)) {
        const delay = rng.weighted([[rng.int(-10, 0), 58], [rng.int(1, 30), 24], [rng.int(31, 60), 12], [rng.int(61, 120), 6]]);
        const candidate = addDays(dueDate, delay);
        if (candidate <= today) paymentDate = candidate;
      }

      const inSap = rng.chance(0.85) ? "YES" : "NO";
      let isIt0 = rng.weighted([["Yes", 55], ["No", 20], ["CR", 10], ["", 15]]);
      if (paymentDate) isIt0 = "Yes";
      const downloaded = isIt0 === "No" || isIt0 === "CR" || paymentDate;

      rows.push({
        ROW_ID: 0,
        STATEMENT_NAME: `${vendor} statement ${stmtMonth}`,
        STATEMENT_MONTH: stmtMonth,
        SCANNING_DATE: iso(addDays(invoiceDate, rng.int(1, 6))),
        VENDOR: vendor,
        SUPPLIER_CODE: supplierCodes.get(vendor),
        COMPANY_CODE: rng.pick(d.companyCodes),
        INVOICE_NUMBER: `INV-${stmtMonth.replace("-", "")}-${String(rng.int(1, 9999)).padStart(4, "0")}`,
        INVOICE_DATE: iso(invoiceDate),
        POSTING_DATE: iso(addDays(invoiceDate, rng.int(2, 9))),
        DUE_DATE: iso(dueDate),
        PAYMENT_DUE_DATE: missingDue ? null : iso(dueDate),
        PAYMENT_DATE: paymentDate ? iso(paymentDate) : null,
        DOWNLOAD_DATE: downloaded ? iso(addDays(invoiceDate, rng.int(3, 12))) : null,
        AVAILABILITY_DATE: iso(addDays(invoiceDate, rng.int(1, 4))),
        IS_IT_IN_SAP: inSap,
        IS_IT_0: isIt0,
        IS_IT_PAID_IN_SAP: paymentDate ? "YES" : "NO",
        INVOICE_TOTAL: total,
        GROSS_TOTAL: round2(total * 1.07),
        GROSS_TOTAL_USD: round2(total * 1.07 * fx[currency]),
        CURRENCY_CODE: currency,
        ORGANIZATION_ELEMENT_NAME: rng.pick(d.orgElements),
        AP_CLERK: rng.pick(clerks),
        PENDING_TIME: paymentDate ? "" : `${Math.max(0, Math.round((today - invoiceDate) / 86400000))} days`,
        LATEST_COMMENT: rng.chance(0.25) ? rng.pick(d.comments) : null,
        SUB_STATUS: rng.pick(["Received", "In review", "Approved", "Posted"]),
        ACCOUNT: String(rng.int(400000, 499999)),
        NOTICE: null,
        LAST_MODIFIED_BY: null,
        LAST_MODIFIED_AT: null,
      });
    }
  }

  rows.forEach((r, i) => (r.ROW_ID = i + 1));
  return { SPO_USERS: users, SPO_DATABASE: rows };
}

function generateSkynet(rng, today) {
  const SKIPPED_IDS = new Set([7, 23]);
  const projects = [];
  const total = 60;
  let id = 0;
  const usedTitles = new Set();

  while (projects.length < total) {
    id++;
    if (SKIPPED_IDS.has(id)) continue;

    const status = rng.weighted(d.projectStatuses);
    const process = rng.pick(d.processes);
    const title = `${process} ${rng.pick(d.artifacts)}`;
    if (usedTitles.has(title)) continue;
    usedTitles.add(title);
    const planned = addDays(today, rng.int(-420, 60));
    const live = status === "4 - Active" || status === "R - Retired" || status === "E - To be fixed";
    const actual = live ? addDays(planned, rng.int(-10, 25)) : null;
    const devs = rng.sample(d.people, rng.weighted([[1, 70], [2, 25], [3, 5]]));

    projects.push({
      UNIQUE_ID: id,
      TITLE: title,
      PLANNED_GO_LIVE_DATE: iso(planned),
      ACTUAL_GO_LIVE_DATE: actual ? iso(actual) : null,
      STATUS: status,
      SAVING_HOUR: String(rng.int(2, 120)),
      FREQUENCY_PER_YEAR: String(rng.pick([1, 4, 12, 12, 24, 52, 250])),
      RUN_DATE: rng.pick(d.runDates),
      DEVELOPER: devs.join(", "),
      OWNER_EMPLOYEE: rng.pick(d.people),
      PROJECT_MANAGER: rng.pick(d.projectManagers),
      DEPARTMENT: rng.pick(d.departments),
      RESP_MANAGER: rng.pick(d.people),
      TOOL: rng.pick(d.tools),
      INTERNAL: rng.chance(0.3) ? "1" : "0",
      STEP_BY_STEP: rng.chance(0.4) ? "1" : "0",
      SHORT_DESCRIPTION: `Automates the ${process.toLowerCase()} process end to end and removes manual copy/paste steps.`,
      WEBSITE: rng.chance(0.15) ? "1" : "0",
      TIME_STAMP: `${iso(addDays(today, -rng.int(0, 200)))} ${String(rng.int(8, 17)).padStart(2, "0")}:${String(rng.int(0, 59)).padStart(2, "0")}:00`,
    });
  }

  const mods = [];
  let modId = 0;
  for (const p of projects) {
    if (!["4 - Active", "3 - Testing", "E - To be fixed"].includes(p.STATUS)) continue;
    const n = rng.weighted([[0, 30], [1, 35], [2, 25], [3, 10]]);
    for (let k = 0; k < n; k++) {
      const status = rng.weighted(d.modificationStatuses);
      const start = addDays(today, -rng.int(5, 220));
      const due = addDays(start, rng.int(7, 60));
      const finished = status === "3 - Finished";
      const note = rng.pick(d.modificationNotes);
      mods.push({
        MODIFICATION_ID: ++modId,
        ID: p.UNIQUE_ID,
        TITLE: p.TITLE,
        START_DATE: iso(start),
        SHORT_DESCRIPTION: note,
        DETAILED_DESCRIPTION: `${note}. Requested by ${p.OWNER_EMPLOYEE}; agreed with ${p.PROJECT_MANAGER}.`,
        DUE_DATE: iso(due),
        ACTUAL_GO_LIVE_DATE: finished ? iso(addDays(due, rng.int(-5, 12))) : null,
        STATUS: status,
        PENDING_ON: finished ? null : rng.pick(d.pendingOn),
        MODIFIED_BY: rng.sample(d.people, rng.chance(0.2) ? 2 : 1).join(", "),
        CREATION_DATE: iso(start),
      });
    }
  }

  const wishlist = [];
  const wishProcesses = rng.sample(d.processes, 10);
  for (let i = 1; i <= 10; i++) {
    const process = wishProcesses[i - 1];
    wishlist.push({
      UNIQUE_ID: i,
      DEPARTMENT: rng.pick(d.departments),
      FREQUENCY_PER_YEAR: String(rng.pick([4, 12, 24, 52])),
      MANUAL_PROCESS_ESTIMATED_TIME: String(rng.int(1, 16)),
      TITLE: `${process} automation`,
      PROCESS_OWNER: rng.pick(d.people),
      REQUEST_DATE: iso(addDays(today, -rng.int(3, 150))),
      RESPONSIBLE_LINE_MANAGER: rng.pick(d.people),
      RUN_DATE: rng.pick(d.runDates),
      SHORT_DESCRIPTION: `Idea: automate the ${process.toLowerCase()} to save manual effort every cycle.`,
      TEAM: rng.pick(d.departments),
      USERNAME: rng.pick(d.people),
    });
  }

  return { SKYNET_DATA: projects, SKYNET_MODIFICATIONS: mods, SKYNET_WISHLIST: wishlist };
}

function generateAssetPo(rng, today) {
  const lastMonday = addDays(today, -((today.getUTCDay() + 6) % 7));
  const reportDates = Array.from({ length: 6 }, (_, i) => addDays(lastMonday, -7 * (5 - i)));

  const FLOW = ["New", "Processing", "Pending Approval", "Returned", "Pending Approval", "Completed"];
  const deals = [];
  const used = new Set();
  for (let i = 0; i < 40; i++) {
    let name;
    do {
      name = `${rng.pick(d.deals.adjectives)} ${rng.pick(d.deals.nouns)} - ${rng.pick(d.deals.kinds)}`;
    } while (used.has(name));
    used.add(name);
    deals.push({
      number: `AP-${today.getUTCFullYear()}-${String(i + 1).padStart(4, "0")}`,
      name,
      company: rng.pick(d.deals.companies),
      segment: rng.pick(d.deals.segments),
      location: rng.pick(d.deals.locations),
      team: rng.pick(d.deals.teams),
      submittedBy: rng.pick(d.people),
      firstWeek: rng.int(0, 4),
      stage: rng.int(0, 2),
      finLead: rng.pick(d.people),
      progLead: rng.pick(d.people),
      optLead: rng.chance(0.3) ? rng.pick(d.people) : null,
      rtr: rng.pick(d.deals.rtr),
    });
  }

  const rows = [];
  reportDates.forEach((rd, w) => {
    for (const deal of deals) {
      if (w < deal.firstWeek) continue;
      if (w > deal.firstWeek && rng.chance(0.55)) deal.stage = Math.min(deal.stage + 1, FLOW.length - 1);
      const status = FLOW[deal.stage];
      const submitted = addDays(rd, -rng.int(2, 40));
      const approvalFin = status === "Pending Approval" ? rng.pick(["Pending", "Approved"]) : status === "Returned" ? "Rejected" : status === "Completed" ? "Approved" : "Pending";
      const approvalProg = status === "Completed" ? "Approved" : rng.pick(["Pending", "Approved", "Pending"]);
      rows.push({
        NUMBER: deal.number,
        REPORT_DATE: iso(rd),
        DEAL_NAME: deal.name,
        COMPANY: deal.company,
        SEGMENT: deal.segment,
        LOCATION: deal.location,
        TEAM_RESPONSIBLE: deal.team,
        STATUS: status,
        DATE_SUBMITTED: iso(submitted),
        SUBMITTED_BY: deal.submittedBy,
        APPROVAL_STATUS__FINANCE_LEAD_: approvalFin,
        APPROVAL_STATUS__PROGRAMMING_LEAD_: approvalProg,
        FINANCE_PROGRAMMING_LEAD: deal.finLead,
        OPTIONAL_FINANCE_PROGRAMMING_LEAD: deal.optLead,
        RTR_RESPONSIBLE: status === "New" ? null : deal.rtr,
        CONVERSATION: rng.chance(0.35) ? rng.pick(d.deals.conversations) : null,
      });
    }
  });

  return { Asset_PO_Tracker: rows };
}

async function generateAll({ seed = 42, today = startOfDay(new Date()) } = {}) {
  const rng = makeRng(seed);
  return {
    ...(await generateSpo(rng, today)),
    ...generateSkynet(rng, today),
    ...generateAssetPo(rng, today),
  };
}

module.exports = { generateAll, makeRng };
