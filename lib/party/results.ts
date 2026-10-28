import type { RoomView } from "./types";

export function scoreReason(state: RoomView, id: string): string {
  const r = state.round;
  const reveal = r?.reveal;
  if (!r || !reveal) return "";
  if (reveal.reason) return "Round skipped";
  const points = reveal.delta[id] || 0;
  const vote = reveal.votes[id];
  if (r.game === "brain")
    return points ? "Matched a friend" : "No matching answer";
  if (r.game === "psych") {
    const votes = Object.values(reveal.votes).filter((v) =>
      reveal.options.find((o) => o.id === v.option)?.authors.includes(id),
    ).length;
    return votes
      ? `${votes} ${votes === 1 ? "person liked" : "people liked"} your answer`
      : "No votes this round";
  }
  if (r.game === "bluff") {
    const reasons: string[] = [];
    const truth = reveal.options.find((o) => o.correct);
    if (truth?.authors.includes(id)) reasons.push("Wrote the correct answer");
    if (vote?.option === truth?.id) reasons.push("Picked the truth");
    const fooled = Object.entries(reveal.votes)
      .filter(([, v]) => {
        const o = reveal.options.find((o) => o.id === v.option);
        return o && !o.correct && o.authors.includes(id);
      })
      .map(
        ([voter]) =>
          state.players.find((p) => p.id === voter)?.name || "a friend",
      );
    if (fooled.length)
      reasons.push(
        fooled.length <= 2 && fooled.join(" & ").length <= 36
          ? `Fooled ${fooled.join(" & ")}`
          : `Fooled ${fooled.length} friends`,
      );
    if (vote?.boost) reasons.push("Confidence bonus applied");
    return reasons.join(" · ") || "No points this round";
  }
  if (r.game === "who")
    return id === reveal.target
      ? "Wrote the mystery answer"
      : points > 0
        ? "Guessed the author"
        : "Guessed another friend";
  if (reveal.imposter)
    return id === reveal.imposter
      ? points
        ? "Escaped the vote"
        : "Caught by the group"
      : vote?.option === reveal.imposter
        ? "Found the imposter"
        : "Voted for someone else";
  return "No points this round";
}
