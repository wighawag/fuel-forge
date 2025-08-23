import { describe, test, expect } from "vitest";
import { sha256 } from "fuels";
import { ActionInput } from "../typescript/src/contracts/TestContract";
import { Vec } from "../typescript/src/contracts/common";
import {
  encodeCommitmentData,
  encodeActionInputAsBytes,
} from "./manual-encoder";

describe("Manual Encoder Demo", () => {
  test("demonstrates manual encoding vs your original example", () => {
    // Your original fake hash example
    let buffer = new ArrayBuffer(1 + 1 + 8);
    let view = new DataView(buffer);
    view.setUint8(0, 42); // Enum variant for Activate
    view.setUint8(1, 1); // system: 1
    view.setBigUint64(2, 21n, false); // Enum variant for SendFleet
    const originalBytes = new Uint8Array(buffer);
    const originalHash = sha256(originalBytes);

    console.log("Your original example:");
    console.log("  Bytes:", Array.from(originalBytes));
    console.log("  Hash:", originalHash);

    // Our manual encoding of a simple Activate action
    const activateAction: ActionInput = { Activate: { system: 1 } };
    const activateBytes = encodeActionInputAsBytes(activateAction);
    const activateHash = sha256(activateBytes);

    console.log("\nOur Activate action encoding:");
    console.log("  Bytes:", Array.from(activateBytes));
    console.log("  Hash:", activateHash);

    // Full commitment data encoding
    const actions: Vec<ActionInput> = [
      { Activate: { system: 1 } },
      { SendFleet: { from: 1, spaceships: 100, destination: { Known: 2 } } },
    ];
    const secret =
      "0x0000000000000000000000000000000000000000000000000000000000000001";

    const commitmentBytes = encodeCommitmentData(actions, secret);
    const commitmentHash = sha256(commitmentBytes);

    console.log("\nFull commitment encoding:");
    console.log("  Actions count:", actions.length);
    console.log("  Total bytes length:", commitmentBytes.length);
    console.log("  Hash:", commitmentHash);

    // Verify the structure is correct
    expect(activateBytes.length).toBe(9); // 1 byte discriminant + 8 bytes u64
    expect(activateBytes[0]).toBe(0); // Activate discriminant

    // Actions bytes should be: Activate (9) + SendFleet with Known (26) = 35 bytes
    // Plus secret (32 bytes) = 67 bytes total
    expect(commitmentBytes.length).toBe(67); // No length prefix, just concatenated actions + secret
  });

  test("encodes different action types correctly", () => {
    const actions: Vec<ActionInput> = [
      { Activate: { system: 1 } },
      { SendFleet: { from: 1, spaceships: 100, destination: { Known: 2 } } },
      {
        SendFleet: {
          from: 1,
          spaceships: 50,
          destination: {
            Eventual:
              "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
          },
        },
      },
    ];

    const secret =
      "0x0000000000000000000000000000000000000000000000000000000000000001";
    const commitmentBytes = encodeCommitmentData(actions, secret);
    const hash = sha256(commitmentBytes);

    console.log("\nComplex actions encoding:");
    console.log("  Actions:", actions.length);
    console.log("  Bytes length:", commitmentBytes.length);
    console.log("  Hash:", hash);

    // Verify we can encode different destination types
    expect(commitmentBytes.length).toBeGreaterThan(100); // Should be substantial with 3 actions + secret
    expect(hash).toMatch(/^0x[a-f0-9]{64}$/); // Valid hex hash
  });
});
