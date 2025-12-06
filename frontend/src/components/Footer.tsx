export function Footer() {
  return (
    <footer className="site-footer">
      <div>
        <p className="footer-label">MeterFlow</p>
        <p className="footer-text">Цифровой помощник для учета коммунальных показаний и аналитики.</p>
      </div>
      <div className="footer-links">
        <a href="https://hub.mos.ru/korotkov_aleksey/meterflow" target="_blank" rel="noreferrer">
          Moshub
        </a>
        <a href="https://t.me/born_in_void" target="_blank" rel="noreferrer">
          Telegram @born_in_void
        </a>
        <span>Автор: Алексей Коротков</span>
      </div>
      <div className="footer-badge">
        <span role="img" aria-hidden="true">
          ⚡
        </span>
        <small>Пиши, если есть проблемы. Ну или предложения...</small>
      </div>
    </footer>
  );
}
