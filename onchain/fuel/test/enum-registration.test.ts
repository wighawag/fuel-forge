import { describe, test, expect } from "vitest";
import { encodeInputAsBytes, Hasher } from "./manual-encoder";

describe("Enum Context System", () => {
  test("demonstrates enum context parameter usage", () => {
    // Define enum context inline
    const enumContext = {
      MyCustomEnum: ["First", "Second", "Third"],
    };

    // Test encoding with enum context
    const firstVariant = { First: 42 };
    const secondVariant = { Second: "hello" };
    const thirdVariant = { Third: true };

    const firstBytes = encodeInputAsBytes(firstVariant, enumContext);
    const secondBytes = encodeInputAsBytes(secondVariant, enumContext);
    const thirdBytes = encodeInputAsBytes(thirdVariant, enumContext);

    console.log("First variant bytes:", Array.from(firstBytes));
    console.log("Second variant bytes:", Array.from(secondBytes));
    console.log("Third variant bytes:", Array.from(thirdBytes));

    // Verify discriminants match declaration order
    expect(firstBytes[0]).toBe(0); // First = index 0
    expect(secondBytes[0]).toBe(1); // Second = index 1
    expect(thirdBytes[0]).toBe(2); // Third = index 2
  });

  test("demonstrates multiple enum types in context", () => {
    // Define enum context with multiple enums
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
    // Define enum context for this test
    const enumContext = {
      Status: ["Pending", "Active", "Inactive"],
    };

    const hasher = new Hasher(enumContext);
    const hash = hasher
      .update({ Active: { userId: 123 } })
      .update("some-data")
      .update({ Pending: null })
      .finalize();

    console.log("Hash with custom enums:", hash);
    expect(hash).toMatch(/^0x[a-f0-9]{64}$/);
  });

  test("demonstrates complex enum context usage", () => {
    // Define comprehensive enum context
    const enumContext = {
      Priority: ["Low", "Medium", "High", "Critical"],
      TaskType: ["Bug", "Feature", "Documentation", "Test"],
    };

    const task = {
      priority: { High: null },
      type: { Feature: { complexity: "medium" } },
      assignee: "john",
    };

    // This should work because both enums are in context
    const taskBytes = encodeInputAsBytes(task, enumContext);

    console.log("Task bytes:", Array.from(taskBytes));
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
    const enumContext = {
      Direction: ["North", "South", "East", "West"],
    };

    const directions = [
      { North: null },
      { South: null },
      { East: null },
      { West: null },
    ];

    const encodedDirections = directions.map((dir) =>
      encodeInputAsBytes(dir, enumContext)
    );

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

  test("demonstrates ActionInput and Destination enum usage", () => {
    // Define enum context for ActionInput and Destination
    const enumContext = {
      ActionInput: ["Activate", "SendFleet"],
      Destination: ["Eventual", "Known"],
    };

    const action = { Activate: { system: 1 } };
    const destination = { Known: 42 };

    const actionBytes = encodeInputAsBytes(action, enumContext);
    const destBytes = encodeInputAsBytes(destination, enumContext);

    console.log("ActionInput bytes:", Array.from(actionBytes));
    console.log("Destination bytes:", Array.from(destBytes));

    // Verify correct discriminants
    expect(actionBytes[0]).toBe(0); // Activate is first in ActionInput
    expect(destBytes[0]).toBe(1); // Known is second in Destination (after Eventual)
  });

  test("demonstrates nested enum structures", () => {
    const enumContext = {
      ActionInput: ["Activate", "SendFleet"],
      Destination: ["Eventual", "Known"],
    };

    const complexAction = {
      SendFleet: {
        from: 1,
        spaceships: 100,
        destination: { Known: 2 },
      },
    };

    const bytes = encodeInputAsBytes(complexAction, enumContext);

    console.log("Complex action bytes:", Array.from(bytes));

    // Verify structure: SendFleet discriminant (1) + from (8) + spaceships (8) + destination
    expect(bytes[0]).toBe(1); // SendFleet discriminant
    expect(bytes.length).toBeGreaterThan(17); // At least 1 + 8 + 8 + destination bytes
  });
});
