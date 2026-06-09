import { Search, Download, Printer, ArrowLeft } from 'lucide-react';
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

  // Get filtered pearls
  const getFilteredPearls = () => {
    let filtered = pearlsData;

    if (filterMaster || filterYear) {
      filtered = pearlsData.filter(pearl => {
        return pearl.materials.some(material => {
          const masterMatch = !filterMaster || material.master === filterMaster;
          const yearMatch = !filterYear || material.dateGivenYear === filterYear;
          return masterMatch && yearMatch;
        });
      });
    }

    return filtered;
  };

  const filteredPearls = getFilteredPearls();
  const publishYears = [2013, 2012, 2011];

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
    <div className="min-h-screen bg-[#0a0118] relative overflow-hidden font-[Georgia,serif]">
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
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-200 via-violet-200 to-pink-200 bg-clip-text text-transparent drop-shadow-lg">
                Жемчужины Мудрости
              </h1>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Поиск..."
                    className="px-4 py-2 bg-indigo-900/60 border-2 border-pink-400/40 rounded-lg text-violet-100 placeholder-pink-300/60 focus:outline-none focus:border-pink-400 focus:shadow-lg focus:shadow-pink-500/20 w-64 transition-all"
                  />
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-pink-300" />
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {selectedPearl ? (
            /* Detail View */
            <div>
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
                {/* Month */}
                <h2 className="text-3xl font-bold text-violet-200 mb-6">{selectedPearl.publishMonth} {selectedPearl.publishYear}</h2>

                {/* Download Buttons - at top */}
                <div className="border-y border-violet-400/30 py-6 mb-8">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-violet-200 font-semibold text-lg">Скачать:</span>
                    <button className="px-4 py-2 bg-violet-600/40 hover:bg-violet-600/60 border border-violet-400/40 rounded-lg text-violet-100 transition-colors flex items-center gap-2">
                      <Download className="w-4 h-4" />
                      TXT
                    </button>
                    <button className="px-4 py-2 bg-blue-600/40 hover:bg-blue-600/60 border border-blue-400/40 rounded-lg text-blue-100 transition-colors flex items-center gap-2">
                      <Download className="w-4 h-4" />
                      DOCX
                    </button>
                    <button className="px-4 py-2 bg-pink-600/40 hover:bg-pink-600/60 border border-pink-400/40 rounded-lg text-pink-100 transition-colors flex items-center gap-2">
                      <Download className="w-4 h-4" />
                      EPUB
                    </button>
                    <button className="px-4 py-2 bg-cyan-600/40 hover:bg-cyan-600/60 border border-cyan-400/40 rounded-lg text-cyan-100 transition-colors flex items-center gap-2">
                      <Printer className="w-4 h-4" />
                      Печать
                    </button>
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
                        <p className="text-violet-300 mb-6">({material.dateGiven})</p>

                        {/* Content */}
                        <div
                          style={{
                            background: '#1a1228',
                            border: '1px solid rgba(139, 92, 246, 0.25)',
                            borderRadius: '12px',
                            padding: '2rem 2.5rem',
                          }}
                        >
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
            </div>
          ) : (
            /* List View */
            <div>
              {/* Filters */}
              {(filterMaster || filterYear) && (
                <div className="mb-8 flex items-center gap-2">
                  <span className="text-violet-200">Фильтры:</span>
                  {filterMaster && (
                    <button
                      onClick={() => setFilterMaster(null)}
                      className="px-3 py-1 bg-cyan-600/40 border border-cyan-400/40 rounded-full text-cyan-100 text-sm hover:bg-cyan-600/60 transition-colors"
                    >
                      {filterMaster} ×
                    </button>
                  )}
                  {filterYear && (
                    <button
                      onClick={() => setFilterYear(null)}
                      className="px-3 py-1 bg-pink-600/40 border border-pink-400/40 rounded-full text-pink-100 text-sm hover:bg-pink-600/60 transition-colors"
                    >
                      Год создания: {filterYear} ×
                    </button>
                  )}
                </div>
              )}

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

                        {/* Table */}
                        <div className="bg-gradient-to-br from-indigo-950/60 via-purple-950/60 to-pink-950/60 border-2 border-violet-400/40 rounded-2xl overflow-hidden shadow-2xl shadow-violet-500/20">
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead>
                                <tr className="bg-gradient-to-r from-indigo-900/80 via-purple-900/80 to-pink-900/80 border-b-2 border-violet-400/40">
                                  <th className="px-6 py-4 text-left text-sm font-semibold text-cyan-200 w-40 border-r-2 border-violet-400/40">Месяц</th>
                                  <th className="px-6 py-4 text-left text-sm font-semibold text-violet-200">Материалы</th>
                                  <th className="px-6 py-4 text-left text-sm font-semibold text-pink-200 w-48">Дата создания</th>
                                  <th className="px-6 py-4 text-left text-sm font-semibold text-cyan-200 w-64">Скачать</th>
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
                                        <td
                                          rowSpan={pearl.materials.length}
                                          className="px-6 py-6 text-violet-100 align-top font-semibold border-r-2 border-violet-400/40"
                                        >
                                          {pearl.publishMonth}
                                        </td>
                                      )}
                                      <td className="px-6 py-6 align-top">
                                        <p className="text-xs text-violet-400 uppercase mb-1">{material.type}</p>
                                        <p
                                          className="text-cyan-200 mb-1 cursor-pointer hover:text-cyan-100 transition-colors"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setFilterMaster(material.master);
                                          }}
                                        >
                                          {material.master}
                                        </p>
                                        <h4 className="text-pink-100">«{material.title}»</h4>
                                      </td>
                                      <td className="px-6 py-6 align-top">
                                        <p
                                          className="text-sm text-violet-300 cursor-pointer hover:text-pink-200 transition-colors"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setFilterYear(material.dateGivenYear);
                                          }}
                                        >
                                          {material.dateGiven}
                                        </p>
                                      </td>
                                      {matIndex === 0 && (
                                        <td
                                          rowSpan={pearl.materials.length}
                                          className="px-6 py-6 align-middle"
                                        >
                                          <div className="grid grid-cols-2 gap-2 w-fit mx-auto">
                                            <button
                                              onClick={(e) => e.stopPropagation()}
                                              className="px-3 py-2 bg-violet-600/40 hover:bg-violet-600/60 border border-violet-400/40 rounded text-violet-100 text-xs transition-colors w-20 h-9 flex items-center justify-center"
                                            >
                                              TXT
                                            </button>
                                            <button
                                              onClick={(e) => e.stopPropagation()}
                                              className="px-3 py-2 bg-blue-600/40 hover:bg-blue-600/60 border border-blue-400/40 rounded text-blue-100 text-xs transition-colors w-20 h-9 flex items-center justify-center"
                                            >
                                              DOCX
                                            </button>
                                            <button
                                              onClick={(e) => e.stopPropagation()}
                                              className="px-3 py-2 bg-pink-600/40 hover:bg-pink-600/60 border border-pink-400/40 rounded text-pink-100 text-xs transition-colors w-20 h-9 flex items-center justify-center"
                                            >
                                              EPUB
                                            </button>
                                            <button
                                              onClick={(e) => e.stopPropagation()}
                                              className="px-3 py-2 bg-cyan-600/40 hover:bg-cyan-600/60 border border-cyan-400/40 rounded text-cyan-100 transition-colors w-20 h-9 flex items-center justify-center"
                                              title="Печать"
                                            >
                                              <Printer className="w-4 h-4" />
                                            </button>
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
                      </div>
                    );
                  })}
                </div>

              {/* Info Section */}
              <div className="mt-12 bg-gradient-to-r from-indigo-950/60 via-purple-950/60 to-pink-950/60 border-2 border-violet-400/40 rounded-2xl p-6 shadow-xl shadow-violet-500/20">
                <p className="text-lg text-violet-100 leading-relaxed">
                  <span className="text-cyan-300 font-semibold">Жемчужины Мудрости</span> — ежемесячные послания от Вознесённых Владык, передаваемые через Посланников.
                  Каждое послание содержит духовные учения и наставления для тех, кто идёт по пути духовного развития.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
