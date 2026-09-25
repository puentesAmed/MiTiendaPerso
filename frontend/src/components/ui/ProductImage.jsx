import { AspectRatio, Image } from "@chakra-ui/react";

const DEFAULT_FALLBACK = "/images/fallback-product.png";

export function ProductImage({
  src,
  alt,
  ratio = 4 / 3,
  objectFit = "contain",
  fallbackSrc = DEFAULT_FALLBACK,
  loading = "lazy",
  imageProps,
  ...props
}) {
  return (
    <AspectRatio ratio={ratio} bg="bgSubtle" overflow="hidden" {...props}>
      <Image
        src={src || fallbackSrc}
        fallbackSrc={fallbackSrc}
        alt={alt}
        loading={loading}
        objectFit={objectFit}
        w="100%"
        h="100%"
        {...imageProps}
      />
    </AspectRatio>
  );
}
