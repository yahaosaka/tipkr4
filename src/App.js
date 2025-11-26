import React, { useState, useEffect, useRef } from "react";

// Math Trainer — single-file React component (default export)
// Tailwind CSS classes are used for styling (no import required here — configured in host project).

export default function MathTrainer() {
  // Settings
  const [minOperand, setMinOperand] = useState(0);
  const [maxOperand, setMaxOperand] = useState(20);
  const [numProblems, setNumProblems] = useState(20);
  const [timePerProblem, setTimePerProblem] = useState(0); // seconds, 0 = no timer
  const [autoNext, setAutoNext] = useState(true);
  const [shuffle, setShuffle] = useState(true);

  // Run state
  const [running, setRunning] = useState(false);
  const [problems, setProblems] = useState([]);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState(null); // {ok: bool, correct: number}
  const [score, setScore] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [history, setHistory] = useState(() => {
    try {
      const raw = localStorage.getItem("math-trainer-history");
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  });

  const timerRef = useRef(null);
  const inputRef = useRef(null);

  // utils
  const randInt = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;

  const makeProblems = (n, minV, maxV, shuffled) => {
    const arr = [];
    for (let i = 0; i < n; i++) {
      const a = randInt(minV, maxV);
      const b = randInt(minV, maxV);
      arr.push({ a, b, op: "+", id: `${a}-${b}-${i}` });
    }
    if (shuffled) arr.sort(() => Math.random() - 0.5);
    return arr;
  };

  // start / stop
  const start = () => {
    const p = makeProblems(numProblems, minOperand, maxOperand, shuffle);
    setProblems(p);
    setIndex(0);
    setScore(0);
    setFeedback(null);
    setRunning(true);
    setStartTime(Date.now());
    setElapsed(0);
    setAnswer("");
    if (inputRef.current) inputRef.current.focus();
  };

  const stop = (reason = "user") => {
    setRunning(false);
    const record = {
      date: new Date().toISOString(),
      problemsCount: problems.length || numProblems,
      solved: score,
      total: problems.length || numProblems,
      durationSec: Math.round((Date.now() - (startTime || Date.now())) / 1000),
      reason,
    };
    const newHist = [record, ...history].slice(0, 50);
    setHistory(newHist);
    localStorage.setItem("math-trainer-history", JSON.stringify(newHist));
  };

  // answer checking
  const checkAnswer = (userAnswer) => {
    if (!running) return;
    const p = problems[index];
    if (!p) return;
    const correct = p.a + p.b;
    const parsed = parseInt(String(userAnswer).trim(), 10);
    const ok = !Number.isNaN(parsed) && parsed === correct;
    setFeedback({ ok, correct });
    if (ok) setScore((s) => s + 1);
    // save per-problem record to history (kept in-memory until stop)
    // advance
    if (autoNext) {
      setTimeout(() => next(), 500);
    }
  };

  const next = () => {
    setAnswer("");
    setFeedback(null);
    if (index + 1 < problems.length) {
      setIndex((i) => i + 1);
      if (inputRef.current) inputRef.current.focus();
    } else {
      stop("finished");
    }
  };

  // timer handling
  useEffect(() => {
    if (!running) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    if (timePerProblem > 0) {
      // start per-problem timer
      let timeLeft = timePerProblem;
      setElapsed(0);
      timerRef.current = setInterval(() => {
        timeLeft -= 1;
        setElapsed((t) => t + 1);
        if (timeLeft <= 0) {
          // mark as wrong and move on
          setFeedback((prev) => ({ ok: false, correct: problems[index] ? problems[index].a + problems[index].b : null }));
          if (autoNext) {
            next();
          }
        }
      }, 1000);
      return () => clearInterval(timerRef.current);
    }

    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, index, timePerProblem, autoNext, problems]);

  // keyboard handlers
  useEffect(() => {
    const onKey = (e) => {
      if (!running) return;
      if (e.key === "Enter") {
        e.preventDefault();
        checkAnswer(answer);
      }
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [running, answer, index, problems]);

  // small helpers for rendering
  const current = problems[index] || null;

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12 font-sans">
      <div className="max-w-3xl mx-auto bg-white shadow-lg rounded-2xl p-6">
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Тренажёр по математике — сложение</h1>
          <div className="text-sm text-slate-500">React • localStorage • доступность</div>
        </header>

        {/* Settings */}
        <section className="grid md:grid-cols-2 gap-4 mb-6">
          <div className="p-4 border rounded-lg">
            <h2 className="font-semibold mb-2">Параметры задач</h2>
            <div className="flex gap-2 items-center mb-2">
              <label className="w-28 text-sm">Минимум</label>
              <input type="number" value={minOperand} onChange={(e) => setMinOperand(Number(e.target.value))} className="input" />
            </div>
            <div className="flex gap-2 items-center mb-2">
              <label className="w-28 text-sm">Максимум</label>
              <input type="number" value={maxOperand} onChange={(e) => setMaxOperand(Number(e.target.value))} className="input" />
            </div>
            <div className="flex gap-2 items-center mb-2">
              <label className="w-28 text-sm">Количество</label>
              <input type="number" value={numProblems} onChange={(e) => setNumProblems(Number(e.target.value))} className="input" />
            </div>
            <div className="flex gap-2 items-center">
              <label className="w-28 text-sm">Таймер (сек)</label>
              <input type="number" value={timePerProblem} onChange={(e) => setTimePerProblem(Number(e.target.value))} className="input" />
            </div>
          </div>

          <div className="p-4 border rounded-lg">
            <h2 className="font-semibold mb-2">Поведение</h2>
            <div className="flex items-center gap-2 mb-2">
              <input id="autonext" type="checkbox" checked={autoNext} onChange={(e) => setAutoNext(e.target.checked)} />
              <label htmlFor="autonext" className="text-sm">Авто-переход к следующему</label>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <input id="shuffle" type="checkbox" checked={shuffle} onChange={(e) => setShuffle(e.target.checked)} />
              <label htmlFor="shuffle" className="text-sm">Перемешивать задачи</label>
            </div>

            <div className="mt-4 flex gap-2">
              <button className="btn" onClick={start} disabled={running}>Запустить</button>
              <button className="btn-ghost" onClick={() => stop("user")} disabled={!running}>Остановить</button>
            </div>

            <div className="mt-4 text-xs text-slate-500">Подсказка: нажмите Enter, чтобы отправить ответ. Стрелка вправо — перейти к следующей задаче.</div>
          </div>
        </section>

        {/* Main area */}
        <section className="mb-6">
          <div className="p-6 border rounded-2xl bg-slate-50 text-center">
            {!running && <div className="text-slate-600">Нажмите «Запустить», чтобы начать тренировку.</div>}

            {running && current && (
              <div>
                <div className="text-4xl font-bold mb-2">{current.a} + {current.b} = ?</div>
                <div className="flex items-center justify-center gap-3">
                  <input
                    ref={inputRef}
                    className="w-36 text-center text-2xl p-2 rounded border"
                    inputMode="numeric"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    aria-label={`Ответ на пример ${current.a} плюс ${current.b}`}
                  />
                  <button className="btn" onClick={() => checkAnswer(answer)}>Проверить</button>
                </div>

                <div className="mt-4 flex items-center justify-center gap-4">
                  <div>Задача {index + 1} / {problems.length}</div>
                  <div>Баллы: <strong>{score}</strong></div>
                  {timePerProblem > 0 && <div>Прошло: {elapsed}s</div>}
                </div>

                {feedback && (
                  <div className={`mt-4 p-3 rounded ${feedback.ok ? 'bg-green-100' : 'bg-red-100'}`} role="status">
                    {feedback.ok ? (
                      <div>Правильно! ✅</div>
                    ) : (
                      <div>Неверно. Правильный ответ: <strong>{feedback.correct}</strong></div>
                    )}
                  </div>
                )}
              </div>
            )}

            {running && !current && <div>Готово — задач нет.</div>}

          </div>
        </section>

        {/* Footer: history & export */}
        <section className="grid md:grid-cols-2 gap-4">
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold mb-2">Краткая статистика</h3>
            <div>Набранные баллы: <strong>{score}</strong></div>
            <div>Всего задач в текущей сессии: <strong>{problems.length || 0}</strong></div>
            <div>Время с начала: <strong>{startTime ? Math.round((Date.now() - startTime) / 1000) : 0}s</strong></div>
          </div>

          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold mb-2">История (последние {history.length})</h3>
            <div className="space-y-2 max-h-48 overflow-auto text-sm">
              {history.length === 0 && <div className="text-slate-500">История пуста.</div>}
              {history.map((h, i) => (
                <div key={i} className="flex justify-between">
                  <div>{new Date(h.date).toLocaleString()}</div>
                  <div>{h.solved}/{h.total} • {h.durationSec}s</div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <button className="btn-ghost" onClick={() => { setHistory([]); localStorage.removeItem('math-trainer-history'); }}>Очистить историю</button>
              <a className="btn-ghost" href={exportCsv(history)} download={`math-trainer-history-${new Date().toISOString()}.csv`}>Экспорт CSV</a>
            </div>
          </div>
        </section>

        <footer className="mt-6 text-xs text-slate-500">
          Реализация: генерация случайных примеров, проверка ответов, сохранение истории в localStorage. Можно расширить: уровни сложности, вычитание/умножение, пользовательские профили, адаптивная сложность.
        </footer>
      </div>
    </div>
  );

  function exportCsv(data) {
    if (!data || data.length === 0) return '#';
    const header = ['date,solved,total,durationSec,reason'];
    const rows = data.map(r => `${r.date},${r.solved},${r.total},${r.durationSec},${r.reason || ''}`);
    const csv = header.concat(rows).join('\n');
    return 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  }
}

/*
README (для включения в репозиторий)

# Math Trainer — тренажёр по сложению (React)

Краткое описание
-----------------
Одностраничное React-приложение для тренировки навыка сложения целых чисел. Позволяет генерировать наборы случайных примеров, проверять ответы, отслеживать счёт и сохранять историю сессий в localStorage.

Ключевой функционал
-------------------
- Генерация примеров на сложение (параметры: мин/макс значение, количество)
- Ручная и автоматическая проверка ответов (Enter для отправки)
- Таймер на задачу (опционально)
- Сохранение истории сессий в localStorage и экспорт в CSV
- Настройки поведения: авто-переход, перемешивание
- Доступность: фокус на поле ввода, aria-label

Запуск локально
---------------
1. Создайте React-приложение (Vite или Create React App):

```bash
npx create-react-app math-trainer
cd math-trainer
```

2. Установите Tailwind (рекомендуется) или адаптируйте стили под ваш проект.

3. Замените `src/App.js` (или `src/App.jsx`) на содержимое этого файла.

4. Запустите проект:

```bash
npm start
```

Структура репозитория
---------------------
- `src/App.jsx` — основной React-компонент (этот файл)
- `README.md` — инструкция (этот текст)
- опционально: тесты, CI, Dockerfile

Скриншоты
---------
(Добавьте сюда скриншоты работающего приложения: экран настроек, пример с ответом, окно истории)

Идеи для улучшения
------------------
- Добавить другие операции (вычитание, умножение, деление)
- Реализовать профили пользователей и синхронизацию через GitHub/Gist/Backend
- Добавить адаптивную систему сложности (способность менять диапазон в зависимости от результатов)
- Юнит-тесты для логики генерации и проверки


Отчёт для преподавателя
-----------------------
В отчёте кратко опишите: цель приложения, применённую архитектуру (одностраничное приложение, состояние в компонентах + localStorage), ключевые решения (почему использованы параметры, как реализован таймер), сложности при реализации и выводы (чему научились).

Пример шаблона отчёта:
- Тема: «Тренажёр по математике»
- Краткое описание: функционал
- Архитектура: компоненты, state
- Инструменты: React, Tailwind (опционально), localStorage
- Трудности и их решение
- Возможные улучшения

*/
