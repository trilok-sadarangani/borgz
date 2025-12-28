// Jest environment setup for the Expo client tests.

// Some dependencies expect requestAnimationFrame in the test environment.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).requestAnimationFrame = (cb: any) => setTimeout(cb, 0);


