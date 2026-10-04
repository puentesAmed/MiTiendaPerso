function completeProfile(profile) {
  return Number.isFinite(profile?.weightGrams) && profile.weightGrams > 0
    && [profile?.package?.lengthCm, profile?.package?.widthCm, profile?.package?.heightCm]
      .every((value) => Number.isFinite(value) && value > 0);
}

export function planPackaging(lines) {
  const incompleteItemRefs = [];
  const parcels = [];
  for (const line of lines || []) {
    const profile = line.product?.shippingProfile;
    if (!completeProfile(profile)) {
      incompleteItemRefs.push(String(line.productId));
      continue;
    }
    for (let unit = 0; unit < line.quantity; unit += 1) {
      parcels.push({
        weightGrams: profile.weightGrams,
        lengthCm: profile.package.lengthCm,
        widthCm: profile.package.widthCm,
        heightCm: profile.package.heightCm,
        fragile: profile.fragile ?? null,
        stackable: profile.stackable ?? null,
        shippingClass: profile.shippingClass || null,
        itemRefs: [{ productId: String(line.productId), quantity: 1 }],
      });
    }
  }
  if (incompleteItemRefs.length) return { status: "incomplete_profile", parcels: [], incompleteItemRefs };
  return { status: "ready", parcels, incompleteItemRefs: [] };
}

export function calculateParcelWeights(parcel, providerService) {
  const actualWeightGrams = parcel.weightGrams;
  const divisor = providerService?.volumetricDivisor;
  const volumetricWeightGrams = Number.isFinite(divisor) && divisor > 0
    ? ((parcel.lengthCm * parcel.widthCm * parcel.heightCm) / divisor) * 1000
    : null;
  return { actualWeightGrams, volumetricWeightGrams };
}
