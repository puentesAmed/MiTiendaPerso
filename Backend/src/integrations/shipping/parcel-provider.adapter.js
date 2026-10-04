export async function quoteParcelWithProvider({ provider, destination, parcels, serviceLevel }) {
  if (!provider || typeof provider.quoteParcel !== "function") return null;
  return provider.quoteParcel({ destination, parcels, serviceLevel });
}
