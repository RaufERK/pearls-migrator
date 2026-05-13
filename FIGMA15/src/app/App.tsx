import { Search, Download, Printer } from 'lucide-react';

const months = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

const pearlsData = {
  2026: [
    { month: 'Январь', dictations: [{ master: 'Эль Мория', title: 'О природе вознесения' }] },
    { month: 'Февраль', dictations: [
      { master: 'Сен-Жермен', title: 'Семь лучей и их применение' },
      { master: 'Кутхуми', title: 'Применение лучей в жизни' }
    ]},
    { month: 'Март', dictations: [{ master: 'Иисус Христос', title: 'Любовь как космическая сила' }] },
    { month: 'Апрель', dictations: [{ master: 'Мать Мария', title: 'Божественная женственность' }] },
    { month: 'Май', dictations: [
      { master: 'Кутхуми', title: 'Путь мудрости' },
      { master: 'Джвал Кул', title: 'Тайные учения' },
      { master: 'Ланто', title: 'Озарение разума' }
    ]},
    { month: 'Июнь', dictations: [{ master: 'Гаутама Будда', title: 'Срединный путь просветления' }] },
    { month: 'Июль', dictations: [{ master: 'Архангел Михаил', title: 'Защита и вера' }] },
    { month: 'Август', dictations: [{ master: 'Серапис Бей', title: 'Дисциплина и чистота' }] },
    { month: 'Сентябрь', dictations: [{ master: 'Павел Венецианец', title: 'Искусство и красота' }] },
    { month: 'Октябрь', dictations: [
      { master: 'Илларион', title: 'Истина и исцеление' },
      { master: 'Мать Мария', title: 'Целительная сила любви' }
    ]},
    { month: 'Ноябрь', dictations: [{ master: 'Нада', title: 'Служение и самоотдача' }] },
    { month: 'Декабрь', dictations: [{ master: 'Портия', title: 'Справедливость и милосердие' }] }
  ],
  2025: [
    { month: 'Январь', dictations: [{ master: 'Сен-Жермен', title: 'Фиолетовое пламя трансмутации' }] },
    { month: 'Февраль', dictations: [{ master: 'Эль Мория', title: 'Воля Бога и предназначение' }] },
    { month: 'Март', dictations: [{ master: 'Ланто', title: 'Мудрость веков' }] },
    { month: 'Апрель', dictations: [
      { master: 'Иисус Христос', title: 'Воскресение и новая жизнь' },
      { master: 'Мать Мария', title: 'Весна души' }
    ]},
    { month: 'Май', dictations: [{ master: 'Мать Мария', title: 'Непорочное зачатие' }] },
    { month: 'Июнь', dictations: [{ master: 'Архангел Гавриил', title: 'Чистота намерения' }] },
    { month: 'Июль', dictations: [{ master: 'Великое Божественное Направление', title: 'Божественный план' }] },
    { month: 'Август', dictations: [{ master: 'Кутхуми', title: 'Обучение душ' }] },
    { month: 'Сентябрь', dictations: [{ master: 'Гаутама Будда', title: 'Путь Бодхисаттвы' }] },
    { month: 'Октябрь', dictations: [{ master: 'Серапис Бей', title: 'Вознесение' }] },
    { month: 'Ноябрь', dictations: [{ master: 'Циклопей', title: 'Всевидящее око Бога' }] },
    { month: 'Декабрь', dictations: [
      { master: 'Иисус Христос', title: 'Рождество Христосознания' },
      { master: 'Сен-Жермен', title: 'Новогоднее благословение' }
    ]}
  ],
  2024: [
    { month: 'Январь', dictations: [{ master: 'Эль Мория', title: 'Новый год - новые возможности' }] },
    { month: 'Февраль', dictations: [{ master: 'Сен-Жермен', title: 'Алхимия духа' }] },
    { month: 'Март', dictations: [{ master: 'Иисус Христос', title: 'Крестный путь' }] },
    { month: 'Апрель', dictations: [{ master: 'Мать Мария', title: 'Весна духовного пробуждения' }] },
    { month: 'Май', dictations: [{ master: 'Кутхуми', title: 'Храм озарения' }] },
    { month: 'Июнь', dictations: [{ master: 'Гаутама Будда', title: 'Медитация и внутренний мир' }] },
    { month: 'Июль', dictations: [
      { master: 'Архангел Уриил', title: 'Служение в летний период' },
      { master: 'Сен-Жермен', title: 'Летнее преображение' },
      { master: 'Кутхуми', title: 'Духовная дисциплина' }
    ]},
    { month: 'Август', dictations: [{ master: 'Серапис Бей', title: 'Подготовка к вознесению' }] },
    { month: 'Сентябрь', dictations: [{ master: 'Павел Венецианец', title: 'Творчество души' }] },
    { month: 'Октябрь', dictations: [{ master: 'Илларион', title: 'Наука и истина' }] },
    { month: 'Ноябрь', dictations: [{ master: 'Нада', title: 'Любовь и служение' }] },
    { month: 'Декабрь', dictations: [{ master: 'Иисус Христос', title: 'Свет Рождества' }] }
  ],
  2023: [
    { month: 'Январь', dictations: [{ master: 'Сен-Жермен', title: 'Начало нового цикла' }] },
    { month: 'Февраль', dictations: [{ master: 'Эль Мория', title: 'Воля и преданность' }] },
    { month: 'Март', dictations: [{ master: 'Ланто', title: 'Просветление ума' }] },
    { month: 'Апрель', dictations: [{ master: 'Иисус Христос', title: 'Пасхальное послание' }] },
    { month: 'Май', dictations: [{ master: 'Мать Мария', title: 'Материнская любовь' }] },
    { month: 'Июнь', dictations: [{ master: 'Архангел Гавриил', title: 'Весть от небес' }] },
    { month: 'Июль', dictations: [{ master: 'Великое Божественное Направление', title: 'Путь света' }] },
    { month: 'Август', dictations: [{ master: 'Кутхуми', title: 'Духовное образование' }] },
    { month: 'Сентябрь', dictations: [{ master: 'Гаутама Будда', title: 'Медитация и осознанность' }] },
    { month: 'Октябрь', dictations: [{ master: 'Серапис Бей', title: 'Чистота намерения' }] },
    { month: 'Ноябрь', dictations: [{ master: 'Циклопей', title: 'Видение истины' }] },
    { month: 'Декабрь', dictations: [{ master: 'Иисус Христос', title: 'Рождественское чудо' }] }
  ],
  2022: [
    { month: 'Январь', dictations: [{ master: 'Эль Мория', title: 'Новые начинания' }] },
    { month: 'Февраль', dictations: [{ master: 'Сен-Жермен', title: 'Трансформация и свобода' }] },
    { month: 'Март', dictations: [{ master: 'Иисус Христос', title: 'Путь креста' }] },
    { month: 'Апрель', dictations: [{ master: 'Мать Мария', title: 'Весеннее обновление' }] },
    { month: 'Май', dictations: [{ master: 'Кутхуми', title: 'Ключи к мудрости' }] },
    { month: 'Июнь', dictations: [{ master: 'Гаутама Будда', title: 'Путь к просветлению' }] },
    { month: 'Июль', dictations: [{ master: 'Архангел Михаил', title: 'Духовная защита' }] },
    { month: 'Август', dictations: [{ master: 'Серапис Бей', title: 'Дисциплина ученика' }] },
    { month: 'Сентябрь', dictations: [{ master: 'Павел Венецианец', title: 'Божественное искусство' }] },
    { month: 'Октябрь', dictations: [{ master: 'Илларион', title: 'Путь науки и истины' }] },
    { month: 'Ноябрь', dictations: [{ master: 'Нада', title: 'Служение человечеству' }] },
    { month: 'Декабрь', dictations: [{ master: 'Иисус Христос', title: 'Свет миру' }] }
  ]
};

export default function App() {
  const selectedYear = 2026;

  return (
    <div className="min-h-screen bg-[#0a0118] relative overflow-hidden font-[Georgia,serif]">
      {/* Starry Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0118] via-[#1a0b3e] to-[#0d051f]"></div>

        {/* Large stars with glow */}
        {[...Array(50)].map((_, i) => (
          <div
            key={`large-${i}`}
            className="absolute rounded-full bg-white shadow-lg"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              width: `${Math.random() * 3 + 2}px`,
              height: `${Math.random() * 3 + 2}px`,
              opacity: Math.random() * 0.8 + 0.2,
              boxShadow: `0 0 ${Math.random() * 10 + 5}px rgba(255, 255, 255, 0.8)`,
              animation: `twinkle ${Math.random() * 3 + 2}s ease-in-out ${Math.random() * 2}s infinite`
            }}
          />
        ))}

        {/* Medium stars */}
        {[...Array(150)].map((_, i) => (
          <div
            key={`medium-${i}`}
            className="absolute w-1 h-1 bg-white rounded-full"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              opacity: Math.random() * 0.6 + 0.4,
              boxShadow: `0 0 ${Math.random() * 4 + 2}px rgba(255, 255, 255, 0.5)`,
              animation: `twinkle ${Math.random() * 4 + 3}s ease-in-out ${Math.random() * 3}s infinite`
            }}
          />
        ))}

        {/* Small stars */}
        {[...Array(200)].map((_, i) => (
          <div
            key={`small-${i}`}
            className="absolute bg-white rounded-full"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              width: '1px',
              height: '1px',
              opacity: Math.random() * 0.5 + 0.3,
              animation: `twinkle ${Math.random() * 5 + 4}s ease-in-out ${Math.random() * 4}s infinite`
            }}
          />
        ))}

        {/* Colored nebula effects */}
        <div className="absolute top-20 left-10 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-40 right-20 w-80 h-80 bg-blue-600/20 rounded-full blur-3xl"></div>
        <div className="absolute top-60 right-40 w-64 h-64 bg-pink-500/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-20 left-60 w-72 h-72 bg-cyan-600/15 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 left-1/3 w-64 h-64 bg-fuchsia-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-600/15 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="bg-gradient-to-r from-indigo-950 via-purple-900 to-pink-950 border-b-2 border-gradient-to-r from-cyan-400/40 via-violet-400/40 to-pink-400/40 sticky top-0 z-50">
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
          {(() => {
            const yearPearls = pearlsData[selectedYear as keyof typeof pearlsData] || [];
            return (
              <div>
                {/* Year Header */}
                <div className="mb-6 flex items-center gap-4">
                  <div className="h-1 w-16 bg-gradient-to-r from-cyan-500 to-pink-500 rounded-full"></div>
                  <h2 className="text-4xl font-bold bg-gradient-to-r from-pink-300 via-violet-300 to-cyan-300 bg-clip-text text-transparent drop-shadow-lg">
                    {selectedYear}
                  </h2>
                  <div className="h-1 flex-1 bg-gradient-to-r from-pink-500 via-violet-500 to-cyan-500 rounded-full opacity-50"></div>
                </div>

                {/* Pearls Table */}
                <div className="bg-gradient-to-br from-indigo-950/60 via-purple-950/60 to-pink-950/60 backdrop-blur-sm border-2 border-violet-400/40 rounded-2xl overflow-hidden shadow-2xl shadow-violet-500/20">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gradient-to-r from-indigo-900/80 via-purple-900/80 to-pink-900/80 border-b-2 border-violet-400/40">
                          <th className="px-6 py-4 text-left text-sm font-semibold text-cyan-200 w-32">
                            Месяц
                          </th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-pink-200 w-64">
                            Владыка
                          </th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-violet-200">
                            Название
                          </th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-cyan-200 w-80">
                            Скачать
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {yearPearls.map((pearl, index) => {
                          const rowSpan = pearl.dictations.length;
                          return pearl.dictations.map((dictation, dictIndex) => (
                            <tr
                              key={`${index}-${dictIndex}`}
                              className="border-b border-violet-400/20 hover:bg-gradient-to-r hover:from-violet-500/10 hover:via-pink-500/10 hover:to-cyan-500/10 transition-colors"
                            >
                              {dictIndex === 0 && (
                                <td
                                  rowSpan={rowSpan}
                                  className="px-6 py-4 text-violet-100 border-r border-violet-400/20 align-top"
                                >
                                  {pearl.month}
                                </td>
                              )}
                              <td className="px-6 py-4 text-cyan-200">
                                {dictation.master}
                              </td>
                              <td className="px-6 py-4 text-pink-100">
                                {dictation.title}
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <button className="px-3 py-1 bg-violet-600/40 hover:bg-violet-600/60 border border-violet-400/40 rounded text-violet-100 text-xs transition-colors">
                                    TXT
                                  </button>
                                  <button className="px-3 py-1 bg-blue-600/40 hover:bg-blue-600/60 border border-blue-400/40 rounded text-blue-100 text-xs transition-colors">
                                    DOCX
                                  </button>
                                  <button className="px-3 py-1 bg-pink-600/40 hover:bg-pink-600/60 border border-pink-400/40 rounded text-pink-100 text-xs transition-colors">
                                    EPUB
                                  </button>
                                  <button className="p-1.5 bg-cyan-600/40 hover:bg-cyan-600/60 border border-cyan-400/40 rounded text-cyan-100 transition-colors ml-2" title="Печать">
                                    <Printer className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ));
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Info Section */}
          <div className="mt-8 bg-gradient-to-r from-indigo-950/60 via-purple-950/60 to-pink-950/60 backdrop-blur-sm border-2 border-gradient-to-r from-cyan-400/40 to-pink-400/40 rounded-2xl p-6 shadow-xl shadow-violet-500/20">
            <p className="text-lg text-violet-100 leading-relaxed">
              <span className="text-cyan-300 font-semibold">Жемчужины Мудрости</span> — ежемесячные послания от Вознесённых Владык, передаваемые через Посланников.
              Каждое послание содержит духовные учения и наставления для тех, кто идёт по пути духовного развития.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
