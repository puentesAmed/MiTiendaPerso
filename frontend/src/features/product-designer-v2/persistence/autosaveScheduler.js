export function createAutosaveScheduler(task, { delay = 700, setTimer = setTimeout, clearTimer = clearTimeout } = {}) {
  let timer = null;
  let pendingValue;
  return {
    schedule(value) {
      pendingValue = value;
      if (timer) clearTimer(timer);
      timer = setTimer(() => {
        timer = null;
        const valueToSave = pendingValue;
        pendingValue = undefined;
        void task(valueToSave);
      }, delay);
    },
    async flush(value = pendingValue) {
      if (timer) clearTimer(timer);
      timer = null;
      pendingValue = undefined;
      if (value !== undefined) return task(value);
      return undefined;
    },
    cancel() {
      if (timer) clearTimer(timer);
      timer = null;
      pendingValue = undefined;
    },
  };
}
