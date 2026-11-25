import { isUniqueViolation } from "@server/errors";
import { assert, test } from "vite-plus/test";

test("unique constraint errors are detected through wrapped database causes", () => {
  assert.strictEqual(
    isUniqueViolation(
      new Error("Query failed", { cause: new Error("UNIQUE constraint failed: user.email") }),
    ),
    true,
  );
  assert.strictEqual(isUniqueViolation(new Error("Connection failed")), false);
  assert.strictEqual(isUniqueViolation({ message: "opaque" }), false);
});
