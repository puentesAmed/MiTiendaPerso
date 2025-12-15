import { useEffect, useState } from "react";

export function useImage(url) {
  const [image, setImage] = useState(null);

  useEffect(() => {
    if (!url) return;
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.src = url;
    img.onload = () => setImage(img);
  }, [url]);

  return image;
}
