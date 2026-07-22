export const buildSyncedDraft = (result) => ({
  entryName: result.entry.entryName,
  selectionsByGameId: result.selectionsByGameId,
  tieBreakerValue:
    result.entry.tieBreakerValue === null ||
    result.entry.tieBreakerValue === undefined
      ? ""
      : String(result.entry.tieBreakerValue),
  dirty: false,
});

export const buildAutosaveSuccessState = () => ({
  state: "saved",
  message: "Saved to account",
  detail: "",
});

export const buildAutosaveFailureState = (error) => ({
  state: "device",
  message: "Saved to device",
  detail: error?.message || "Backend save failed. Retry is required.",
});
