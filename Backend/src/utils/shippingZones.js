export function resolveShippingZone(address) {
  if (!address || !address.country) return "peninsula";

  if (address.country.toLowerCase() !== "españa") {
    return "international";
  }

  const islands = [
    "Islas Canarias",
    "Canarias",
    "Islas Baleares",
    "Baleares",
    "Ceuta",
    "Melilla",
  ];

  if (islands.includes(address.state)) {
    return "islands";
  }

  return "peninsula";
}
