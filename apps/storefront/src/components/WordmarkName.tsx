import { useEffect, useState } from "react";

/** The shop name in the header/footer: the uploaded logo when there is one, otherwise the text. */
export function WordmarkName({ logoUrl, name }: { logoUrl: string | null; name: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [logoUrl]);

  if (logoUrl && !failed) {
    return <img className="wordmark-logo" src={logoUrl} alt={name} onError={() => setFailed(true)} />;
  }
  return <span className="wordmark-name">{name}</span>;
}