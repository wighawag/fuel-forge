import { describe, test } from "vitest";
import { ActionInput } from "../typescript/src/contracts/TestContract";
import { Vec } from "../typescript/src/contracts/common";
import { Hasher, encodeMultipleInputs } from "./manual-encoder";
import { sha256 } from "fuels";

describe("Hasher Demo", () => {
  test("demonstrates Hasher usage patterns", () => {
    console.log("=== Hasher Class Demo ===\n");

    // Example 1: Basic usage with method chaining
    console.log("1. Basic usage with method chaining:");
    const hasher1 = new Hasher();
    const hash1 = hasher1
      .update({ Activate: { system: 1 } })
      .update(42)
      .update("hello")
      .digest();

    console.log("   Hash:", hash1);
    console.log("   Bytes length:", hasher1.getBytes().length, "bytes\n");

    // Example 2: Building commitment hash step by step
    console.log("2. Building commitment hash step by step:");
    const actions: Vec<ActionInput> = [
      { Activate: { system: 1 } },
      { SendFleet: { from: 1, spaceships: 100, destination: { Known: 2 } } },
    ];
    const secret =
      "0x0000000000000000000000000000000000000000000000000000000000000001";

    const hasher2 = new Hasher();
    console.log("   Adding actions...");
    hasher2.update(actions);
    console.log("   Current bytes length:", hasher2.getBytes().length);

    console.log("   Adding secret...");
    hasher2.update(secret);
    console.log("   Final bytes length:", hasher2.getBytes().length);

    const commitmentHash = hasher2.digest();
    console.log("   Commitment hash:", commitmentHash, "\n");

    // Example 3: Comparing with direct encoding
    console.log("3. Comparing with direct encoding:");
    const directBytes = encodeMultipleInputs(actions, secret);
    const directHash = sha256(directBytes);

    console.log("   Direct encoding hash:", directHash);
    console.log("   Hasher hash:         ", commitmentHash);
    console.log("   Hashes match:", directHash === commitmentHash, "\n");

    // Example 4: Using reset and clone
    console.log("4. Using reset and clone:");
    const baseHasher = new Hasher();
    baseHasher.update({ Activate: { system: 1 } });

    // Clone for different variations
    const variation1 = baseHasher.clone().update("variation1").digest();
    const variation2 = baseHasher.clone().update("variation2").digest();

    console.log("   Base + variation1:", variation1);
    console.log("   Base + variation2:", variation2);

    // Reset and start fresh
    baseHasher.reset().update("fresh start");
    const freshHash = baseHasher.digest();
    console.log("   Fresh start hash: ", freshHash, "\n");

    // Example 5: Incremental building
    console.log("5. Incremental building:");
    const incrementalHasher = new Hasher();

    console.log("   Step 1 - Add player action:");
    incrementalHasher.update({ Activate: { system: 1 } });
    console.log("   Current hash:", incrementalHasher.digest());

    console.log("   Step 2 - Add timestamp:");
    incrementalHasher.update(Date.now());
    console.log("   Current hash:", incrementalHasher.digest());

    console.log("   Step 3 - Add nonce:");
    incrementalHasher.update(12345);
    const finalHash = incrementalHasher.digest();
    console.log("   Final hash:  ", finalHash, "\n");

    // Example 6: Working with different data types
    console.log("6. Working with different data types:");
    const typeHasher = new Hasher();

    typeHasher
      .update(42) // number
      .update(true) // boolean
      .update("test string") // string
      .update([1, 2, 3]) // array
      .update({ Known: 123 }) // enum
      .update({ field: "value" }) // struct
      .update(
        "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
      ); // b256

    console.log("   Mixed types hash:", typeHasher.digest());
    console.log("   Total bytes:", typeHasher.getBytes().length, "bytes");
  });

  test("demonstrates practical commitment workflow", () => {
    console.log("\n=== Practical Commitment Workflow ===\n");

    // Simulate a game turn with multiple actions
    const playerActions: Vec<ActionInput> = [
      { Activate: { system: 1 } },
      { SendFleet: { from: 1, spaceships: 50, destination: { Known: 2 } } },
      { SendFleet: { from: 2, spaceships: 25, destination: { Known: 3 } } },
    ];

    const playerSecret = "0x" + "a".repeat(64); // Player's secret
    const turnNumber = 42;
    const timestamp = Math.floor(Date.now() / 1000);

    console.log("Building commitment for turn", turnNumber);
    console.log("Player actions:", playerActions.length);
    console.log("Timestamp:", timestamp);

    // Build commitment hash
    const commitmentHasher = new Hasher();
    const commitmentHash = commitmentHasher
      .update(turnNumber)
      .update(timestamp)
      .update(playerActions)
      .update(playerSecret)
      .digest();

    console.log("Commitment hash:", commitmentHash);
    console.log(
      "Commitment bytes length:",
      commitmentHasher.getBytes().length,
      "bytes"
    );

    // Later, during reveal phase, verify the commitment
    console.log("\n--- Reveal Phase ---");
    const verificationHasher = new Hasher();
    const verificationHash = verificationHasher
      .update(turnNumber)
      .update(timestamp)
      .update(playerActions)
      .update(playerSecret)
      .digest();

    console.log("Verification hash:", verificationHash);
    console.log("Commitment valid:", commitmentHash === verificationHash);
  });
});
