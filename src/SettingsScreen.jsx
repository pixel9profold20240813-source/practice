import React, { useState } from "react";
import { validateQuizSetJson, SUBJECT_LABELS } from "./quizData.js";

export default function SettingsScreen({ quizSets, customSets, onAddCustomSet, onDeleteCustomSet, onBack }) {
  const [mode, setMode] = useState("list"); // "list" | "add"
  const [pasteText, setPasteText] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    const result = validateQuizSetJson(pasteText);
    if (!result.valid) {
      setError(result.error);
      return;
    }
    const { meta, questions } = result.normalized;
    const id = `custom-${meta.year}-${meta.subject}-${Date.now()}`;
    const exists = quizSets.some(
      (s) => s.meta.year === meta.year && s.meta.subject === meta.subject
    );
    if (exists) {
      if (!window.confirm(`已經有「${meta.year}年 ${meta.subjectLabel}科」的題庫了，要新增重複的嗎？`)) {
        return;
      }
    }
    await onAddCustomSet({ id, isBuiltin: false, meta, questions });
    setPasteText("");
    setError("");
    setMode("list");
  };

  return (
    <div className="min-h-screen bg-[#faf9f6]">
      <div className="max-w-md mx-auto w-full px-6 pt-12 pb-8">
        <button onClick={onBack} className="text-sm text-[#999] font-mono mb-6">← 返回</button>
        <div className="text-xs tracking-[0.25em] text-[#9a3324] font-mono mb-2">題庫管理</div>
        <h2 className="text-2xl font-bold text-[#1a1a1a] mb-6" style={{ fontFamily: "'Noto Serif TC', serif" }}>
          設定
        </h2>

        {mode === "list" && (
          <>
            <div className="space-y-3 mb-6">
              {quizSets.map((set) => (
                <div key={set.id} className="border border-[#e5e2da] bg-white p-4 flex items-center justify-between rounded-2xl">
                  <div>
                    <div className="font-mono font-bold text-[#1a1a1a]">
                      {set.meta.year}年 {set.meta.subjectLabel}科
                    </div>
                    <div className="text-xs text-[#999] mt-1">
                      {set.questions.length} 題 {set.isBuiltin ? "・ 內建題庫" : "・ 自訂題庫"}
                    </div>
                  </div>
                  {!set.isBuiltin && (
                    <button
                      onClick={() => {
                        if (window.confirm(`確定要刪除「${set.meta.year}年 ${set.meta.subjectLabel}科」這份題庫嗎？`)) {
                          onDeleteCustomSet(set.id);
                        }
                      }}
                      className="text-xs text-[#9a3324] border border-[#9a3324] px-3 py-1 shrink-0 rounded-xl"
                    >
                      刪除
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={() => setMode("add")}
              className="w-full border border-[#9a3324] text-[#9a3324] py-4 font-semibold rounded-2xl"
            >
              ＋ 新增題庫
            </button>
          </>
        )}

        {mode === "add" && (
          <>
            <p className="text-sm text-[#555] leading-relaxed mb-4">
              貼上用截圖工具＋合併工具產出的 <code className="font-mono bg-[#f0eee8] px-1">questions_merged.json</code> 完整內容：
            </p>
            <textarea
              value={pasteText}
              onChange={(e) => { setPasteText(e.target.value); setError(""); }}
              placeholder="在這裡貼上 JSON 內容..."
              className="w-full h-64 border border-[#ccc] p-3 text-xs font-mono mb-3 resize-none rounded-xl"
            />
            {error && (
              <div className="text-xs text-[#9a3324] bg-[#faeae7] border border-[#9a3324] px-3 py-2 mb-3 rounded-xl">
                ⚠ {error}
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => { setMode("list"); setPasteText(""); setError(""); }}
                className="flex-1 border border-[#ccc] text-[#555] py-3 font-semibold rounded-2xl"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                disabled={!pasteText.trim()}
                className="flex-1 bg-[#9a3324] disabled:bg-[#ddd] text-[#faf9f6] py-3 font-semibold rounded-2xl"
              >
                確認新增
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
