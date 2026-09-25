import { Text } from "@chakra-ui/react";

function currencyLabel(currency) {
  if (!currency || currency === "EUR") return "€";
  return currency;
}

function formatAmount(amount) {
  return Number(amount).toLocaleString("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDisplayValue(value, currency) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return `${formatAmount(value)} ${currencyLabel(currency)}`;
  }

  if (value && typeof value === "object") {
    const label = currencyLabel(value.currency || currency);
    if (typeof value.from === "number" && Number.isFinite(value.from)) {
      const to = Number.isFinite(value.to) ? value.to : value.from;
      return value.from === to
        ? `${formatAmount(value.from)} ${label}`
        : `Desde ${formatAmount(value.from)} ${label}`;
    }
    if (typeof value.final === "number" && Number.isFinite(value.final)) {
      return `${formatAmount(value.final)} ${label}`;
    }
  }

  return "Precio no disponible";
}

export function Price({ value, currency = "EUR", ...props }) {
  return (
    <Text fontSize="lg" fontWeight="bold" color="textPrimary" {...props}>
      {formatDisplayValue(value, currency)}
    </Text>
  );
}
