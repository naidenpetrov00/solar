import "dotenv/config";

import postgres from "postgres";

const maintenanceServiceCodes = [
  "panel-cleaning",
  "grounds-care",
  "technical-maintenance",
];
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to bootstrap maintenance services.");
}

const client = postgres(databaseUrl, { max: 1 });

try {
  await client.begin(async (transaction) => {
    await transaction`LOCK TABLE maintenance_service IN SHARE ROW EXCLUSIVE MODE`;
    const existing = await transaction`
      SELECT code, display_order
      FROM maintenance_service
      ORDER BY display_order, code
    `;
    const existingCodes = new Set(existing.map(({ code }) => code));
    const usedOrders = new Set(existing.map(({ display_order }) => display_order));

    for (const [canonicalOrder, code] of maintenanceServiceCodes.entries()) {
      if (existingCodes.has(code)) continue;
      let displayOrder = canonicalOrder;
      while (usedOrders.has(displayOrder)) displayOrder += 1;

      await transaction`
        INSERT INTO maintenance_service (
          code,
          is_active,
          one_time_available,
          periodic_available,
          display_order
        )
        VALUES (${code}, false, false, false, ${displayOrder})
        ON CONFLICT (code) DO NOTHING
      `;
      usedOrders.add(displayOrder);
    }

    const finalRows = await transaction`
      SELECT code FROM maintenance_service ORDER BY display_order, code
    `;
    const finalCodes = new Set(finalRows.map(({ code }) => code));
    if (
      finalRows.length !== maintenanceServiceCodes.length ||
      maintenanceServiceCodes.some((code) => !finalCodes.has(code))
    ) {
      throw new Error(
        "Maintenance bootstrap did not produce the complete fixed service set.",
      );
    }
  });

  console.log("Maintenance services are initialized.");
} finally {
  await client.end({ timeout: 5 });
}
