import { createRiskItem } from "../utils/riskHelpers.js"

export function detectBudgetRisks(budgetSummary = {}) {
  const risks = []
  const budget = budgetSummary?.budget || budgetSummary || {}
  const percentUsed = Number(budget.percentUsed ?? budgetSummary?.percentUsed ?? 0)
  const exceeded = Boolean(budget.overBudget ?? budgetSummary?.overBudget)
  const remaining = Number(budget.remaining ?? 0)

  if (exceeded || percentUsed >= 100) {
    risks.push(
      createRiskItem({
        riskType: "budget_exceeded",
        severity: percentUsed >= 120 ? "HIGH" : "MEDIUM",
        title: "Trip budget exceeded",
        description: `Spending is at ${Math.round(percentUsed)}% of your planned budget.`,
        source: "budget",
        recommendation: {
          title: "Reduce costs for remaining days",
          description: "Consider cheaper hotels, free attractions, and public transport.",
          suggestions: [
            "Switch to budget-friendly dining",
            "Visit free parks, temples, and walking tours",
            "Use metro or bus instead of taxis",
            "Book activities with free cancellation to compare prices",
          ],
        },
        metadata: { percentUsed, remaining, exceededBy: budget.exceededBy },
      }),
    )
  } else if (percentUsed >= 85) {
    risks.push(
      createRiskItem({
        riskType: "budget_exceeded",
        severity: "LOW",
        title: "Approaching budget limit",
        description: `${Math.round(percentUsed)}% of budget used with ${remaining > 0 ? `${remaining} remaining` : "limited headroom"}.`,
        source: "budget",
        recommendation: {
          suggestions: ["Track daily spend", "Prioritize must-do activities", "Look for combo tickets"],
        },
        metadata: { percentUsed, remaining },
      }),
    )
  }

  return risks
}
