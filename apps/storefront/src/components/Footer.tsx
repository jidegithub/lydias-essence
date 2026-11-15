import { ArrowDown } from "lucide-react";
import { useSite } from "../context/SiteContext";
import { WordmarkName } from "./WordmarkName";

export function Footer() {
  const { content, logoUrl, storeName, socialLinks } = useSite();

  return (
    <footer className="site-footer">
      <div className="footer-top">
        <a className="wordmark footer-wordmark" href="#home">
          <WordmarkName logoUrl={logoUrl} name={storeName} />
          <span className="wordmark-caption">BEAUTY · SCENT · SELF</span>
        </a>

        <div className="footer-tagline">
          <p>
            {content.footer.tagline.split("\n").map((line, index) => (
              <span key={index}>
                {index > 0 && <br />}
                {line}
              </span>
            ))}
          </p>

          {socialLinks.length > 0 && (
            <div className="footer-social">
              {socialLinks.map((link) => (
                <a key={link.label} href={link.url} target="_blank" rel="noreferrer">
                  {link.label}
                </a>
              ))}
            </div>
          )}
        </div>

        <a href="#home" className="back-to-top">
          Back to the top <ArrowDown size={15} />
        </a>
      </div>

      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} {storeName}</span>
        <span>{content.footer.bottomCenter}</span>
        <span>{content.footer.bottomRight}</span>
      </div>
    </footer>
  );
}
