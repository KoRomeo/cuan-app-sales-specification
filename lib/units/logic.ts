// Unit split / combine rules for CuanApp Sales.
// Pure logic: no database access. Used by api/units/* routes inside a db transaction.

export type UnitOperationType = "split" | "combine";

export class UnitConversionError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export interface UnitRuleInput {
  bigProductId: string;   // e.g. Sabun Shinzui (dus)
  smallProductId: string; // e.g. Sabun Shinzui (pcs)
  ratio: number;          // 1 big = ratio small
}

export interface UnitRuleRow extends UnitRuleInput {
  id: string;
  status: string; // "active" | "inactive" (DB text column)
}

export interface ProductSnapshot {
  productId: string;
  stockQty: number;   // SUM(stock_movements.qty), may be negative in DB
  avgCost: number;    // products.averageCost
}

export interface OperationPlan {
  sourceProductId: string;
  targetProductId: string;
  qtyOut: number;      // deducted from source (source units)
  qtyIn: number;       // added to target (target units)
  valueMoved: number;  // IDR moved between products
  targetNewAvgCost: number;
  journal: { account: "Inventory"; productId: string; debit: number; credit: number }[];
}

const isPositiveInt = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n) && n > 0;

export function validateRuleInput(input: UnitRuleInput): void {
  if (!input.bigProductId || !input.smallProductId) {
    throw new UnitConversionError("PRODUCT_REQUIRED", "Both products are required.");
  }
  if (input.bigProductId === input.smallProductId) {
    throw new UnitConversionError("SAME_PRODUCT", "From and To must be different products.");
  }
  if (!isPositiveInt(input.ratio)) {
    throw new UnitConversionError("INVALID_RATIO", "Quantity must be a whole number greater than 0.");
  }
}

/**
 * Plan a split (big -> small) or combine (small -> big).
 * split:   quantity is in BIG units.  combine: quantity is in SMALL units (must be multiple of ratio).
 */
export function planUnitOperation(
  rule: UnitRuleRow,
  big: ProductSnapshot,
  small: ProductSnapshot,
  type: UnitOperationType,
  quantity: number
): OperationPlan {
  if (rule.status !== "active") {
    throw new UnitConversionError("RULE_INACTIVE", "This unit rule is inactive.");
  }
  if (!isPositiveInt(quantity)) {
    throw new UnitConversionError("INVALID_QUANTITY", "Quantity must be a whole number greater than 0.");
  }

  const isSplit = type === "split";
  const source = isSplit ? big : small;
  const target = isSplit ? small : big;

  let qtyOut: number;
  let qtyIn: number;
  if (isSplit) {
    qtyOut = quantity;
    qtyIn = quantity * rule.ratio;
  } else {
    if (quantity % rule.ratio !== 0) {
      throw new UnitConversionError("NOT_MULTIPLE", `Quantity must be a multiple of ${rule.ratio} to form whole units.`);
    }
    qtyOut = quantity;
    qtyIn = quantity / rule.ratio;
  }

  // Negative stock is not allowed for unit operations (business rule confirmed).
  // Blocks when source is already negative too, because stockQty < qtyOut then.
  if (source.stockQty < qtyOut) {
    throw new UnitConversionError("INSUFFICIENT_STOCK", `Not enough stock. Available: ${source.stockQty}.`);
  }

  // Value moves at source moving-average cost. Issuing stock does not change the source average.
  const valueMoved = qtyOut * source.avgCost;

  // Target moving average. If target has no positive stock, incoming value sets the average.
  const targetPositive = Math.max(target.stockQty, 0);
  const targetNewAvgCost =
    targetPositive === 0
      ? valueMoved / qtyIn
      : (targetPositive * target.avgCost + valueMoved) / (targetPositive + qtyIn);

  return {
    sourceProductId: source.productId,
    targetProductId: target.productId,
    qtyOut,
    qtyIn,
    valueMoved,
    targetNewAvgCost,
    journal: [
      { account: "Inventory", productId: target.productId, debit: valueMoved, credit: 0 },
      { account: "Inventory", productId: source.productId, debit: 0, credit: valueMoved },
    ],
  };
}
