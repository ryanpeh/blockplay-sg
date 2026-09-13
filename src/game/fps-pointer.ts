/** Standard relative capture is the compatibility default for virtual machines. */
export function requiresFpsPointerLock(pointerType: string) {
  // Media queries describe a device's primary pointer, not the current input.
  // Virtual tablets and touch laptops can still deliver real mouse events.
  return pointerType !== 'touch' && pointerType !== 'pen';
}

export async function requestFpsPointerLock(
  target: Pick<HTMLElement, 'requestPointerLock'>,
  stillWanted: () => boolean = () => true,
  raw = false,
): Promise<void> {
  if (!raw) { await target.requestPointerLock(); return; }
  try {
    await target.requestPointerLock({ unadjustedMovement: true });
  } catch (error) {
    // Unsupported raw input is different from denied capture. Never retry a denial.
    if (!(error && typeof error === 'object' && 'name' in error && error.name === 'NotSupportedError')) throw error;
    if (stillWanted()) await target.requestPointerLock();
  }
}

/** Only relative deltas affect captured look; absolute screen coordinates never do. */
export function turnFpsLook(yaw: number, pitch: number, dx: number, dy: number, aiming: boolean) {
  const sensitivity = aiming ? .0013 : .0023;
  return {
    yaw: yaw - (Number.isFinite(dx) ? dx : 0) * sensitivity,
    pitch: Math.max(-1.35, Math.min(1.35, pitch - (Number.isFinite(dy) ? dy : 0) * sensitivity)),
  };
}
