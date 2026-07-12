type ReplayPersona = {
  id: string;
  displayName: string;
  context: string;
};

export function getReplayPersonaPresence(persona?: ReplayPersona | null) {
  const displayName = persona?.displayName ?? "The tester";
  const representsLinda = Boolean(
    persona &&
      (persona.id.toLowerCase() === "linda" ||
        /\b(older adult|grandmother|grandma)\b/i.test(persona.context)),
  );

  return {
    avatarSrc: representsLinda ? "/grandma-linda.png" : null,
    cursorLabel: `${displayName} is looking here`,
    narrationLabel: `${displayName} is thinking aloud`,
  };
}
