import { Search, Download, ArrowLeft, X, BookOpen, ChevronDown } from 'lucide-react';
import { useState, useMemo } from 'react';

type Material = {
  type: 'ДИКТОВКА' | 'ЛЕКЦИЯ';
  master: string;
  title: string;
  dateGiven: string;
  dateGivenYear: number;
};

type Pearl = {
  publishMonth: string;
  publishYear: number;
  materials: Material[];
};

const MONTHS_RU: Record<string, string> = {
  'января': '01', 'февраля': '02', 'марта': '03', 'апреля': '04',
  'мая': '05', 'июня': '06', 'июля': '07', 'августа': '08',
  'сентября': '09', 'октября': '10', 'ноября': '11', 'декабря': '12'
};

function formatDateNumeric(dateGiven: string): string {
  const parts = dateGiven.replace(' год', '').trim().split(' ');
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0');
    const month = MONTHS_RU[parts[1]] ?? '??';
    const year = parts[2];
    return `${day}.${month}.${year}`;
  }
  return dateGiven;
}

const pearlsData: Pearl[] = [
  // 2013
  { publishMonth: 'Декабрь', publishYear: 2013, materials: [{ type: 'ДИКТОВКА', master: 'Сен-Жермен', title: 'Алхимия духа', dateGiven: '31 декабря 1989 год', dateGivenYear: 1989 }] },
  { publishMonth: 'Ноябрь', publishYear: 2013, materials: [{ type: 'ДИКТОВКА', master: 'Архангел Михаил', title: 'Защита веры', dateGiven: '11 ноября 1988 год', dateGivenYear: 1988 }] },
  { publishMonth: 'Октябрь', publishYear: 2013, materials: [{ type: 'ЛЕКЦИЯ', master: 'Элизабет Клэр Профет', title: 'Путь посвящений', dateGiven: '15 октября 1987 год', dateGivenYear: 1987 }] },
  { publishMonth: 'Сентябрь', publishYear: 2013, materials: [{ type: 'ДИКТОВКА', master: 'Гаутама Будда', title: 'Срединный путь', dateGiven: '29 сентября 1991 год', dateGivenYear: 1991 }] },
  { publishMonth: 'Август', publishYear: 2013, materials: [{ type: 'ДИКТОВКА', master: 'Мать Мария', title: 'Материнское пламя', dateGiven: '15 августа 1985 год', dateGivenYear: 1985 }, { type: 'ЛЕКЦИЯ', master: 'Марк Л. Профет', title: 'Божественная Мать', dateGiven: '18 августа 1985 год', dateGivenYear: 1985 }] },
  { publishMonth: 'Июль', publishYear: 2013, materials: [{ type: 'ДИКТОВКА', master: 'Эль Мория', title: 'Первый луч воли Бога', dateGiven: '4 июля 1990 год', dateGivenYear: 1990 }] },
  { publishMonth: 'Июнь', publishYear: 2013, materials: [{ type: 'ДИКТОВКА', master: 'Вознесённый Кутхуми', title: 'Сосуд доброты', dateGiven: '5 мая 1991 год', dateGivenYear: 1991 }, { type: 'ДИКТОВКА', master: 'Вознесённый Кутхуми', title: 'Меч мира', dateGiven: '9 августа 1970 год', dateGivenYear: 1970 }] },
  { publishMonth: 'Май', publishYear: 2013, materials: [{ type: 'ДИКТОВКА', master: 'Иисус Христос', title: 'Воскресение духа', dateGiven: '1 мая 1986 год', dateGivenYear: 1986 }] },
  { publishMonth: 'Апрель', publishYear: 2013, materials: [{ type: 'ЛЕКЦИЯ', master: 'Элизабет Клэр Профет', title: 'Энергия Элохим', dateGiven: '12 апреля 2013 год', dateGivenYear: 2013 }, { type: 'ЛЕКЦИЯ', master: 'Элизабет Клэр Профет', title: 'Посвящения под Мировыми Учителями', dateGiven: '15 апреля 2013 год', dateGivenYear: 2013 }] },
  { publishMonth: 'Март', publishYear: 2013, materials: [{ type: 'ДИКТОВКА', master: 'Ланто', title: 'Мудрость золотого века', dateGiven: '21 марта 1982 год', dateGivenYear: 1982 }] },
  { publishMonth: 'Февраль', publishYear: 2013, materials: [{ type: 'ДИКТОВКА', master: 'Серапис Бей', title: 'Дисциплина на пути', dateGiven: '14 февраля 1979 год', dateGivenYear: 1979 }] },
  { publishMonth: 'Январь', publishYear: 2013, materials: [{ type: 'ДИКТОВКА', master: 'Портия', title: 'Справедливость и возможность', dateGiven: '1 января 1983 год', dateGivenYear: 1983 }] },

  // 2012
  { publishMonth: 'Декабрь', publishYear: 2012, materials: [{ type: 'ДИКТОВКА', master: 'Иисус Христос', title: 'Христосознание', dateGiven: '25 декабря 1987 год', dateGivenYear: 1987 }] },
  { publishMonth: 'Ноябрь', publishYear: 2012, materials: [{ type: 'ДИКТОВКА', master: 'Циклопей', title: 'Всевидящее око', dateGiven: '7 ноября 1980 год', dateGivenYear: 1980 }] },
  { publishMonth: 'Октябрь', publishYear: 2012, materials: [{ type: 'ЛЕКЦИЯ', master: 'Элизабет Клэр Профет', title: 'Наука изречённого слова', dateGiven: '31 октября 1984 год', dateGivenYear: 1984 }, { type: 'ДИКТОВКА', master: 'Илларион', title: 'Истина и исцеление', dateGiven: '5 октября 1984 год', dateGivenYear: 1984 }] },
  { publishMonth: 'Сентябрь', publishYear: 2012, materials: [{ type: 'ДИКТОВКА', master: 'Господа Майтрейя', title: 'Возлюбленный Господь Майтрейя', dateGiven: '2 августа 1970 год', dateGivenYear: 1970 }] },
  { publishMonth: 'Август', publishYear: 2012, materials: [{ type: 'ЛЕКЦИЯ', master: 'Элизабет Клэр Профет', title: 'Вопрос человеческих отношений', dateGiven: '22 декабря 1984 год', dateGivenYear: 1984 }] },
  { publishMonth: 'Июль', publishYear: 2012, materials: [{ type: 'ДИКТОВКА', master: 'Нада', title: 'Путь служения', dateGiven: '4 июля 1981 год', dateGivenYear: 1981 }] },
  { publishMonth: 'Июнь', publishYear: 2012, materials: [{ type: 'ДИКТОВКА', master: 'Архангел Уриил', title: 'Служение и мир', dateGiven: '15 июня 1978 год', dateGivenYear: 1978 }] },
  { publishMonth: 'Май', publishYear: 2012, materials: [{ type: 'ДИКТОВКА', master: 'Павел Венецианец', title: 'Красота и любовь', dateGiven: '5 мая 1985 год', dateGivenYear: 1985 }] },
  { publishMonth: 'Апрель', publishYear: 2012, materials: [{ type: 'ДИКТОВКА', master: 'Мать Мария', title: 'Непорочное зачатие', dateGiven: '8 апреля 1977 год', dateGivenYear: 1977 }] },
  { publishMonth: 'Март', publishYear: 2012, materials: [{ type: 'ЛЕКЦИЯ', master: 'Марк Л. Профет', title: 'Семь лучей', dateGiven: '21 марта 1973 год', dateGivenYear: 1973 }] },
  { publishMonth: 'Февраль', publishYear: 2012, materials: [{ type: 'ДИКТОВКА', master: 'Эль Мория', title: 'Воля Бога', dateGiven: '28 февраля 1980 год', dateGivenYear: 1980 }] },
  { publishMonth: 'Январь', publishYear: 2012, materials: [{ type: 'ДИКТОВКА', master: 'Сен-Жермен', title: 'Фиолетовое пламя', dateGiven: '1 января 1979 год', dateGivenYear: 1979 }] },

  // 2011
  { publishMonth: 'Декабрь', publishYear: 2011, materials: [{ type: 'ДИКТОВКА', master: 'Архангел Гавриил', title: 'Чистота и священный огонь', dateGiven: '25 декабря 1975 год', dateGivenYear: 1975 }, { type: 'ЛЕКЦИЯ', master: 'Элизабет Клэр Профет', title: 'Путь к просветлению', dateGiven: '28 декабря 1975 год', dateGivenYear: 1975 }, { type: 'ДИКТОВКА', master: 'Сен-Жермен', title: 'Пламя свободы', dateGiven: '31 декабря 1975 год', dateGivenYear: 1975 }] },
  { publishMonth: 'Ноябрь', publishYear: 2011, materials: [{ type: 'ДИКТОВКА', master: 'Эль Мория', title: 'Воля Бога', dateGiven: '15 ноября 1980 год', dateGivenYear: 1980 }] },
  { publishMonth: 'Октябрь', publishYear: 2011, materials: [{ type: 'ДИКТОВКА', master: 'Кутхуми', title: 'Мудрость сердца', dateGiven: '10 октября 1986 год', dateGivenYear: 1986 }] },
  { publishMonth: 'Сентябрь', publishYear: 2011, materials: [{ type: 'ЛЕКЦИЯ', master: 'Элизабет Клэр Профет', title: 'Призывы к седьмому лучу', dateGiven: '29 сентября 1983 год', dateGivenYear: 1983 }] },
  { publishMonth: 'Август', publishYear: 2011, materials: [{ type: 'ДИКТОВКА', master: 'Иисус Христос', title: 'Любовь Божья', dateGiven: '15 августа 1982 год', dateGivenYear: 1982 }] },
  { publishMonth: 'Июль', publishYear: 2011, materials: [{ type: 'ДИКТОВКА', master: 'Великое Божественное Направление', title: 'Божественный план', dateGiven: '4 июля 1976 год', dateGivenYear: 1976 }] },
  { publishMonth: 'Июнь', publishYear: 2011, materials: [{ type: 'ДИКТОВКА', master: 'Архангел Рафаил', title: 'Исцеление наций', dateGiven: '15 июня 1981 год', dateGivenYear: 1981 }] },
  { publishMonth: 'Май', publishYear: 2011, materials: [{ type: 'ДИКТОВКА', master: 'Серапис Бей', title: 'Вознесение', dateGiven: '1 мая 1978 год', dateGivenYear: 1978 }] },
  { publishMonth: 'Апрель', publishYear: 2011, materials: [{ type: 'ЛЕКЦИЯ', master: 'Марк Л. Профет', title: 'Трёхлепестковое пламя', dateGiven: '17 апреля 1972 год', dateGivenYear: 1972 }] },
  { publishMonth: 'Март', publishYear: 2011, materials: [{ type: 'ДИКТОВКА', master: 'Ланто', title: 'Коронная чакра', dateGiven: '21 марта 1977 год', dateGivenYear: 1977 }] },
  { publishMonth: 'Февраль', publishYear: 2011, materials: [{ type: 'ДИКТОВКА', master: 'Мать Мария', title: 'Материнское пламя', dateGiven: '14 февраля 1983 год', dateGivenYear: 1983 }] },
  { publishMonth: 'Январь', publishYear: 2011, materials: [{ type: 'ДИКТОВКА', master: 'Сен-Жермен', title: 'Новая эра', dateGiven: '1 января 1975 год', dateGivenYear: 1975 }] }
];

export default function App() {
  const [selectedPearl, setSelectedPearl] = useState<Pearl | null>(null);
  const [filterMaster, setFilterMaster] = useState<string | null>(null);
  const [filterYear, setFilterYear] = useState<number | null>(null);
  const [hoveredPearlIndex, setHoveredPearlIndex] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterPublishYear, setFilterPublishYear] = useState<number | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Get filtered pearls
  const getFilteredPearls = () => {
    return pearlsData.filter(pearl => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch = !q || pearl.materials.some(m =>
        m.master.toLowerCase().includes(q) ||
        m.title.toLowerCase().includes(q) ||
        m.dateGiven.toLowerCase().includes(q) ||
        pearl.publishMonth.toLowerCase().includes(q)
      );
      const matchesFilters = pearl.materials.some(m => {
        const masterMatch = !filterMaster || m.master === filterMaster;
        const yearMatch = !filterYear || m.dateGivenYear === filterYear;
        return masterMatch && yearMatch;
      });
      return matchesSearch && (!filterMaster && !filterYear ? true : matchesFilters);
    });
  };

  const filteredPearls = getFilteredPearls().filter(p =>
    !filterPublishYear || p.publishYear === filterPublishYear
  );

  // All publish years present in data, sorted descending
  const allPublishYears = Array.from(new Set(pearlsData.map(p => p.publishYear))).sort((a, b) => b - a);
  // Years to show in tables (respecting publish year filter)
  const publishYears = filterPublishYear ? [filterPublishYear] : allPublishYears;

  // Generate stars once and memoize
  const stars = useMemo(() => {
    const largeStars = [...Array(50)].map((_, i) => ({
      key: `large-${i}`,
      top: Math.random() * 100,
      left: Math.random() * 100,
      size: Math.random() * 3 + 2,
      opacity: Math.random() * 0.8 + 0.2,
      glow: Math.random() * 10 + 5
    }));

    const mediumStars = [...Array(150)].map((_, i) => ({
      key: `medium-${i}`,
      top: Math.random() * 100,
      left: Math.random() * 100,
      opacity: Math.random() * 0.6 + 0.4,
      glow: Math.random() * 4 + 2
    }));

    const smallStars = [...Array(200)].map((_, i) => ({
      key: `small-${i}`,
      top: Math.random() * 100,
      left: Math.random() * 100,
      opacity: Math.random() * 0.5 + 0.3
    }));

    return { largeStars, mediumStars, smallStars };
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0118] relative overflow-hidden font-[Georgia,serif]" onClick={() => setOpenDropdown(null)}>
      {/* Starry Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0118] via-[#1a0b3e] to-[#0d051f]"></div>

        {/* Large stars with glow */}
        {stars.largeStars.map((star) => (
          <div
            key={star.key}
            className="absolute rounded-full bg-white shadow-lg"
            style={{
              top: `${star.top}%`,
              left: `${star.left}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              opacity: star.opacity,
              boxShadow: `0 0 ${star.glow}px rgba(255, 255, 255, 0.8)`
            }}
          />
        ))}

        {/* Medium stars */}
        {stars.mediumStars.map((star) => (
          <div
            key={star.key}
            className="absolute w-1 h-1 bg-white rounded-full"
            style={{
              top: `${star.top}%`,
              left: `${star.left}%`,
              opacity: star.opacity,
              boxShadow: `0 0 ${star.glow}px rgba(255, 255, 255, 0.5)`
            }}
          />
        ))}

        {/* Small stars */}
        {stars.smallStars.map((star) => (
          <div
            key={star.key}
            className="absolute bg-white rounded-full"
            style={{
              top: `${star.top}%`,
              left: `${star.left}%`,
              width: '1px',
              height: '1px',
              opacity: star.opacity
            }}
          />
        ))}

        {/* Colored nebula effects */}
        <div className="absolute top-20 left-10 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-40 right-20 w-80 h-80 bg-blue-600/20 rounded-full blur-3xl"></div>
        <div className="absolute top-60 right-40 w-64 h-64 bg-pink-500/15 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-60 w-72 h-72 bg-cyan-600/15 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 left-1/3 w-64 h-64 bg-fuchsia-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-600/15 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10">
        {/* Overscroll cover — fills the rubber-band area revealed above the header */}
        <div
          className="fixed left-0 right-0 bg-gradient-to-r from-indigo-950 via-purple-900 to-pink-950 z-[99]"
          style={{ top: '-100vh', height: '100vh' }}
        />
        {/* Header */}
        <header className="bg-gradient-to-r from-indigo-950 via-purple-900 to-pink-950 border-b-2 border-violet-400/60 sticky top-0 z-[100]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
            {/* Desktop: title left, search right on same line */}
            <div className="hidden sm:flex items-center justify-between gap-4">
              <button onClick={() => setSelectedPearl(null)} className="text-left">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-200 via-violet-200 to-pink-200 bg-clip-text text-transparent drop-shadow-lg">
                  Жемчужины Мудрости
                </h1>
              </button>
              <div className="relative w-80">
                <input
                  type="text"
                  placeholder="Поиск по Владыке, названию..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="px-4 py-2 bg-indigo-900/60 border-2 border-pink-400/40 rounded-lg text-violet-100 placeholder-pink-300/60 focus:outline-none focus:border-pink-400 focus:shadow-lg focus:shadow-pink-500/20 w-full transition-all pr-10"
                />
                {searchQuery ? (
                  <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-pink-300 hover:text-pink-100 transition-colors" title="Очистить поиск">✕</button>
                ) : (
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-pink-300" />
                )}
              </div>
            </div>

            {/* Mobile: title centered, search below narrower */}
            <div className="sm:hidden">
              <button onClick={() => setSelectedPearl(null)} className="block w-full text-center mb-2">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-200 via-violet-200 to-pink-200 bg-clip-text text-transparent drop-shadow-lg">
                  Жемчужины Мудрости
                </h1>
              </button>
              <div className="relative mx-auto w-3/4">
                <input
                  type="text"
                  placeholder="Поиск..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="px-4 py-1.5 bg-indigo-900/60 border-2 border-pink-400/40 rounded-lg text-violet-100 placeholder-pink-300/60 focus:outline-none focus:border-pink-400 focus:shadow-lg focus:shadow-pink-500/20 w-full transition-all pr-10 text-sm"
                />
                {searchQuery ? (
                  <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-pink-300 hover:text-pink-100 transition-colors" title="Очистить поиск">✕</button>
                ) : (
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-pink-300" />
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        {/* Mobile detail — full-screen dark overlay, no stars, no nested cards */}
          {selectedPearl && (
            <div
              className="sm:hidden fixed inset-0 z-[200] overflow-y-auto"
              style={{ background: '#1a1228' }}
            >
              {/* Mobile top bar */}
              <div className="px-4 py-3 border-b border-violet-400/20" style={{ background: '#120d1f' }}>
                <button
                  onClick={() => setSelectedPearl(null)}
                  className="mb-3 flex items-center gap-2 px-4 py-2 border border-violet-400/30 rounded-lg text-violet-300 text-sm"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Назад к списку
                </button>
                <div className="text-violet-200 text-base font-semibold">{selectedPearl.publishMonth} {selectedPearl.publishYear}</div>
              </div>

              <div className="px-4 py-5">
                {/* Download buttons */}
                <div className="flex gap-2 mb-6 pb-5 border-b border-violet-400/20">
                  <button className="flex-1 py-2 rounded-lg text-white text-xs font-semibold flex items-center justify-center gap-1" style={{ background: '#9b1b30' }}><Download className="w-3 h-3" />PDF</button>
                  <button className="flex-1 py-2 rounded-lg text-white text-xs font-semibold flex items-center justify-center gap-1" style={{ background: '#2b579a' }}><Download className="w-3 h-3" />DOCX</button>
                  <button className="flex-1 py-2 rounded-lg text-white text-xs font-semibold flex items-center justify-center gap-1" style={{ background: '#5a9e30' }}><Download className="w-3 h-3" />EPUB</button>
                  <button className="flex-1 py-2 rounded-lg text-white text-xs font-semibold flex items-center justify-center gap-1" style={{ background: '#3a3a3a' }}><Download className="w-3 h-3" />TXT</button>
                </div>

                {/* Materials */}
                {selectedPearl.materials.map((material, index) => (
                  <div key={index}>
                    {index > 0 && <div className="border-t border-violet-400/20 my-6" />}
                    <p className="text-xs text-violet-400 uppercase mb-1">{material.type}</p>
                    <p className="text-cyan-200 mb-1">{material.master}</p>
                    <h3 className="text-lg font-bold bg-gradient-to-r from-cyan-200 via-violet-200 to-pink-200 bg-clip-text text-transparent mb-1">
                      «{material.title}»
                    </h3>
                    <p className="text-violet-400 text-xs mb-5">({material.dateGiven})</p>
                    <p style={{ color: '#f0eaf8', lineHeight: '1.9', fontSize: '1.05rem', marginBottom: '1.25rem', fontFamily: 'Georgia, serif' }}>
                      Приветствую вас, возлюбленные ученики на Пути! Я обращаюсь к вам в этот священный час, чтобы передать учение о природе вознесения и вашем духовном развитии.
                    </p>
                    <p style={{ color: '#f0eaf8', lineHeight: '1.9', fontSize: '1.05rem', marginBottom: '1.25rem', fontFamily: 'Georgia, serif' }}>
                      Путь к вознесению начинается с понимания вашей истинной природы. Вы не просто физические существа, но духовные искры Божественного Пламени, воплощённые в материю для достижения мастерства на всех планах бытия.
                    </p>
                    <p style={{ color: '#f0eaf8', lineHeight: '1.9', fontSize: '1.05rem', fontFamily: 'Georgia, serif' }}>
                      Да пребудет с вами Свет Вознесённых Владык на вашем пути!
                    </p>
                  </div>
                ))}

                {/* Back button bottom */}
                <button
                  onClick={() => setSelectedPearl(null)}
                  className="mt-8 flex items-center gap-2 px-4 py-2 border border-violet-400/30 rounded-lg text-violet-300 text-sm"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Назад к списку
                </button>
              </div>
            </div>
          )}

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {selectedPearl ? (
            /* Desktop Detail View */
            <div className="hidden sm:block">
              {/* Back Button */}
              <button
                onClick={() => setSelectedPearl(null)}
                className="mb-6 flex items-center gap-2 px-4 py-2 bg-indigo-900/60 border border-violet-400/40 rounded-lg text-violet-200 hover:bg-indigo-900/80 hover:border-violet-400/60 transition-all"
              >
                <ArrowLeft className="w-5 h-5" />
                Назад к списку
              </button>

              {/* Pearl Detail Card */}
              <div className="bg-gradient-to-br from-indigo-950/60 via-purple-950/60 to-pink-950/60 border-2 border-violet-400/40 rounded-2xl p-8 shadow-2xl shadow-violet-500/20">
                <h2 className="text-3xl font-bold text-violet-200 mb-6">{selectedPearl.publishMonth} {selectedPearl.publishYear}</h2>

                {/* Download Buttons */}
                <div className="border-y border-violet-400/30 py-4 mb-8">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-violet-400 text-xs uppercase tracking-wide mr-1">Скачать:</span>
                    <button className="px-4 py-2 rounded-lg text-white transition-opacity hover:opacity-90 flex items-center gap-2 text-sm font-semibold" style={{ background: '#9b1b30' }}><Download className="w-4 h-4" />PDF</button>
                    <button className="px-3 py-2 rounded-lg text-white transition-opacity hover:opacity-90 flex items-center gap-2 text-sm font-semibold" style={{ background: '#2b579a' }}><Download className="w-3.5 h-3.5" />DOCX</button>
                    <button className="px-3 py-2 rounded-lg text-white transition-opacity hover:opacity-90 flex items-center gap-2 text-sm font-semibold" style={{ background: '#5a9e30' }}><Download className="w-3.5 h-3.5" />EPUB</button>
                    <button className="px-3 py-2 rounded-lg text-white transition-opacity hover:opacity-90 flex items-center gap-2 text-sm font-semibold" style={{ background: '#3a3a3a' }}><Download className="w-3.5 h-3.5" />TXT</button>
                  </div>
                </div>

                {/* Materials */}
                <div>
                  {selectedPearl.materials.map((material, index) => (
                    <div key={index}>
                      {index > 0 && <div className="border-t-2 border-violet-400/30 my-8"></div>}
                      <div>
                        <p className="text-sm text-violet-400 uppercase mb-2">{material.type}</p>
                        <p className="text-lg text-cyan-200 mb-2">{material.master}</p>
                        <h3 className="text-2xl font-bold bg-gradient-to-r from-cyan-200 via-violet-200 to-pink-200 bg-clip-text text-transparent mb-2">
                          «{material.title}»
                        </h3>
                        <p className="text-violet-300 text-sm mb-6">({material.dateGiven})</p>
                        <div style={{ background: '#1a1228', border: '1px solid rgba(139, 92, 246, 0.25)', borderRadius: '12px', padding: '2rem 2.5rem' }}>
                          <p style={{ color: '#f0eaf8', lineHeight: '1.9', fontSize: '1.05rem', marginBottom: '1.25rem', fontFamily: 'Georgia, serif' }}>
                            Приветствую вас, возлюбленные ученики на Пути! Я обращаюсь к вам в этот священный час, чтобы передать учение о природе вознесения и вашем духовном развитии.
                          </p>
                          <p style={{ color: '#f0eaf8', lineHeight: '1.9', fontSize: '1.05rem', marginBottom: '1.25rem', fontFamily: 'Georgia, serif' }}>
                            Путь к вознесению начинается с понимания вашей истинной природы. Вы не просто физические существа, но духовные искры Божественного Пламени, воплощённые в материю для достижения мастерства на всех планах бытия.
                          </p>
                          <p style={{ color: '#f0eaf8', lineHeight: '1.9', fontSize: '1.05rem', fontFamily: 'Georgia, serif' }}>
                            Да пребудет с вами Свет Вознесённых Владык на вашем пути!
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Back Button — bottom */}
              <button
                onClick={() => setSelectedPearl(null)}
                className="mt-6 flex items-center gap-2 px-4 py-2 bg-indigo-900/60 border border-violet-400/40 rounded-lg text-violet-200 hover:bg-indigo-900/80 hover:border-violet-400/60 transition-all"
              >
                <ArrowLeft className="w-5 h-5" />
                Назад к списку
              </button>
            </div>
          ) : (
            /* List View */
            <div>
              {/* Filter bar — one row */}
              <div className="mb-6 flex items-center gap-3 flex-wrap">
                {/* Year select — always visible */}
                <select
                  value={filterPublishYear ?? ''}
                  onChange={e => setFilterPublishYear(e.target.value ? Number(e.target.value) : null)}
                  className="px-3 py-1.5 bg-indigo-900/60 border-2 border-violet-500/40 rounded-lg text-violet-200 text-sm focus:outline-none focus:border-violet-400 transition-colors cursor-pointer min-w-[120px]"
                >
                  <option value="">Все годы</option>
                  {allPublishYears.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>

                {/* Active filters — appear on the right */}
                {filterMaster && (
                  <span className="inline-flex items-center gap-2 pl-3 pr-1 py-1 bg-cyan-900/60 border border-cyan-400/50 rounded-full text-cyan-100 text-sm ml-auto">
                    {filterMaster}
                    <button onClick={() => setFilterMaster(null)} className="w-5 h-5 rounded-full bg-cyan-400/20 hover:bg-cyan-400/60 border border-cyan-400/40 flex items-center justify-center transition-colors flex-shrink-0" title="Снять фильтр">
                      <X className="w-3 h-3 text-cyan-200" />
                    </button>
                  </span>
                )}
                {filterYear && (
                  <span className={`inline-flex items-center gap-2 pl-3 pr-1 py-1 bg-pink-900/60 border border-pink-400/50 rounded-full text-pink-100 text-sm ${!filterMaster ? 'ml-auto' : ''}`}>
                    Год: {filterYear}
                    <button onClick={() => setFilterYear(null)} className="w-5 h-5 rounded-full bg-pink-400/20 hover:bg-pink-400/60 border border-pink-400/40 flex items-center justify-center transition-colors flex-shrink-0" title="Снять фильтр">
                      <X className="w-3 h-3 text-pink-200" />
                    </button>
                  </span>
                )}
              </div>

              {/* Table View - Separate table for each year */}
              <div className="space-y-12">
                  {publishYears.map(year => {
                    const yearPearls = filteredPearls.filter(p => p.publishYear === year);
                    if (yearPearls.length === 0) return null;

                    return (
                      <div key={year}>
                        {/* Year Header */}
                        <div className="mb-6 flex items-center gap-4">
                          <div className="h-1 w-16 bg-gradient-to-r from-cyan-500 to-pink-500 rounded-full"></div>
                          <h2 className="text-4xl font-bold bg-gradient-to-r from-pink-300 via-violet-300 to-cyan-300 bg-clip-text text-transparent drop-shadow-lg">
                            {year}
                          </h2>
                          <div className="h-1 flex-1 bg-gradient-to-r from-pink-500 via-violet-500 to-cyan-500 rounded-full opacity-50"></div>
                        </div>

                        {/* Desktop Table */}
                        <div className="hidden sm:block bg-gradient-to-br from-indigo-950/60 via-purple-950/60 to-pink-950/60 border-2 border-violet-400/40 rounded-2xl overflow-hidden shadow-2xl shadow-violet-500/20">
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead>
                                <tr className="bg-gradient-to-r from-indigo-900/80 via-purple-900/80 to-pink-900/80 border-b-2 border-violet-400/40">
                                  <th className="px-4 py-3 text-left text-sm font-semibold text-cyan-200 w-28 border-r-2 border-violet-400/40">Месяц</th>
                                  <th className="px-4 py-3 text-left text-sm font-semibold text-violet-200 w-44">Тип / Автор</th>
                                  <th className="px-4 py-3 text-center text-sm font-semibold text-pink-200">Название</th>
                                  <th className="px-4 py-3 text-left text-sm font-semibold text-cyan-200 w-52">Скачать</th>
                                </tr>
                              </thead>
                              <tbody>
                                {yearPearls.map((pearl, pearlIndex) => {
                                  const pearlKey = `${year}-${pearlIndex}`;
                                  return pearl.materials.map((material, matIndex) => (
                                    <tr
                                      key={`${pearlIndex}-${matIndex}`}
                                      className={`${matIndex === 0 ? 'border-t-2 border-violet-400/60' : 'border-t border-violet-400/30'} ${hoveredPearlIndex === pearlKey ? 'bg-gradient-to-r from-violet-500/10 via-pink-500/10 to-cyan-500/10' : ''} transition-colors cursor-pointer`}
                                      onClick={() => setSelectedPearl(pearl)}
                                      onMouseEnter={() => setHoveredPearlIndex(pearlKey)}
                                      onMouseLeave={() => setHoveredPearlIndex(null)}
                                    >
                                      {matIndex === 0 && (
                                        <td rowSpan={pearl.materials.length} className="px-4 py-3 text-violet-100 align-middle font-semibold border-r-2 border-violet-400/40">
                                          {pearl.publishMonth}
                                        </td>
                                      )}
                                      <td className="px-4 py-3 align-middle">
                                        <p className="text-xs text-violet-400 uppercase leading-none mb-0.5">{material.type}</p>
                                        <p className="text-cyan-200 leading-snug cursor-pointer hover:text-cyan-100 transition-colors whitespace-nowrap" onClick={(e) => { e.stopPropagation(); setFilterMaster(material.master); }}>
                                          {material.master}
                                        </p>
                                      </td>
                                      <td className="px-4 py-1 align-middle text-center">
                                        <p className="text-pink-100 leading-snug" style={{ fontSize: '1.1rem' }}>«{material.title}»</p>
                                      </td>
                                      {matIndex === 0 && (
                                        <td rowSpan={pearl.materials.length} className="px-4 py-3 align-middle">
                                          <div className="flex items-center gap-1.5 justify-center" onClick={(e) => e.stopPropagation()}>
                                            {/* Читать */}
                                            <button
                                              onClick={() => setSelectedPearl(pearl)}
                                              className="px-3 py-1.5 rounded text-white text-xs font-semibold transition-opacity hover:opacity-90 flex items-center gap-1"
                                              style={{ background: '#0d9e6e' }}
                                            >
                                              <BookOpen className="w-3 h-3" />Читать
                                            </button>
                                            {/* PDF */}
                                            <button className="px-3 py-1.5 rounded text-white text-xs font-semibold transition-opacity hover:opacity-90 flex items-center gap-1" style={{ background: '#9b1b30' }}>
                                              <Download className="w-3 h-3" />PDF
                                            </button>
                                            {/* Скачать dropdown */}
                                            <div className="relative">
                                              <button
                                                onClick={() => setOpenDropdown(openDropdown === pearlKey ? null : pearlKey)}
                                                className="px-2 py-1.5 bg-indigo-900/50 hover:bg-indigo-900/70 border border-violet-500/30 rounded text-violet-300 text-xs transition-colors flex items-center gap-0.5"
                                              >
                                                Скачать<ChevronDown className="w-3 h-3" />
                                              </button>
                                              {openDropdown === pearlKey && (
                                                <div className="absolute right-0 top-full mt-1 z-50 bg-indigo-950 border border-violet-400/40 rounded-lg shadow-xl min-w-[90px] py-1">
                                                  <button className="w-full px-3 py-1.5 text-left text-xs transition-colors hover:opacity-80 flex items-center gap-2" style={{ color: '#5b9bd5' }}><Download className="w-3 h-3" />DOCX</button>
                                                  <button className="w-full px-3 py-1.5 text-left text-xs transition-colors hover:opacity-80 flex items-center gap-2" style={{ color: '#6bbf47' }}><Download className="w-3 h-3" />EPUB</button>
                                                  <button className="w-full px-3 py-1.5 text-left text-xs transition-colors hover:opacity-80 flex items-center gap-2" style={{ color: '#c0c0c0' }}><Download className="w-3 h-3" />TXT</button>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        </td>
                                      )}
                                    </tr>
                                  ));
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Mobile Cards */}
                        <div className="sm:hidden space-y-3">
                          {yearPearls.map((pearl, pearlIndex) => (
                            <div
                              key={pearlIndex}
                              onClick={() => setSelectedPearl(pearl)}
                              className="bg-gradient-to-br from-indigo-950/70 via-purple-950/70 to-pink-950/70 border border-violet-400/40 rounded-xl overflow-hidden cursor-pointer hover:bg-gradient-to-r hover:from-violet-500/5 hover:via-pink-500/5 hover:to-cyan-500/5 active:scale-[0.98] transition-all"
                            >
                              {/* Card Header */}
                              <div className="flex items-center justify-between px-4 py-2 bg-indigo-900/60 border-b border-violet-400/30">
                                <span className="text-violet-200 font-semibold text-sm">{pearl.publishMonth} {year}</span>
                                <span className="text-violet-400 text-xs">{pearl.materials.length} {pearl.materials.length === 1 ? 'материал' : 'материала'}</span>
                              </div>
                              {/* Materials */}
                              <div className="divide-y divide-violet-400/20">
                                {pearl.materials.map((material, matIndex) => (
                                  <div key={matIndex} className="px-4 py-3">
                                    <div className="flex items-start justify-between gap-2 mb-1">
                                      <div className="flex-1 min-w-0">
                                        <p className="text-pink-100 leading-snug mb-1 text-center" style={{ fontSize: '1rem' }}>«{material.title}»</p>
                                        <span className="text-xs text-violet-400 uppercase block">{material.type}</span>
                                        <span
                                          className="text-cyan-300 text-sm whitespace-nowrap overflow-hidden text-ellipsis cursor-pointer block"
                                          onClick={(e) => { e.stopPropagation(); e.preventDefault(); setFilterMaster(material.master); }}
                                        >
                                          {material.master}
                                        </span>
                                      </div>
                                    </div>
                                    {/* Actions */}
                                    <div className="flex gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
                                      <button
                                        onClick={() => setSelectedPearl(pearl)}
                                        className="flex-[2] py-1.5 rounded text-white text-xs font-semibold transition-opacity hover:opacity-90 flex items-center justify-center gap-1"
                                        style={{ background: '#0d9e6e' }}
                                      >
                                        <BookOpen className="w-3 h-3" />Читать
                                      </button>
                                      <button className="flex-1 py-1.5 rounded text-white text-xs font-semibold transition-opacity hover:opacity-90 flex items-center justify-center gap-1" style={{ background: '#9b1b30' }}>
                                        <Download className="w-3 h-3" />PDF
                                      </button>
                                      <div className="relative flex-1">
                                        <button
                                          onClick={() => setOpenDropdown(openDropdown === `mob-${pearlIndex}` ? null : `mob-${pearlIndex}`)}
                                          className="w-full py-1.5 bg-indigo-900/50 hover:bg-indigo-900/70 border border-violet-500/30 rounded text-violet-300 text-xs transition-colors flex items-center justify-center gap-0.5"
                                        >
                                          Ещё<ChevronDown className="w-3 h-3" />
                                        </button>
                                        {openDropdown === `mob-${pearlIndex}` && (
                                          <div className="absolute right-0 bottom-full mb-1 z-50 bg-indigo-950 border border-violet-400/40 rounded-lg shadow-xl min-w-[90px] py-1">
                                            <button className="w-full px-3 py-1.5 text-left text-xs hover:opacity-80 flex items-center gap-2" style={{ color: '#5b9bd5' }}><Download className="w-3 h-3" />DOCX</button>
                                            <button className="w-full px-3 py-1.5 text-left text-xs hover:opacity-80 flex items-center gap-2" style={{ color: '#6bbf47' }}><Download className="w-3 h-3" />EPUB</button>
                                            <button className="w-full px-3 py-1.5 text-left text-xs hover:opacity-80 flex items-center gap-2" style={{ color: '#c0c0c0' }}><Download className="w-3 h-3" />TXT</button>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

            </div>
          )}
        </main>
      </div>
    </div>
  );
}