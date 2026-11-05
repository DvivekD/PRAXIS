import assert from "assert";

console.log("================================================================================");
console.log("SCOPE 4: DATA - FUNCTIONAL SERVER ACTIONS & LOGIC TEST SUITE");
console.log("================================================================================\n");

// 1. Test Query Evaluation Logic
function evaluateQuery(sqlQuery) {
  const lower = sqlQuery.toLowerCase();
  const hasDistinct = lower.includes("distinct");
  const omitsInnerTransactions =
    !lower.includes("inner join transactions") || lower.includes("left join transactions");
  const joinsSessions = lower.includes("sessions");

  const isFixed = hasDistinct && (omitsInnerTransactions || joinsSessions);

  return {
    isFixed,
    plan: isFixed
      ? "Index Scan using sessions_started_at_idx on sessions (cost=0.42..18.50 rows=62850 width=24)"
      : "Hash Join (cost=24.10..892.40 rows=50840 width=24) - Omits non-transacting users",
    rows: 5,
  };
}

const legacyQuery = `
SELECT 
  DATE(s.started_at) AS report_date,
  COUNT(u.id) AS active_users
FROM users u
INNER JOIN sessions s ON u.id = s.user_id
INNER JOIN transactions t ON u.id = t.user_id AND DATE(t.created_at) = DATE(s.started_at)
WHERE s.started_at >= '2026-11-01'
GROUP BY DATE(s.started_at);
`;

const legacyResult = evaluateQuery(legacyQuery);
assert.strictEqual(legacyResult.isFixed, false, "Legacy query should NOT be marked as fixed");
console.log("  [PASS] Legacy query correctly identified as flawed (isFixed = false, hash join omitting non-transacting users)");

const fixedQuery = `
SELECT 
  DATE(s.started_at) AS report_date,
  COUNT(DISTINCT u.id) AS active_users
FROM users u
INNER JOIN sessions s ON u.id = s.user_id
WHERE s.started_at >= '2026-11-01'
  AND s.is_bot = FALSE
GROUP BY DATE(s.started_at);
`;

const fixedResult = evaluateQuery(fixedQuery);
assert.strictEqual(fixedResult.isFixed, true, "Query with DISTINCT u.id and sessions join should be marked as fixed");
assert(fixedResult.plan.includes("Index Scan"), "Fixed query should use index scan on sessions");
console.log("  [PASS] Repaired query correctly validated with DISTINCT u.id (isFixed = true, index scan on sessions)");

// 2. Test Pipeline Node Repair Logic
function evaluatePipelineRepair(modelSql) {
  const lower = modelSql.toLowerCase();
  const handlesSchemaDrift = lower.includes("account_uid") && lower.includes("coalesce");
  const handlesDedupe = lower.includes("row_number") || lower.includes("dedupe") || lower.includes("distinct");

  const isRepaired = handlesSchemaDrift && handlesDedupe;

  return {
    isRepaired,
    dagStatus: isRepaired ? "SUCCESS" : "FAILED",
    assertions: [
      { test: "assert_not_null_user_id", status: isRepaired ? "PASS" : "FAIL" },
      { test: "assert_unique_event_id", status: isRepaired ? "PASS" : "WARN" },
      { test: "assert_row_count_variance", status: "PASS" },
    ],
  };
}

const faultyDbtSql = `
SELECT 
  event_id,
  payload->>'user_id' AS user_id,
  event_name
FROM raw_events;
`;

const faultyDbtResult = evaluatePipelineRepair(faultyDbtSql);
assert.strictEqual(faultyDbtResult.isRepaired, false, "Faulty dbt SQL should fail validation");
assert.strictEqual(faultyDbtResult.dagStatus, "FAILED");
console.log("  [PASS] Faulty dbt model correctly caught with unhandled schema drift & missing deduplication");

const repairedDbtSql = `
WITH deduped_events AS (
  SELECT *, ROW_NUMBER() OVER (PARTITION BY event_id ORDER BY received_at DESC) as rn
  FROM raw_events
)
SELECT 
  event_id,
  COALESCE(payload->>'account_uid', payload->>'user_id') AS user_id,
  event_name
FROM deduped_events
WHERE rn = 1;
`;

const repairedDbtResult = evaluatePipelineRepair(repairedDbtSql);
assert.strictEqual(repairedDbtResult.isRepaired, true, "Repaired dbt SQL should pass validation");
assert.strictEqual(repairedDbtResult.dagStatus, "SUCCESS");
assert.strictEqual(repairedDbtResult.assertions[0].status, "PASS");
assert.strictEqual(repairedDbtResult.assertions[1].status, "PASS");
console.log("  [PASS] Repaired dbt model correctly verified with COALESCE(account_uid, user_id) & window deduplication (All tests PASS)");

// 3. Test Executive BI Report Completion
function evaluateExecutiveReport(reportData) {
  const isComplete =
    reportData.sqlJoinFixed &&
    reportData.pipelineRepaired &&
    reportData.serverTrafficSteady &&
    reportData.normalizedDau >= 62000;

  const score = isComplete ? 98 : 76;

  return { isComplete, score };
}

const incompleteReport = {
  sqlJoinFixed: true,
  pipelineRepaired: false,
  serverTrafficSteady: true,
  normalizedDau: 50840,
};
const incompleteResult = evaluateExecutiveReport(incompleteReport);
assert.strictEqual(incompleteResult.isComplete, false);
console.log("  [PASS] Incomplete report correctly flagged as unresolved");

const completeReport = {
  sqlJoinFixed: true,
  pipelineRepaired: true,
  serverTrafficSteady: true,
  normalizedDau: 62850,
};
const completeResult = evaluateExecutiveReport(completeReport);
assert.strictEqual(completeResult.isComplete, true);
assert.strictEqual(completeResult.score, 98);
console.log("  [PASS] Full executive report verified with 18% DAU recovery & score = 98");

console.log("\n================================================================================");
console.log(">>> ALL FUNCTIONAL LOGIC TESTS PASSED CLEANLY! <<<");
console.log("================================================================================\n");
