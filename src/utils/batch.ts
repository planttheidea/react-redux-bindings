type Batch = (fn: () => void) => void;

let batch: Batch = function defaultBatch(fn) {
  fn();
};

export function getBatch() {
  return batch;
}

export function setBatch(nextBatch: () => void) {
  batch = nextBatch;
}
