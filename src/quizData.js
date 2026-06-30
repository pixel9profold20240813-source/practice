/* ---------- 題庫管理 ---------- */

// 內建題庫清單。之後新增更多年份/科目時，把對應的 questions_merged.json
// 轉成常數，import 進來，加進這個陣列即可。
export function getBuiltinQuizSets(builtinDataModules) {
  return builtinDataModules.map((mod) => ({
    id: `builtin-${mod.meta.year}-${mod.meta.subject}`,
    isBuiltin: true,
    meta: mod.meta,
    questions: mod.questions,
  }));
}

const CUSTOM_SETS_STORAGE_KEY = "cap-quiz-custom-sets-v1";

export async function loadCustomQuizSets() {
  try {
    const res = await window.storage.get(CUSTOM_SETS_STORAGE_KEY, false);
    return res ? JSON.parse(res.value) : [];
  } catch (e) {
    return [];
  }
}

export async function saveCustomQuizSets(sets) {
  try {
    await window.storage.set(CUSTOM_SETS_STORAGE_KEY, JSON.stringify(sets), false);
    return true;
  } catch (e) {
    console.error("saveCustomQuizSets failed", e);
    return false;
  }
}

// 驗證使用者貼上的 JSON 是否符合題庫格式，回傳 {valid, error, normalized}
export function validateQuizSetJson(rawText) {
  let data;
  try {
    data = JSON.parse(rawText);
  } catch (e) {
    return { valid: false, error: "不是有效的 JSON 格式，請確認貼上的內容完整" };
  }

  let meta, questions;
  if (Array.isArray(data)) {
    questions = data;
    meta = {};
  } else if (data && typeof data === "object" && Array.isArray(data.questions)) {
    questions = data.questions;
    meta = data.meta || {};
  } else {
    return { valid: false, error: "格式不正確，應該是題目陣列，或含有 questions 欄位的物件" };
  }

  if (questions.length === 0) {
    return { valid: false, error: "題庫是空的，沒有任何題目" };
  }

  // 補 meta（如果缺漏，從第一題推回去）
  if (!meta.year || !meta.subject) {
    meta = {
      year: questions[0].year,
      subject: questions[0].subject,
      subjectLabel: meta.subjectLabel || SUBJECT_LABELS[questions[0].subject] || questions[0].subject,
    };
  }
  if (!meta.subjectLabel) {
    meta.subjectLabel = SUBJECT_LABELS[meta.subject] || meta.subject;
  }

  // 檢查每題基本欄位是否齊全
  const requiredFields = ["questionNumber", "stem", "options", "correctAnswer"];
  for (const q of questions) {
    for (const field of requiredFields) {
      if (q[field] === undefined) {
        return { valid: false, error: `第${q.questionNumber ?? "?"}題缺少必要欄位「${field}」` };
      }
    }
  }

  return { valid: true, error: null, normalized: { meta, questions } };
}

export const SUBJECT_LABELS = {
  chinese: "國文",
  english: "英語",
  math: "數學",
  nature: "自然",
  social: "社會",
};

/* ---------- 題組分組工具 ---------- */

function splitSentences(text) {
  const parts = text.split(/([。？！])/);
  const sentences = [];
  for (let i = 0; i < parts.length - 1; i += 2) {
    sentences.push(parts[i] + parts[i + 1]);
  }
  if (parts.length % 2 === 1 && parts[parts.length - 1]) {
    sentences.push(parts[parts.length - 1]);
  }
  return sentences;
}

function commonPrefixSentences(stems) {
  const sentenceLists = stems.map(splitSentences);
  const minLen = Math.min(...sentenceLists.map((sl) => sl.length));
  const common = [];
  for (let i = 0; i < minLen; i++) {
    const candidate = sentenceLists[0][i];
    if (sentenceLists.every((sl) => sl[i] === candidate)) {
      common.push(candidate);
    } else {
      break;
    }
  }
  return common.join("");
}

/**
 * 把題目陣列依照 groupId 分組，回傳「作答單位」陣列。
 * 沒有 groupId 的題目自己是一組（單題）。
 * 題組會自動抽出共同引言文字（sharedIntro），每小題只保留各自獨有的問句（ownStem）。
 */
export function groupQuestions(questions) {
  const sorted = [...questions].sort((a, b) => a.questionNumber - b.questionNumber);
  const groups = [];
  const seenGroupIds = new Set();

  for (const q of sorted) {
    if (q.groupId) {
      if (seenGroupIds.has(q.groupId)) continue;
      seenGroupIds.add(q.groupId);
      const members = sorted.filter((sq) => sq.groupId === q.groupId);
      const sharedIntro = members.length > 1 ? commonPrefixSentences(members.map((m) => m.stem)) : "";
      groups.push({
        groupId: q.groupId,
        isGroup: true,
        sharedIntro,
        sharedImage: q.stemImage || null,
        members: members.map((m) => ({
          ...m,
          ownStem: sharedIntro ? m.stem.slice(sharedIntro.length).trim() : m.stem,
        })),
      });
    } else {
      groups.push({
        groupId: null,
        isGroup: false,
        sharedIntro: "",
        sharedImage: q.stemImage || null,
        members: [{ ...q, ownStem: q.stem }],
      });
    }
  }
  return groups;
}
