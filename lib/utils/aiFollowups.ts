/**
 * Dynamic follow-up prompt suggestion engine for Cosmic AI Guide.
 * Parses terminology in the assistant's latest response and route context
 * to generate 2-3 hyper-relevant follow-up prompt chips.
 */

export function generateFollowUpSuggestions(
  lastAnswer: string,
  currentPath: string = "/ai-guide",
): string[] {
  if (!lastAnswer || lastAnswer.trim().length === 0) {
    return [
      "What celestial targets should I observe tonight?",
      "Recommend beginner telescope equipment",
      "How do I dark-adapt my eyes for stargazing?",
    ];
  }

  const text = lastAnswer.toLowerCase();

  // 1. Star tracking, mount drift, polar alignment
  if (/trail|guiding|polar align|mount|drift|tracking|npf|equatorial/.test(text)) {
    return [
      "What exposure time rule (500 or NPF) applies?",
      "How do I achieve precise polar alignment?",
      "Would an auto-guider eliminate star trails?",
    ];
  }

  // 2. Sensor noise, ISO, stacking, exposures, calibration frames
  if (/noise|iso|sensor|gain|dark frame|stack|exposure|sub-exposure|flat frame/.test(text)) {
    return [
      "What are calibration dark and flat frames?",
      "What is the sweet spot ISO for my camera sensor?",
      "Which free stacking software do you recommend?",
    ];
  }

  // 3. Bortle, light pollution, sky glow, filters, magnitude
  if (/bortle|light pollution|filter|glow|magnitude|nelm|contrast|nebula filter/.test(text)) {
    return [
      "What filter helps best with city light pollution?",
      "Can I image emission nebulae in Bortle 6?",
      "How does lunar phase impact Bortle visibility?",
    ];
  }

  // 4. Satellites, ISS, Tiangong, orbital passes, elevation
  if (/satellite|iss|orbit|tiangong|pass|azimuth|elevation|space station/.test(text)) {
    return [
      "How do I photograph an ISS transit?",
      "What does minimum elevation angle mean?",
      "Why do satellites flash or vary in brightness?",
    ];
  }

  // 5. Optics, focal length, eyepieces, FOV, magnification, Barlow, SCT
  if (/fov|focal length|eyepiece|magnification|barlow|sensor|aperture|sct|refractor|dobsonian/.test(text)) {
    return [
      "Should I buy a 2x Barlow lens?",
      "How do I calculate optimal exit pupil?",
      "What framing works best for the Pleiades (M45)?",
    ];
  }

  // 6. Star parties, group etiquette, dark sky events
  if (/party|attend|etiquette|red light|lantern|courtesy|astronomy club/.test(text)) {
    return [
      "Why is red light required at dark sky gatherings?",
      "What cold weather gear should I pack for observing?",
      "How do I set up equipment without disturbing observers?",
    ];
  }

  // 7. Planetary observation (Saturn, Jupiter, Moon, Mars)
  if (/planet|saturn|jupiter|moon|crater|ring|lunar|mars/.test(text)) {
    return [
      "What eyepiece magnification is best for Saturn's rings?",
      "How do atmospheric seeing conditions affect planetary detail?",
      "What filter highlights Jupiter's Great Red Spot?",
    ];
  }

  // 8. Deep-sky targets (M31, M42, Nebulae, Galaxies)
  if (/galaxy|nebula|deep sky|messier|andromeda|orion|cluster/.test(text)) {
    return [
      "Which deep-sky objects are visible in binoculars?",
      "How many stacked exposures are needed for Andromeda (M31)?",
      "What optical focal length fits the Orion Nebula (M42)?",
    ];
  }

  // Path-aware defaults
  if (currentPath === "/satellites") {
    return [
      "When is the next bright ISS pass?",
      "How high is Tiangong above horizon?",
      "What is elevation angle?",
    ];
  }

  if (currentPath === "/map") {
    return [
      "What does Bortle Class 3 mean?",
      "Find dark sky parks near me",
      "Best celestial targets for Bortle 4",
    ];
  }

  // General fallback follow-up prompts
  return [
    "Can you explain that more step-by-step?",
    "What equipment is recommended for this?",
    "What celestial targets should I try next?",
  ];
}
