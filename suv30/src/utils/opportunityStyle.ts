export function getOpportunityGradient(score: number): string {
  if (score >= 10) {
    return "linear-gradient(135deg, #2563eb, #2563eb)";
  }

  if (score >= 9) {
    return "linear-gradient(135deg, #14b8a6, #22c55e)";
  }

  if (score >= 8) {
    return "linear-gradient(135deg, #84cc16, #22c55e)";
  }

  if (score >= 7) {
    return "linear-gradient(135deg, #f59e0b, #f97316)";
  }

  return "linear-gradient(135deg, #ef4444, #dc2626)";
}

export function getOpportunityTextColor(score: number): string {
  return score >= 7 ? "#ffffff" : "#fff7ed";
}
