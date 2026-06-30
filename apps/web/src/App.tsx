import { useEffect, useState } from 'react';
import { FederalSearch } from './components/FederalSearch';
import { NationalCatalog } from './components/NationalCatalog';
import { initTelegram } from './lib/telegram';
import './styles.css';

type AppStep = 'hero' | 'catalog' | 'federal';

export default function App() {
  const [step, setStep] = useState<AppStep>('hero');

  useEffect(() => {
    initTelegram();
  }, []);

  return (
    <main className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <header className="topbar">
        <button className="brand brand-button" onClick={() => setStep('hero')}>ПРОЙДУ<span>?</span></button>
        <div className="season-pill">Россия · 2026</div>
      </header>

      {step === 'hero' && (
        <section className="hero panel-enter">
          <div className="eyebrow">Навигатор поступления по России</div>
          <h1>Введи баллы.<br /><em>Узнай, куда проходишь.</em></h1>
          <p className="hero-copy">
            Выбери предметы ЕГЭ и укажи балл по каждому. Система проверит совместимость программ,
            минимальные баллы, бюджетные места и прошлые проходные результаты в подключённой федеральной базе.
          </p>

          <div className="hero-card national-hero-card">
            <div className="catalog-orbit"><span>89</span><small>регионов в DATA CORE</small></div>
            <div>
              <strong>Один поиск — разные вузы и города</strong>
              <p>Результаты группируются по программам, вузам, городам и уровню риска. Неполные сведения всегда отмечаются.</p>
            </div>
          </div>

          <button className="primary-button pulse" onClick={() => setStep('federal')}>
            Проверить свои баллы <span>→</span>
          </button>
          <button className="secondary-button hero-secondary" onClick={() => setStep('catalog')}>
            Найти вуз по названию
          </button>

          <div className="hero-trust-grid">
            <div><strong>ЕГЭ по предметам</strong><span>Не только общая сумма</span></div>
            <div><strong>Официальные источники</strong><span>Ссылка у каждой проверенной программы</span></div>
            <div><strong>Полный маршрут</strong><span>ИД, приоритеты, сроки и документы</span></div>
          </div>

          <p className="legal-note">
            Каталог организаций шире конкурсного слоя. В подбор попадают только программы, по которым загружены и проверены необходимые документы.
          </p>
        </section>
      )}

      {step === 'catalog' && <NationalCatalog onBack={() => setStep('hero')} />}
      {step === 'federal' && <FederalSearch onBack={() => setStep('hero')} />}
    </main>
  );
}
