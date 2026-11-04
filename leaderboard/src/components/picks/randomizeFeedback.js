export const RANDOMIZE_PHASE = Object.freeze({
  IDLE: "",
  RANDOMIZING: "randomizing",
  SAVING: "saving",
});

export const getRandomizeFeedback = ({ phase, idleLabel = "" } = {}) => {
  if (phase === RANDOMIZE_PHASE.RANDOMIZING) {
    return {
      isProcessing: true,
      label: "Randomizing picks...",
    };
  }

  if (phase === RANDOMIZE_PHASE.SAVING) {
    return {
      isProcessing: true,
      label: "Saving picks...",
    };
  }

  return {
    isProcessing: false,
    label: idleLabel,
  };
};

export const runRandomizeLifecycle = async ({
  lockRef,
  createSelections,
  persistSelections,
  onPhaseChange,
}) => {
  if (lockRef.current) {
    return { status: "ignored" };
  }

  lockRef.current = true;

  try {
    onPhaseChange(RANDOMIZE_PHASE.RANDOMIZING);
    const selections = createSelections();
    onPhaseChange(RANDOMIZE_PHASE.SAVING);
    return await persistSelections(selections);
  } finally {
    lockRef.current = false;
    onPhaseChange(RANDOMIZE_PHASE.IDLE);
  }
};
