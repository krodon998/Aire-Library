const API_URL = "https://dqlwhpuiyuabghyzkvoz.supabase.co/functions/v1/aire-library";
const STORAGE_KEY = "aire-library-state-v1";
const HIGHLIGHT_KEY = "aire-library-highlights-v1";
const CHUNK_SIZE = 12000;

const $ = (id) => document.getElementById(id);

const ui = {
  libraryView: $("libraryView"),
  readerView: $("readerView"),
  searchForm: $("searchForm"),
  searchInput: $("searchInput"),
  searchButton: $("searchButton"),
  popularButton: $("popularButton"),
  statusText: $("statusText"),
  resultsSection: $("resultsSection"),
  resultsGrid: $("resultsGrid"),
  resultMeta: $("resultMeta"),
  resumeButton: $("resumeButton"),
  backButton: $("backButton"),
  readerTitle: $("readerTitle"),
  readerBookMeta: $("readerBookMeta"),
  readerProgressText: $("readerProgressText"),
  progressBar: $("progressBar"),
  readerText: $("readerText"),
  previousButton: $("previousButton"),
  nextButton: $("nextButton"),
  highlightsToggle: $("highlightsToggle"),
  highlightCount: $("highlightCount"),
  highlightsPanel: $("highlightsPanel"),
  closeHighlights: $("closeHighlights"),
  highlightList: $("highlightList"),
  selectionAction: $("selectionAction"),
};

const state = {
  currentBook: null,
  chunk: null,
  history: [],
  pendingSelection: null,
  ...readJson(STORAGE_KEY, {}),
};

let highlights = readJson(HIGHLIGHT_KEY, []);

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
}

function saveState() {
  const snapshot = {
    currentBook: state.currentBook,
    chunk: state.chunk
      ? {
          id: state.chunk.id,
          title: state.chunk.title,
          offset: state.chunk.offset,
          length: state.chunk.length,
          totalChars: state.chunk.totalChars,
          hasMore: state.chunk.hasMore,
        }
      : null,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  updateResumeButton();
}

function saveHighlights() {
  localStorage.setItem(HIGHLIGHT_KEY, JSON.stringify(highlights));
  updateHighlightUi();
}

async function callApi(op, payload = {}) {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ op, ...payload }),
  });

  let body;
  try {
    body = await response.json();
  } catch {
    throw new Error("书房后端没有返回可读的数据。");
  }

  if (!response.ok || body?.ok === false) {
    throw new Error(body?.error || "请求失败。");
  }

  return body?.data ?? body;
}

function normalizeBooks(data) {
  const candidates = [
    data,
    data?.books,
    data?.results,
    data?.items,
    data?.data,
    data?.result?.books,
    data?.result?.results,
  ];

  for (const value of candidates) {
    if (Array.isArray(value)) return value;
  }

  return [];
}

function normalizeAuthor(book) {
  const authors = book?.authors ?? book?.author ?? [];

  if (typeof authors === "string") return authors;

  if (Array.isArray(authors)) {
    return authors
      .map((author) => {
        if (typeof author === "string") return author;
        if (!author) return "";
        const name = author.name || "";
        const years =
          author.birth_year || author.death_year
            ? [author.birth_year ?? "?", author.death_year ?? "?"].join("–")
            : "";
        return years ? `${name} (${years})` : name;
      })
      .filter(Boolean)
      .join(" · ");
  }

  return "";
}

function bookId(book) {
  return Number(book?.id ?? book?.gutenberg_id ?? book?.book_id);
}

function hasReadableText(book) {
  if ("has_plain_text" in (book || {})) return Boolean(book.has_plain_text);
  if ("hasPlainText" in (book || {})) return Boolean(book.hasPlainText);
  return true;
}

function setStatus(message) {
  ui.statusText.textContent = message;
}

function setBusy(button, busy) {
  button.disabled = busy;
  button.dataset.originalText ||= button.textContent;
  button.textContent = busy ? "等等……" : button.dataset.originalText;
}

function updateResumeButton() {
  const saved = readJson(STORAGE_KEY, {});
  const canResume = saved?.currentBook?.id && saved?.chunk?.offset >= 0;
  ui.resumeButton.classList.toggle("hidden", !canResume);

  if (canResume) {
    ui.resumeButton.textContent = `继续《${saved.currentBook.title || "上次那本"}》`;
  }
}

function showLibrary() {
  ui.readerView.classList.add("hidden");
  ui.libraryView.classList.remove("hidden");
  ui.highlightsPanel.classList.add("hidden");
  clearSelectionAction();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showReader() {
  ui.libraryView.classList.add("hidden");
  ui.readerView.classList.remove("hidden");
}

function renderBooks(data) {
  const books = normalizeBooks(data);
  ui.resultsGrid.replaceChildren();
  ui.resultsSection.classList.remove("hidden");

  const total =
    data?.totalCount ??
    data?.total_count ??
    data?.totalInCatalog ??
    data?.count ??
    books.length;

  ui.resultMeta.textContent = books.length ? `显示 ${books.length} 本 · 共 ${total}` : "";

  if (!books.length) {
    const empty = document.createElement("div");
    empty.className = "welcome glass";
    empty.textContent = "这次没找到。换个标题、作者名，或者点“随便逛逛”。";
    ui.resultsGrid.appendChild(empty);
    return;
  }

  for (const book of books) {
    const id = bookId(book);
    if (!Number.isFinite(id)) continue;

    const card = document.createElement("article");
    card.className = "book-card glass";

    const eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = `Gutenberg #${id}`;

    const title = document.createElement("h3");
    title.textContent = book.title || `Book #${id}`;

    const meta = document.createElement("p");
    meta.className = "book-meta";
    const parts = [normalizeAuthor(book)];

    if (Array.isArray(book.languages) && book.languages.length) {
      parts.push(book.languages.join(" / "));
    }

    if (Number.isFinite(book.download_count)) {
      parts.push(`${book.download_count.toLocaleString()} downloads`);
    }

    meta.textContent = parts.filter(Boolean).join(" · ");

    const open = document.createElement("button");
    open.className = "soft-button";
    open.type = "button";
    open.textContent = hasReadableText(book) ? "一起读" : "暂无纯文本";
    open.disabled = !hasReadableText(book);
    open.addEventListener("click", () => {
      openBook({
        id,
        title: book.title || `Book #${id}`,
        author: normalizeAuthor(book),
      });
    });

    card.append(eyebrow, title, meta, open);
    ui.resultsGrid.appendChild(card);
  }
}

async function runSearch(query) {
  setBusy(ui.searchButton, true);
  setStatus("正在书架里找……");

  try {
    const data = await callApi("search", { query });
    renderBooks(data);
    setStatus("找到了。挑一本。");
  } catch (error) {
    setStatus(`没找成：${error.message}`);
  } finally {
    setBusy(ui.searchButton, false);
  }
}

async function browsePopular() {
  setBusy(ui.popularButton, true);
  setStatus("随便逛逛书架……");

  try {
    const data = await callApi("popular");
    renderBooks(data);
    setStatus("随便挑。");
  } catch (error) {
    setStatus(`没逛成：${error.message}`);
  } finally {
    setBusy(ui.popularButton, false);
  }
}

async function openBook(book, offset = 0) {
  state.currentBook = book;
  state.history = [];
  showReader();
  ui.readerTitle.textContent = book.title;
  ui.readerBookMeta.textContent = [`Gutenberg #${book.id}`, book.author]
    .filter(Boolean)
    .join(" · ");

  await loadChunk(offset, { pushHistory: false });
}

async function loadChunk(offset, { pushHistory = true } = {}) {
  if (!state.currentBook?.id) return;

  ui.readerText.textContent = "正在翻页……";
  ui.previousButton.disabled = true;
  ui.nextButton.disabled = true;
  clearSelectionAction();

  const previousOffset = state.chunk?.offset;

  try {
    const data = await callApi("text", {
      id: state.currentBook.id,
      offset: Math.max(0, Number(offset) || 0),
      limit: CHUNK_SIZE,
    });

    const text = data?.text;
    if (typeof text !== "string" || !text.length) {
      throw new Error("这一段没有拿到正文。");
    }

    if (pushHistory && Number.isFinite(previousOffset) && previousOffset !== data.offset) {
      state.history.push(previousOffset);
    }

    state.chunk = {
      id: Number(data.id ?? state.currentBook.id),
      title: data.title ?? state.currentBook.title,
      text,
      offset: Number(data.offset ?? offset ?? 0),
      length: Number(data.length ?? text.length),
      totalChars: Number(data.totalChars ?? data.total_chars ?? 0),
      remainingChars: Number(data.remainingChars ?? data.remaining_chars ?? 0),
      hasMore: Boolean(data.hasMore ?? data.has_more),
      provenance: data.provenance ?? "",
    };

    if (data.title && !state.currentBook.title) {
      state.currentBook.title = data.title;
    }

    saveState();
    renderReaderChunk();
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (error) {
    ui.readerText.textContent = `这一段没拿到：${error.message}`;
    ui.readerProgressText.textContent = "读取失败";
    ui.progressBar.style.width = "0%";
  } finally {
    ui.previousButton.disabled = state.history.length === 0;
    ui.nextButton.disabled = !state.chunk?.hasMore;
  }
}

function renderReaderChunk() {
  const chunk = state.chunk;
  if (!chunk) return;

  ui.readerTitle.textContent = state.currentBook?.title || chunk.title || "Reading";
  ui.readerBookMeta.textContent = [
    `Gutenberg #${state.currentBook?.id || chunk.id}`,
    state.currentBook?.author,
  ]
    .filter(Boolean)
    .join(" · ");

  const total = chunk.totalChars || 0;
  const end = chunk.offset + chunk.length;
  const progress = total ? Math.min(100, (end / total) * 100) : 0;

  ui.readerProgressText.textContent = total
    ? `${Math.round(progress)}% · 位置 ${chunk.offset.toLocaleString()}–${end.toLocaleString()}`
    : `位置 ${chunk.offset.toLocaleString()}`;

  ui.progressBar.style.width = `${progress}%`;

  renderTextWithHighlights();
  updateHighlightUi();
}

function currentBookHighlights() {
  const id = Number(state.currentBook?.id);
  return highlights
    .filter((item) => Number(item.bookId) === id)
    .sort((a, b) => a.start - b.start);
}

function renderTextWithHighlights() {
  const chunk = state.chunk;
  if (!chunk?.text) {
    ui.readerText.textContent = "";
    return;
  }

  const start = chunk.offset;
  const end = chunk.offset + chunk.text.length;
  const relevant = currentBookHighlights()
    .filter((item) => item.end > start && item.start < end)
    .map((item) => ({
      ...item,
      localStart: Math.max(0, item.start - start),
      localEnd: Math.min(chunk.text.length, item.end - start),
    }))
    .sort((a, b) => a.localStart - b.localStart);

  ui.readerText.replaceChildren();

  let cursor = 0;

  for (const item of relevant) {
    if (item.localStart > cursor) {
      ui.readerText.append(document.createTextNode(chunk.text.slice(cursor, item.localStart)));
    }

    const mark = document.createElement("mark");
    mark.dataset.highlightId = item.id;
    mark.append(document.createTextNode(chunk.text.slice(item.localStart, item.localEnd)));
    ui.readerText.append(mark);
    cursor = Math.max(cursor, item.localEnd);
  }

  if (cursor < chunk.text.length) {
    ui.readerText.append(document.createTextNode(chunk.text.slice(cursor)));
  }
}

function selectionOffsetsWithin(element, range) {
  const pre = range.cloneRange();
  pre.selectNodeContents(element);
  pre.setEnd(range.startContainer, range.startOffset);

  const start = pre.toString().length;
  const selected = range.toString();

  return {
    start,
    end: start + selected.length,
    quote: selected,
  };
}

function captureSelection() {
  const selection = window.getSelection();

  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    clearSelectionAction();
    return;
  }

  const range = selection.getRangeAt(0);
  if (!ui.readerText.contains(range.commonAncestorContainer)) {
    clearSelectionAction();
    return;
  }

  const local = selectionOffsetsWithin(ui.readerText, range);
  const quote = local.quote.trim();

  if (quote.length < 2) {
    clearSelectionAction();
    return;
  }

  const trimLeft = local.quote.indexOf(quote);

  state.pendingSelection = {
    quote,
    start: state.chunk.offset + local.start + Math.max(0, trimLeft),
    end: state.chunk.offset + local.start + Math.max(0, trimLeft) + quote.length,
  };

  ui.selectionAction.classList.remove("hidden");
}

function clearSelectionAction() {
  state.pendingSelection = null;
  ui.selectionAction.classList.add("hidden");
}

function savePendingHighlight() {
  const pending = state.pendingSelection;
  if (!pending || !state.currentBook?.id) return;

  const duplicate = highlights.some(
    (item) =>
      Number(item.bookId) === Number(state.currentBook.id) &&
      item.start === pending.start &&
      item.end === pending.end
  );

  if (!duplicate) {
    highlights.push({
      id: crypto.randomUUID(),
      bookId: Number(state.currentBook.id),
      bookTitle: state.currentBook.title,
      quote: pending.quote,
      start: pending.start,
      end: pending.end,
      createdAt: new Date().toISOString(),
      syncState: "local",
    });
    saveHighlights();
  }

  window.getSelection()?.removeAllRanges();
  clearSelectionAction();
  renderTextWithHighlights();
}

function updateHighlightUi() {
  const items = currentBookHighlights();
  ui.highlightCount.textContent = String(items.length);
  ui.highlightList.replaceChildren();

  if (!items.length) {
    const empty = document.createElement("p");
    empty.className = "status";
    empty.textContent = "还没有划线。选中正文后，点“划下来”。";
    ui.highlightList.appendChild(empty);
    return;
  }

  for (const item of items) {
    const wrapper = document.createElement("article");
    wrapper.className = "highlight-item";

    const quote = document.createElement("blockquote");
    quote.textContent = item.quote;

    const footer = document.createElement("footer");

    const pos = document.createElement("span");
    pos.className = "status";
    pos.textContent = `位置 ${item.start.toLocaleString()}`;

    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "删除";
    remove.addEventListener("click", () => {
      highlights = highlights.filter((highlight) => highlight.id !== item.id);
      saveHighlights();
      renderTextWithHighlights();
    });

    footer.append(pos, remove);
    wrapper.append(quote, footer);
    ui.highlightList.appendChild(wrapper);
  }
}

function toggleHighlights(force) {
  const shouldShow =
    typeof force === "boolean" ? force : ui.highlightsPanel.classList.contains("hidden");
  ui.highlightsPanel.classList.toggle("hidden", !shouldShow);
}

async function resumeLastReading() {
  const saved = readJson(STORAGE_KEY, {});
  const book = saved?.currentBook;
  const offset = saved?.chunk?.offset;

  if (!book?.id || !Number.isFinite(Number(offset))) return;
  await openBook(book, Number(offset));
}

ui.searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const query = ui.searchInput.value.trim();
  if (query) runSearch(query);
});

ui.popularButton.addEventListener("click", browsePopular);
ui.resumeButton.addEventListener("click", resumeLastReading);
ui.backButton.addEventListener("click", showLibrary);

ui.previousButton.addEventListener("click", () => {
  const offset = state.history.pop();
  if (Number.isFinite(offset)) loadChunk(offset, { pushHistory: false });
});

ui.nextButton.addEventListener("click", () => {
  const chunk = state.chunk;
  if (!chunk?.hasMore) return;
  loadChunk(chunk.offset + chunk.length);
});

ui.highlightsToggle.addEventListener("click", () => toggleHighlights());
ui.closeHighlights.addEventListener("click", () => toggleHighlights(false));
ui.selectionAction.addEventListener("click", savePendingHighlight);

document.addEventListener("selectionchange", () => {
  if (!ui.readerView.classList.contains("hidden")) {
    window.clearTimeout(captureSelection.timer);
    captureSelection.timer = window.setTimeout(captureSelection, 80);
  }
});

updateResumeButton();
updateHighlightUi();
