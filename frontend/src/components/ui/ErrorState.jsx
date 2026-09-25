import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Box,
  Button,
} from "@chakra-ui/react";

export function ErrorState({
  title = "No se pudo cargar el contenido",
  description,
  onRetry,
  retryLabel = "Reintentar",
  ...props
}) {
  return (
    <Alert status="error" alignItems="flex-start" {...props}>
      <AlertIcon mt={1} />
      <Box flex="1">
        <AlertTitle>{title}</AlertTitle>
        {description && <AlertDescription>{description}</AlertDescription>}
        {onRetry && (
          <Button mt={3} size="sm" variant="outline" onClick={onRetry}>
            {retryLabel}
          </Button>
        )}
      </Box>
    </Alert>
  );
}
