import { describe, test, expect } from "vitest";
import {
  registerEnumVariants,
  encodeInputAsBytes,
  Hasher,
} from "./manual-encoder";

describe("Enum Registration System", () => {
  test("demonstrates enum registration for custom types", () => {
    // Register a custom enum type with its variants in declaration order
    registerEnumVariants("MyCustomEnum", ["First", "Second", "Third"]);

    // Test encoding with registered enum
    const firstVariant = { First: 42 };
    const secondVariant = { Second: "hello" };
    const thirdVariant = { Third: true };

    const firstBytes = encodeInputAsBytes(firstVariant);
    const secondBytes = encodeInputAsBytes(secondVariant);
    const thirdBytes = encodeInputAsBytes(thirdVariant);

    console.log("First variant bytes:", Array.from(firstBytes));
    console.log("Second variant bytes:", Array.from(secondBytes));
    console.log("Third variant bytes:", Array.from(thirdBytes));

    // Verify discriminants match declaration order
    expect(firstBytes[0]).toBe(0); // First = index 0
    expect(secondBytes[0]).toBe(1); // Second = index 1
    expect(thirdBytes[0]).toBe(2); // Third = index 2
  });

  test("demonstrates enum context parameter usage", () => {
    // Define enum context inline without global registration
    const enumContext = {
      GameState: ["Waiting", "Playing", "Finished"],
      PlayerAction: ["Move", "Attack", "Defend", "Skip"],
    };

    const gameState = { Playing: { round: 5 } };
    const playerAction = { Attack: { target: 3, damage: 10 } };

    // Encode using context parameter
    const gameStateBytes = encodeInputAsBytes(gameState, enumContext);
    const playerActionBytes = encodeInputAsBytes(playerAction, enumContext);

    console.log("GameState bytes:", Array.from(gameStateBytes));
    console.log("PlayerAction bytes:", Array.from(playerActionBytes));

    // Verify discriminants
    expect(gameStateBytes[0]).toBe(1); // Playing = index 1 in GameState
    expect(playerActionBytes[0]).toBe(1); // Attack = index 1 in PlayerAction
  });

  test("throws error for unregistered enum variants", () => {
    const unknownEnum = { UnknownVariant: 123 };

    expect(() => {
      encodeInputAsBytes(unknownEnum);
    }).toThrow(
      /Enum variant 'UnknownVariant' not found in provided enumContext or global registry/
    );
  });

  test("demonstrates Hasher with custom enum types", () => {
    // Register enum for this test
    registerEnumVariants("Status", ["Pending", "Active", "Inactive"]);

    const hasher = new Hasher();
    const hash = hasher
      .update({ Active: { userId: 123 } })
      .update("some-data")
      .update({ Pending: null })
      .finalize();

    console.log("Hash with custom enums:", hash);
    expect(hash).toMatch(/^0x[a-f0-9]{64}$/);
  });

  test("demonstrates mixed registration and context usage", () => {
    // Register one enum globally
    registerEnumVariants("Priority", ["Low", "Medium", "High", "Critical"]);

    // Use context for another enum
    const enumContext = {
      TaskType: ["Bug", "Feature", "Documentation", "Test"],
    };

    const task = {
      priority: { High: null },
      type: { Feature: { complexity: "medium" } },
      assignee: "john",
    };

    // This should work because Priority is registered and TaskType is in context
    const taskBytes = encodeInputAsBytes(task, enumContext);

    console.log("Mixed task bytes:", Array.from(taskBytes));
    expect(taskBytes.length).toBeGreaterThan(0);
  });

  test("demonstrates correct Sway declaration order handling", () => {
    // Simulate a Sway enum declared as:
    // enum Direction {
    //   North: (),
    //   South: (),
    //   East: (),
    //   West: (),
    // }
    registerEnumVariants("Direction", ["North", "South", "East", "West"]);

    const directions = [
      { North: null },
      { South: null },
      { East: null },
      { West: null },
    ];

    const encodedDirections = directions.map((dir) => encodeInputAsBytes(dir));

    // Verify discriminants match Sway declaration order
    expect(encodedDirections[0][0]).toBe(0); // North
    expect(encodedDirections[1][0]).toBe(1); // South
    expect(encodedDirections[2][0]).toBe(2); // East
    expect(encodedDirections[3][0]).toBe(3); // West

    console.log(
      "Direction discriminants:",
      encodedDirections.map((bytes) => bytes[0])
    );
  });

  test("demonstrates pre-registered ActionInput and Destination enums", () => {
    // These should work without additional registration because they're pre-registered
    const action = { Activate: { system: 1 } };
    const destination = { Known: 42 };

    const actionBytes = encodeInputAsBytes(action);
    const destBytes = encodeInputAsBytes(destination);

    console.log("Pre-registered ActionInput bytes:", Array.from(actionBytes));
    console.log("Pre-registered Destination bytes:", Array.from(destBytes));

    // Verify correct discriminants for pre-registered enums
    expect(actionBytes[0]).toBe(0); // Activate is first in ActionInput
    expect(destBytes[0]).toBe(1); // Known is second in Destination (after Eventual)
  });
});
