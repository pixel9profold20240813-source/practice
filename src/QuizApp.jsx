import React, { useState, useEffect, useCallback } from "react";
import {
  getBuiltinQuizSets,
  loadCustomQuizSets,
  saveCustomQuizSets,
  groupQuestions,
} from "./quizData.js";
import SettingsScreen from "./SettingsScreen.jsx";
import { BUILTIN_QUIZ_SET_115_NATURE } from "./builtin_data.js";

const BUILTIN_MODULES = [BUILTIN_QUIZ_SET_115_NATURE];
const PROGRESS_STORAGE_KEY = "cap-quiz-progress-v2";

/* ---------- 進度儲存（按題庫id分開記錄） ---------- */

function useProgress() {
  const [state, setState] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PROGRESS_STORAGE_KEY);
      setState(raw ? JSON.parse(raw) : {});
    } catch (e) {
      setState({});
    }
    setLoaded(true);
  }, []);

  const save = useCallback((next) => {
    setState(next);
    try {
      localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(next));
    } catch (e) {
      console.error("storage set failed", e);
    }
  }, []);

  return { state, loaded, save };
}

function getSetProgress(progressState, setId) {
  return progressState[setId] || { wrongIds: [], history: [] };
}

/* ---------- 畫面：題庫選擇首頁 ---------- */

function LibraryScreen({ quizSets, progressState, onSelectSet, onOpenSettings }) {
  return (
    <div className="min-h-screen bg-[#faf9f6] flex flex-col">
      <div className="flex-1 flex flex-col max-w-md mx-auto w-full px-6 pt-12 pb-8">
        <div className="flex items-start justify-between mb-10">
          <div>
            <div className="text-xs tracking-[0.25em] text-[#9a3324] font-mono mb-2">
              國中教育會考 ・ 刷題系統
            </div>
            <h1 className="text-4xl font-bold text-[#1a1a1a] leading-tight" style={{ fontFamily: "'Noto Serif TC', serif" }}>
              准考證
            </h1>
          </div>
          <button
            onClick={onOpenSettings}
            aria-label="設定"
            className="border border-[#1a1a1a] w-10 h-10 flex items-center justify-center text-lg shrink-0 rounded-2xl"
          >
            ⚙
          </button>
        </div>
        <div className="h-px bg-[#1a1a1a] mb-6 rounded-2xl" />

        <div className="text-sm font-semibold text-[#1a1a1a] mb-3">選擇題庫</div>
        <div className="space-y-3">
          {quizSets.map((set) => {
            const progress = getSetProgress(progressState, set.id);
            return (
              <button
                key={set.id}
                onClick={() => onSelectSet(set)}
                className="w-full text-left border border-[#1a1a1a] bg-white p-4 flex items-center justify-between active:bg-[#f0eee8] rounded-2xl transition-colors"
              >
                <div>
                  <div className="font-mono font-bold text-lg text-[#1a1a1a]">
                    {set.meta.year}年 {set.meta.subjectLabel}科
                  </div>
                  <div className="text-xs text-[#999] mt-1">
                    {set.questions.length} 題
                    {progress.wrongIds.length > 0 && (
                      <span className="text-[#9a3324]"> ・ 錯題 {progress.wrongIds.length}</span>
                    )}
                  </div>
                </div>
                <span className="text-xl text-[#9a3324]">→</span>
              </button>
            );
          })}
        </div>

        {quizSets.length === 0 && (
          <div className="text-center py-16 text-[#999] text-sm">
            還沒有任何題庫，點右上角設定新增一份。
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- 畫面：題庫詳情（開始作答/錯題本/統計入口） ---------- */

function SetHomeScreen({ set, progress, onStart, onReview, onStats, onBack }) {
  return (
    <div className="min-h-screen bg-[#faf9f6] flex flex-col">
      <div className="flex-1 flex flex-col max-w-md mx-auto w-full px-6 pt-12 pb-8">
        <button onClick={onBack} className="text-sm text-[#999] font-mono mb-6">← 換一份題庫</button>
        <div className="mb-10">
          <div className="text-xs tracking-[0.25em] text-[#9a3324] font-mono mb-2">
            {set.meta.year}年度 ・ {set.meta.subjectLabel}科
          </div>
          <div className="h-px bg-[#1a1a1a] mt-4 rounded-2xl" />
        </div>

        <button
          onClick={onStart}
          className="group relative w-full bg-[#9a3324] text-[#faf9f6] rounded-2xl py-5 px-6 mb-4 flex items-center justify-between transition-transform active:scale-[0.98]"
        >
          <div className="text-left">
            <div className="text-lg font-semibold">開始作答</div>
            <div className="text-xs text-[#ddd] font-mono mt-1">共 {set.questions.length} 題 ・ 選擇題</div>
          </div>
          <span className="text-2xl">→</span>
        </button>

        <div className="grid grid-cols-2 gap-3">
          <button onClick={onReview} className="border border-[#1a1a1a] py-4 px-4 text-left active:bg-[#eee] transition-colors rounded-2xl">
            <div className="text-2xl font-mono font-bold text-[#9a3324]">{progress.wrongIds.length}</div>
            <div className="text-xs text-[#555] mt-1">錯題本</div>
          </button>
          <button onClick={onStats} className="border border-[#1a1a1a] py-4 px-4 text-left active:bg-[#eee] transition-colors rounded-2xl">
            <div className="text-2xl font-mono font-bold text-[#1a1a1a]">統計</div>
            <div className="text-xs text-[#555] mt-1">作答紀錄</div>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- 共用元件：題組/單題卡片（作答中與結果頁共用渲染邏輯） ---------- */

function GroupCard({ group, selections, onChoose, mode }) {
  // mode: "answering"（藍色標示已選，可點擊） | "graded"（紅綠標示對錯，不可點擊，唯讀）
  return (
    <div>
      {group.isGroup && (
        <div className="mb-4 pb-4 border-b border-dashed border-[#ccc]">
          <div className="text-xs font-mono text-[#9a3324] mb-2">
            題組 ・ 第{group.members[0].questionNumber}~{group.members[group.members.length - 1].questionNumber}題共用
          </div>
          <p className="text-[#1a1a1a] leading-relaxed text-[15px]">{group.sharedIntro}</p>
        </div>
      )}

      {group.sharedImage && (
        <div className="mb-4 border border-[#e5e2da] bg-white p-2 rounded-xl">
          <img src={group.sharedImage} alt="題目附圖" className="w-full" />
        </div>
      )}

      {group.members.map((m) => {
        const selected = selections[m.questionNumber];
        const isCorrect = selected === m.correctAnswer;
        return (
          <div key={m.questionNumber} className="mb-6">
            <div className="flex items-start gap-3 mb-3">
              <div className="font-mono text-xl font-bold text-[#9a3324] shrink-0 leading-none">
                {String(m.questionNumber).padStart(2, "0")}
              </div>
              <p className="text-[#1a1a1a] leading-relaxed text-[15px] pt-0.5">{m.ownStem}</p>
            </div>

            {!group.isGroup && m.image && (
              <div className="mb-3 border border-[#e5e2da] bg-white p-2 rounded-xl">
                <img src={m.image} alt={`第${m.questionNumber}題附圖`} className="w-full" />
              </div>
            )}

            <div className="space-y-2">
              {["A", "B", "C", "D"].map((opt) => {
                const isSelected = selected === opt;
                const isAnswer = m.correctAnswer === opt;
                let style = "border-[#ccc] bg-white text-[#1a1a1a]";

                if (mode === "answering") {
                  if (isSelected) style = "border-[#2b6cb0] bg-[#eaf2fb] text-[#1a1a1a]";
                } else if (mode === "graded") {
                  if (isAnswer) style = "border-[#2f6b3a] bg-[#eef6ed] text-[#1a1a1a]";
                  else if (isSelected && !isCorrect) style = "border-[#9a3324] bg-[#faeae7] text-[#1a1a1a]";
                }

                const optImage = m.optionImages && m.optionImages[opt];
                const clickable = mode === "answering";

                return (
                  <button
                    key={opt}
                    onClick={clickable ? () => onChoose(m.questionNumber, opt) : undefined}
                    disabled={!clickable}
                    className={`w-full text-left border px-4 py-3 flex gap-3 transition-colors ${style} ${!clickable ? "cursor-default" : ""} rounded-2xl`}
                  >
                    <span className="font-mono font-bold shrink-0">{opt}</span>
                    {optImage ? (
                      <img src={optImage} alt={`選項${opt}`} className="max-h-24 object-contain" />
                    ) : (
                      <span className="text-sm leading-relaxed">{m.options[opt]}</span>
                    )}
                  </button>
                );
              })}
            </div>

            {mode === "graded" && m.needsReview && (
              <div className="text-xs text-[#9a3324] bg-[#faeae7] border border-[#9a3324] px-3 py-2 mt-2 rounded-xl">
                ⚠ 此題部分內容為圖片，文字僅供參考。
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ---------- 畫面：作答中（自由瀏覽＋最後統一交卷） ---------- */

function QuizScreen({ groups, initialSelections, onSubmit, onExit }) {
  const [idx, setIdx] = useState(0);
  const [selections, setSelections] = useState(initialSelections || {});
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  const group = groups[idx];
  const total = groups.length;

  const choose = (questionNumber, opt) => {
    setSelections((prev) => ({ ...prev, [questionNumber]: opt }));
  };

  const allQuestionNumbers = groups.flatMap((g) => g.members.map((m) => m.questionNumber));
  const answeredCount = allQuestionNumbers.filter((qn) => selections[qn]).length;
  const totalQuestionCount = allQuestionNumbers.length;
  const isGroupAnswered = (g) => g.members.every((m) => selections[m.questionNumber]);

  const goPrev = () => setIdx((i) => Math.max(0, i - 1));
  const goNext = () => setIdx((i) => Math.min(total - 1, i + 1));
  const jumpTo = (groupIdx) => setIdx(groupIdx);

  const handleSubmitClick = () => {
    if (answeredCount < totalQuestionCount) {
      setShowSubmitConfirm(true);
    } else {
      onSubmit(selections);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf9f6] flex flex-col">
      <div className="max-w-md mx-auto w-full flex flex-col flex-1 px-5 pt-6 pb-6">
        <div className="flex items-center justify-between mb-4">
          <button onClick={onExit} className="text-sm text-[#999] font-mono">✕ 結束</button>
          <div className="text-sm font-mono text-[#555]">已作答 {answeredCount} / {totalQuestionCount}</div>
        </div>

        {/* 題目導覽網格：可跳題 */}
        <div className="flex flex-wrap gap-1.5 mb-4 pb-4 border-b border-[#e5e2da]">
          {groups.map((g, i) => {
            const answered = isGroupAnswered(g);
            const isCurrent = i === idx;
            const label = g.members.length > 1
              ? `${g.members[0].questionNumber}-${g.members[g.members.length - 1].questionNumber}`
              : `${g.members[0].questionNumber}`;
            let style = "border-[#ccc] text-[#999] bg-white";
            if (answered) style = "border-[#2b6cb0] text-[#2b6cb0] bg-[#eaf2fb]";
            if (isCurrent) style = "border-[#1a1a1a] text-[#1a1a1a] bg-[#1a1a1a] !text-white";
            return (
              <button
                key={g.groupId || g.members[0].questionNumber}
                onClick={() => jumpTo(i)}
                className={`text-xs font-mono border px-2 py-1 min-w-[32px] transition-colors ${style}`}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto">
          <GroupCard group={group} selections={selections} onChoose={choose} mode="answering" />
        </div>

        <div className="pt-2 space-y-2">
          <div className="flex gap-2">
            <button
              onClick={goPrev}
              disabled={idx === 0}
              className="flex-1 border border-[#1a1a1a] disabled:border-[#ddd] disabled:text-[#ccc] text-[#1a1a1a] py-3 font-semibold rounded-2xl transition-colors"
            >
              ← 上一題
            </button>
            <button
              onClick={goNext}
              disabled={idx === total - 1}
              className="flex-1 border border-[#1a1a1a] disabled:border-[#ddd] disabled:text-[#ccc] text-[#1a1a1a] py-3 font-semibold rounded-2xl transition-colors"
            >
              下一題 →
            </button>
          </div>
          <button
            onClick={handleSubmitClick}
            className="w-full bg-[#9a3324] text-[#faf9f6] py-4 font-semibold rounded-2xl transition-colors"
          >
            交卷
          </button>
        </div>
      </div>

      {showSubmitConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-6 z-50">
          <div className="bg-[#faf9f6] max-w-sm w-full p-6 border border-[#1a1a1a] rounded-2xl">
            <p className="text-[#1a1a1a] font-semibold mb-2">還有 {totalQuestionCount - answeredCount} 題沒作答</p>
            <p className="text-sm text-[#666] mb-6">確定要直接交卷嗎？沒作答的題目會算答錯。</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowSubmitConfirm(false)}
                className="flex-1 border border-[#1a1a1a] text-[#1a1a1a] py-3 font-semibold rounded-2xl"
              >
                繼續作答
              </button>
              <button
                onClick={() => onSubmit(selections)}
                className="flex-1 bg-[#9a3324] text-[#faf9f6] py-3 font-semibold rounded-2xl"
              >
                直接交卷
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- 畫面：結果 ---------- */

function useMemoWrongGroups(set, wrong) {
  return React.useMemo(() => {
    const wrongQNumbers = new Set(wrong.map((r) => r.q.questionNumber));
    const allGroups = groupQuestions(set.questions);
    // 只保留「組內至少有一題答錯」的組，且每組只留下答錯的成員（沒答錯的子題不顯示在這份詳解清單裡）
    return allGroups
      .map((g) => ({ ...g, members: g.members.filter((m) => wrongQNumbers.has(m.questionNumber)) }))
      .filter((g) => g.members.length > 0);
  }, [set, wrong]);
}

function ResultScreen({ set, answers, onBackHome, onReviewWrong }) {
  const results = set.questions.map((q) => ({
    q,
    correct: answers[q.questionNumber] === q.correctAnswer,
  }));
  const correctCount = results.filter((r) => r.correct).length;
  const total = set.questions.length;
  const rate = Math.round((correctCount / total) * 100);
  const wrong = results.filter((r) => !r.correct);

  // 把錯題依照所屬的組重新整理：題組內哪怕只有一題答錯，也要顯示整組（因為共用圖片/引言需要上下文），
  // 但 GroupCard 內每一題各自還是用 selections 對照，沒答錯的子題會顯示綠色（不會誤判成紅色）
  const wrongGroups = useMemoWrongGroups(set, wrong);

  return (
    <div className="min-h-screen bg-[#faf9f6] flex flex-col">
      <div className="max-w-md mx-auto w-full px-6 pt-12 pb-8 flex-1 flex flex-col">
        <div className="text-xs tracking-[0.25em] text-[#9a3324] font-mono mb-2">作答結果</div>
        <div className="flex items-end gap-3 mb-6">
          <span className="text-6xl font-mono font-bold text-[#1a1a1a]">{rate}</span>
          <span className="text-2xl font-mono text-[#999] pb-1">%</span>
        </div>
        <div className="flex gap-4 text-sm font-mono text-[#555] mb-8 pb-6 border-b border-dashed border-[#ccc]">
          <span>答對 <b className="text-[#2f6b3a]">{correctCount}</b></span>
          <span>答錯 <b className="text-[#9a3324]">{total - correctCount}</b></span>
          <span>共 {total} 題</span>
        </div>

        {wrong.length > 0 && (
          <div className="mb-8">
            <div className="text-sm font-semibold text-[#1a1a1a] mb-4">錯題詳解</div>
            {wrongGroups.map((g) => (
              <div key={g.groupId || g.members[0].questionNumber} className="mb-6 pb-6 border-b border-[#e5e2da]">
                <GroupCard group={g} selections={answers} onChoose={() => {}} mode="graded" />
              </div>
            ))}
          </div>
        )}

        <div className="space-y-3 pt-2">
          {wrong.length > 0 && (
            <button onClick={onReviewWrong} className="w-full border border-[#1a1a1a] text-[#1a1a1a] py-4 font-semibold rounded-2xl">
              查看錯題本
            </button>
          )}
          <button onClick={onBackHome} className="w-full bg-[#9a3324] text-[#faf9f6] py-4 font-semibold rounded-2xl">
            回題庫首頁
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- 畫面：錯題本 ---------- */

function WrongBookScreen({ set, wrongIds, onBack, onPractice }) {
  const wrongQs = set.questions.filter((q) => wrongIds.includes(q.questionNumber));

  return (
    <div className="min-h-screen bg-[#faf9f6]">
      <div className="max-w-md mx-auto w-full px-6 pt-12 pb-8">
        <button onClick={onBack} className="text-sm text-[#999] font-mono mb-6">← 返回</button>
        <div className="text-xs tracking-[0.25em] text-[#9a3324] font-mono mb-2">錯題本</div>
        <h2 className="text-2xl font-bold text-[#1a1a1a] mb-6" style={{ fontFamily: "'Noto Serif TC', serif" }}>
          累積錯題 {wrongQs.length} 題
        </h2>

        {wrongQs.length === 0 ? (
          <div className="text-center py-16 text-[#999]">
            <p className="text-sm">目前沒有錯題紀錄。</p>
          </div>
        ) : (
          <>
            <button onClick={() => onPractice(wrongQs)} className="w-full bg-[#9a3324] text-[#faf9f6] py-4 font-semibold mb-6 rounded-2xl">
              重新練習這 {wrongQs.length} 題 →
            </button>
            <div className="space-y-3">
              {wrongQs.map((q) => (
                <div key={q.questionNumber} className="border border-[#e5e2da] bg-white p-4 rounded-2xl">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-mono font-bold text-[#9a3324]">第{q.questionNumber}題</span>
                    <span className="font-mono text-xs text-[#999]">正解 {q.correctAnswer}</span>
                  </div>
                  <p className="text-sm text-[#444] leading-relaxed line-clamp-2">{q.stem}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------- 畫面：統計 ---------- */

function StatsScreen({ history, onBack }) {
  const totalAnswered = history.reduce((sum, h) => sum + h.total, 0);
  const totalCorrect = history.reduce((sum, h) => sum + h.correct, 0);
  const overallRate = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#faf9f6]">
      <div className="max-w-md mx-auto w-full px-6 pt-12 pb-8">
        <button onClick={onBack} className="text-sm text-[#999] font-mono mb-6">← 返回</button>
        <div className="text-xs tracking-[0.25em] text-[#9a3324] font-mono mb-2">作答統計</div>
        <h2 className="text-2xl font-bold text-[#1a1a1a] mb-6" style={{ fontFamily: "'Noto Serif TC', serif" }}>
          整體表現
        </h2>
        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="border border-[#1a1a1a] p-4 rounded-2xl">
            <div className="text-2xl font-mono font-bold text-[#1a1a1a]">{history.length}</div>
            <div className="text-xs text-[#666] mt-1">測驗次數</div>
          </div>
          <div className="border border-[#1a1a1a] p-4 rounded-2xl">
            <div className="text-2xl font-mono font-bold text-[#1a1a1a]">{totalAnswered}</div>
            <div className="text-xs text-[#666] mt-1">作答題數</div>
          </div>
          <div className="border border-[#1a1a1a] p-4 rounded-2xl">
            <div className="text-2xl font-mono font-bold text-[#9a3324]">{overallRate}%</div>
            <div className="text-xs text-[#666] mt-1">答對率</div>
          </div>
        </div>
        <div className="text-sm font-semibold text-[#1a1a1a] mb-3">測驗紀錄</div>
        {history.length === 0 ? (
          <div className="text-center py-12 text-[#999] text-sm">尚無作答紀錄。</div>
        ) : (
          <div className="space-y-2">
            {[...history].reverse().map((h, i) => (
              <div key={i} className="flex items-center justify-between border-b border-[#e5e2da] py-3">
                <div className="text-sm text-[#555]">
                  {new Date(h.date).toLocaleDateString("zh-TW", { month: "long", day: "numeric" })}
                </div>
                <div className="font-mono text-sm">
                  <span className="text-[#1a1a1a] font-bold">{h.correct}</span>
                  <span className="text-[#999]"> / {h.total}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- 主應用 ---------- */

export default function QuizApp() {
  const { state: progressState, loaded: progressLoaded, save: saveProgress } = useProgress();
  const [customSets, setCustomSets] = useState(null);
  const [screen, setScreen] = useState("library"); // library | settings | setHome | quiz | result | wrongbook | stats
  const [activeSet, setActiveSet] = useState(null);
  const [activeGroups, setActiveGroups] = useState(null);
  const [lastAnswers, setLastAnswers] = useState({});
  const [practiceMode, setPracticeMode] = useState(false);

  useEffect(() => {
    loadCustomQuizSets().then(setCustomSets);
  }, []);

  if (!progressLoaded || customSets === null) {
    return (
      <div className="min-h-screen bg-[#faf9f6] flex items-center justify-center">
        <div className="font-mono text-sm text-[#999]">載入中…</div>
      </div>
    );
  }

  const builtinSets = getBuiltinQuizSets(BUILTIN_MODULES);
  const allSets = [...builtinSets, ...customSets];

  const handleAddCustomSet = async (newSet) => {
    const next = [...customSets, newSet];
    setCustomSets(next);
    await saveCustomQuizSets(next);
  };

  const handleDeleteCustomSet = async (id) => {
    const next = customSets.filter((s) => s.id !== id);
    setCustomSets(next);
    await saveCustomQuizSets(next);
  };

  const handleSelectSet = (set) => {
    setActiveSet(set);
    setScreen("setHome");
  };

  const startQuiz = (questions) => {
    setActiveGroups(groupQuestions(questions));
    setPracticeMode(questions.length < activeSet.questions.length);
    setLastAnswers({});
    setScreen("quiz");
  };

  const handleFinish = async (answers) => {
    setLastAnswers(answers);
    const setProgress = getSetProgress(progressState, activeSet.id);

    const answeredQNumbers = Object.keys(answers).map(Number);
    const correctedIds = answeredQNumbers.filter(
      (qn) => answers[qn] === activeSet.questions.find((q) => q.questionNumber === qn)?.correctAnswer
    );
    const newWrongIds = answeredQNumbers.filter(
      (qn) => answers[qn] !== activeSet.questions.find((q) => q.questionNumber === qn)?.correctAnswer
    );
    const mergedWrong = Array.from(
      new Set([...setProgress.wrongIds.filter((id) => !correctedIds.includes(id)), ...newWrongIds])
    );

    // 練習模式（錯題重練）不計入正式統計歷史，只更新錯題本
    const newHistory = practiceMode
      ? setProgress.history
      : [...setProgress.history, { date: new Date().toISOString(), correct: answeredQNumbers.length - newWrongIds.length, total: answeredQNumbers.length }];

    saveProgress({
      ...progressState,
      [activeSet.id]: { wrongIds: mergedWrong, history: newHistory },
    });
    setScreen("result");
  };

  const currentSetProgress = activeSet ? getSetProgress(progressState, activeSet.id) : null;

  return (
    <>
      {screen === "library" && (
        <LibraryScreen
          quizSets={allSets}
          progressState={progressState}
          onSelectSet={handleSelectSet}
          onOpenSettings={() => setScreen("settings")}
        />
      )}
      {screen === "settings" && (
        <SettingsScreen
          quizSets={allSets}
          customSets={customSets}
          onAddCustomSet={handleAddCustomSet}
          onDeleteCustomSet={handleDeleteCustomSet}
          onBack={() => setScreen("library")}
        />
      )}
      {screen === "setHome" && activeSet && (
        <SetHomeScreen
          set={activeSet}
          progress={currentSetProgress}
          onStart={() => startQuiz(activeSet.questions)}
          onReview={() => setScreen("wrongbook")}
          onStats={() => setScreen("stats")}
          onBack={() => setScreen("library")}
        />
      )}
      {screen === "quiz" && activeGroups && (
        <QuizScreen
          groups={activeGroups}
          initialSelections={lastAnswers}
          onSubmit={handleFinish}
          onExit={() => setScreen("setHome")}
        />
      )}
      {screen === "result" && activeSet && (
        <ResultScreen
          set={activeSet}
          answers={lastAnswers}
          onBackHome={() => setScreen("setHome")}
          onReviewWrong={() => setScreen("wrongbook")}
        />
      )}
      {screen === "wrongbook" && activeSet && currentSetProgress && (
        <WrongBookScreen
          set={activeSet}
          wrongIds={currentSetProgress.wrongIds}
          onBack={() => setScreen("setHome")}
          onPractice={(qs) => startQuiz(qs)}
        />
      )}
      {screen === "stats" && currentSetProgress && (
        <StatsScreen history={currentSetProgress.history} onBack={() => setScreen("setHome")} />
      )}
    </>
  );
}
