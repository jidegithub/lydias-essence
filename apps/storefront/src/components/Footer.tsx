import { ArrowDown } from "lucide-react";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-top">
        <a className="wordmark footer-wordmark" href="#home">
          <span className="wordmark-name">Lydia’s Essence</span>
          <span className="wordmark-caption">BEAUTY · SCENT · SELF</span>
        </a>

        <p>Thoughtful beauty for<br />your everyday moments.</p>

        <a href="#home" className="back-to-top">
          Back to the top <ArrowDown size={15} />
        </a>
      </div>

      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} Lydia’s Essence</span>
        <span>Made for your moments.</span>
        <span>Prices displayed in Nigerian naira (₦).</span>
      </div>
    </footer>
  );
}
