export const CART_PULSE_DURATION_MS = 1000;
export const INITIAL_CART_FEEDBACK = Object.freeze({ active: false, generation: 0 });

export function cartFeedbackReducer(state, action) {
  switch (action.type) {
    case "item-added":
      return { active: true, generation: state.generation + 1 };
    case "pulse-expired":
      return action.generation === state.generation ? { ...state, active: false } : state;
    case "cart-empty":
      return state.active ? { ...state, active: false } : state;
    default:
      return state;
  }
}

export function scheduleCartPulseExpiry(generation, onExpire, scheduler = setTimeout) {
  return scheduler(() => onExpire(generation), CART_PULSE_DURATION_MS);
}

export function calculateCartTotals(items = []) {
  return items.reduce((totals, item) => ({
    totalItems: totals.totalItems + Number(item.quantity || 0),
    totalAmount: totals.totalAmount + Number(item.quantity || 0) * Number(item.presentation?.displayPrice || 0),
  }), { totalItems: 0, totalAmount: 0 });
}
