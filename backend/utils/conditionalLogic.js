function shouldShowQuestion(rules, answersSoFar) {
  if (!rules) return true;
  const { logic, conditions } = rules;
  const results = conditions.map(condition => {
    const answer = answersSoFar[condition.questionKey];
    if (answer === undefined || answer === null) return false;
    switch (condition.operator) {
      case 'equals':
        return answer === condition.value;
      case 'notEquals':
        return answer !== condition.value;
      case 'contains':
        return String(answer).includes(condition.value);
      default:
        return false;
    }
  });
  return logic === 'AND' ? results.every(r => r) : results.some(r => r);
}
module.exports = { shouldShowQuestion };