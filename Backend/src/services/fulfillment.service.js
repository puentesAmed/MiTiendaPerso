export class FulfillmentProfileError extends Error {
  constructor(message) {
    super(message);
    this.name = "FulfillmentProfileError";
    this.status = 400;
  }
}

function normalizeNullableDays(value, field) {
  if (value == null || value === "") return null;
  const normalized = Number(value);
  if (!Number.isInteger(normalized) || normalized < 0) {
    throw new FulfillmentProfileError(`${field} debe ser un entero mayor o igual que cero`);
  }
  return normalized;
}

export function normalizeFulfillmentProfile(profile) {
  if (profile == null) return null;
  if (typeof profile !== "object" || Array.isArray(profile)) {
    throw new FulfillmentProfileError("fulfillmentProfile inválido");
  }
  if (typeof profile.preparationRequired !== "boolean") {
    throw new FulfillmentProfileError("preparationRequired debe ser booleano");
  }
  const preparationMinDays = normalizeNullableDays(profile.preparationMinDays, "preparationMinDays");
  const preparationMaxDays = normalizeNullableDays(profile.preparationMaxDays, "preparationMaxDays");
  if ((preparationMinDays == null) !== (preparationMaxDays == null)) {
    throw new FulfillmentProfileError("El plazo de preparación debe incluir mínimo y máximo");
  }
  if (preparationMinDays != null && preparationMaxDays < preparationMinDays) {
    throw new FulfillmentProfileError("preparationMaxDays debe ser mayor o igual que preparationMinDays");
  }
  return { preparationRequired: profile.preparationRequired, preparationMinDays, preparationMaxDays };
}

export function calculateOrderPreparation(lines) {
  const itemRefs = [];
  let preparationRequired = false;
  let pendingConfirmation = false;
  let minDays = 0;
  let maxDays = 0;

  for (const line of lines || []) {
    const profile = line.product?.fulfillmentProfile;
    if (!profile?.preparationRequired) continue;
    preparationRequired = true;
    const configured = Number.isInteger(profile.preparationMinDays)
      && profile.preparationMinDays >= 0
      && Number.isInteger(profile.preparationMaxDays)
      && profile.preparationMaxDays >= profile.preparationMinDays;
    if (!configured) pendingConfirmation = true;
    else {
      minDays = Math.max(minDays, profile.preparationMinDays);
      maxDays = Math.max(maxDays, profile.preparationMaxDays);
    }
    itemRefs.push({
      productId: line.productId,
      name: line.name,
      preparationRequired: true,
      preparationMinDays: configured ? profile.preparationMinDays : null,
      preparationMaxDays: configured ? profile.preparationMaxDays : null,
      configured,
    });
  }

  return {
    preparationRequired,
    status: !preparationRequired ? "not_required" : pendingConfirmation ? "pending_confirmation" : "configured",
    minDays: preparationRequired && !pendingConfirmation ? minDays : null,
    maxDays: preparationRequired && !pendingConfirmation ? maxDays : null,
    itemRefs,
  };
}
