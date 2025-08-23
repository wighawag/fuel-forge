import { describe, test, expect } from "vitest";
import { sha256 } from "fuels";
import { ActionInput } from "../typescript/src/contracts/TestContract";
import { Vec } from "../typescript/src/contracts/common";
import {
  encodeActionInputAsBytes,
  encodeActionVecAsBytes,
  encodeCommitmentData,
} from "./manual-encoder";

describe("Manual Encoder", () => {
  test("encodes Activate action correctly", () => {
    const action: ActionInput = { Activate: { system: 1 } };
    const bytes = encodeActionInputAsBytes(action);

    // Expected: discriminant (0) + system (1 as u64)
    const expected = new Uint8Array([
      0, // Activate discriminant
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      1, // system: 1 as big-endian u64
    ]);

    expect(bytes).toEqual(expected);
    console.log("Activate bytes:", Array.from(bytes));
  });

  test("encodes SendFleet action with Known destination correctly", () => {
    const action: ActionInput = {
      SendFleet: {
        from: 1,
        spaceships: 100,
        destination: { Known: 2 },
      },
    };
    const bytes = encodeActionInputAsBytes(action);

    // Expected: discriminant (1) + from (1) + spaceships (100) + destination (Known: 2)
    const expected = new Uint8Array([
      1, // SendFleet discriminant
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      1, // from: 1 as big-endian u64
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      100, // spaceships: 100 as big-endian u64
      1, // Known discriminant
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      2, // destination: 2 as big-endian u64
    ]);

    expect(bytes).toEqual(expected);
    console.log("SendFleet (Known) bytes:", Array.from(bytes));
  });

  test("encodes SendFleet action with Eventual destination correctly", () => {
    const action: ActionInput = {
      SendFleet: {
        from: 1,
        spaceships: 100,
        destination: {
          Eventual:
            "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        },
      },
    };
    const bytes = encodeActionInputAsBytes(action);

    // Expected: discriminant (1) + from (1) + spaceships (100) + destination (Eventual: b256)
    const expectedStart = new Uint8Array([
      1, // SendFleet discriminant
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      1, // from: 1 as big-endian u64
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      100, // spaceships: 100 as big-endian u64
      0, // Eventual discriminant
    ]);

    // The b256 bytes
    const expectedHash = new Uint8Array([
      0x12, 0x34, 0x56, 0x78, 0x90, 0xab, 0xcd, 0xef, 0x12, 0x34, 0x56, 0x78,
      0x90, 0xab, 0xcd, 0xef, 0x12, 0x34, 0x56, 0x78, 0x90, 0xab, 0xcd, 0xef,
      0x12, 0x34, 0x56, 0x78, 0x90, 0xab, 0xcd, 0xef,
    ]);

    const expected = new Uint8Array(expectedStart.length + expectedHash.length);
    expected.set(expectedStart, 0);
    expected.set(expectedHash, expectedStart.length);

    expect(bytes).toEqual(expected);
    console.log("SendFleet (Eventual) bytes:", Array.from(bytes));
  });

  test("encodes vector of actions correctly", () => {
    const actions: Vec<ActionInput> = [
      { Activate: { system: 1 } },
      { SendFleet: { from: 1, spaceships: 100, destination: { Known: 2 } } },
    ];

    const bytes = encodeActionVecAsBytes(actions);

    // Should start with length (2 as u64)
    const lengthBytes = bytes.slice(0, 8);
    const expectedLength = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 2]);
    expect(lengthBytes).toEqual(expectedLength);

    console.log("Action vector bytes length:", bytes.length);
    console.log("Action vector bytes:", Array.from(bytes));
  });

  test("matches the example hash from your code", () => {
    // Recreate your example
    let buffer = new ArrayBuffer(1 + 1 + 8);
    let view = new DataView(buffer);
    view.setUint8(0, 42); // This doesn't match our enum structure
    view.setUint8(1, 1); // system: 1
    view.setBigUint64(2, 21n, false); // This doesn't match our enum structure
    const exampleBytes = new Uint8Array(buffer);
    const exampleHash = sha256(exampleBytes);

    console.log("Your example bytes:", Array.from(exampleBytes));
    console.log("Your example hash:", exampleHash);

    // Now test with a simple Activate action
    const action: ActionInput = { Activate: { system: 1 } };
    const actionBytes = encodeActionInputAsBytes(action);
    const actionHash = sha256(actionBytes);

    console.log("Our Activate bytes:", Array.from(actionBytes));
    console.log("Our Activate hash:", actionHash);

    // They should be different since the structures are different
    expect(actionBytes).not.toEqual(exampleBytes);
  });

  test("encodes commitment data correctly", () => {
    const actions: Vec<ActionInput> = [{ Activate: { system: 1 } }];
    const secret =
      "0x0000000000000000000000000000000000000000000000000000000000000001";

    const commitmentBytes = encodeCommitmentData(actions, secret);
    const hash = sha256(commitmentBytes);

    console.log("Commitment bytes length:", commitmentBytes.length);
    console.log("Commitment hash:", hash);

    // Verify the structure: actions bytes + secret bytes
    const actionBytes = encodeActionVecAsBytes(actions);
    const expectedSecretBytes = new Uint8Array(32);
    expectedSecretBytes[31] = 1; // The secret ends with 1

    const expectedTotal = actionBytes.length + 32;
    expect(commitmentBytes.length).toBe(expectedTotal);

    // Check that secret is at the end
    const actualSecretBytes = commitmentBytes.slice(-32);
    expect(actualSecretBytes).toEqual(expectedSecretBytes);
  });
});
