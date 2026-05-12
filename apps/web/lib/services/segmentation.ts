export function assignSegment(baselineScore: number, domain: string): "foundational" | "intermediate" | "advanced" {
  if (baselineScore < 60) {
    return "foundational";
  } else if (baselineScore < 85) {
    return "intermediate";
  } else {
    return "advanced";
  }
}

export function getSegmentModifiers(segment: string) {
  const modifiers = {
    foundational: {
      complexityMultiplier: 0.8,
      hiddenEdgeCases: 0,
      timePressureFactor: 1.0,
    },
    intermediate: {
      complexityMultiplier: 1.0,
      hiddenEdgeCases: 1,
      timePressureFactor: 1.2,
    },
    advanced: {
      complexityMultiplier: 1.5,
      hiddenEdgeCases: 3,
      timePressureFactor: 1.5,
    },
  };
  return modifiers[segment as keyof typeof modifiers] || modifiers["intermediate"];
}
