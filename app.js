import {
  putBook,
  getBook,
  deleteBook,
  listBooks,
  putNote,
  deleteNote,
  listNotes,
  putFolder,
  listFolders,
  exportLibraryData,
} from "./db.js";
import { parseBookFile } from "./parsers.js";

const API_URL = "https://dqlwhpuiyuabghyzkvoz.supabase.co/functions/v1/aire-library";
const SETTINGS_KEY = "aire-library-settings-v2";

const $ = (id) => document.getElementById(id);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

const ui = {
  pageTitle: $("pageTitle"),
  pageSubtitle: $("pageSubtitle"),
  resumeButton: $("resumeButton"),
  storeView: $("storeView"),
  discoverView: $("discoverView"),
  settingsView: $("settingsView"),
  librarySearch: $("librarySearch"),
  uploadBookButton: $("uploadBookButton"),
  bookFileInput: $("bookFileInput"),
  readFilter: $("readFilter"),
  sortSelect: $("sortSelect"),
  folderBar: $("folderBar"),
  libraryEmpty: $("libraryEmpty"),
  bookGrid: $("bookGrid"),
  discoverForm: $("discoverForm"),
  discoverInput: $("discoverInput"),
  discoverButton: $("discoverButton"),
  popularButton: $("popularButton"),
  discoverStatus: $("discoverStatus"),
  discoverResults: $("discoverResults"),
  discoverMeta: $("discoverMeta"),
  discoverGrid: $("discoverGrid"),
  bookDetail: $("bookDetail"),
  detailCover: $("detailCover"),
  detailMeta: $("detailMeta"),
  detailTitle: $("detailTitle"),
  detailDescription: $("detailDescription"),
  detailReadButton: $("detailReadButton"),
  detailFolderButton: $("detailFolderButton"),
  detailDeleteButton: $("detailDeleteButton"),
  detailTabBody: $("detailTabBody"),
  readerView: $("readerView"),
  readerBackButton: $("readerBackButton"),
  readerMeta: $("readerMeta"),
  readerTitle: $("readerTitle"),
  readerProgress: $("readerProgress"),
  readerProgressBar: $("readerProgressBar"),
  readerPaper: $("readerPaper"),
  readerPrevButton: $("readerPrevButton"),
  readerChapterButton: $("readerChapterButton"),
  readerNextButton: $("readerNextButton"),
  readerNotesButton: $("readerNotesButton"),
  selectionButton: $("selectionButton"),
  noteComposer: $("noteComposer"),
  noteQuote: $("noteQuote"),
  noteText: $("noteText"),
  saveNoteButton: $("saveNoteButton"),
  highlightColors: $("highlightColors"),
  toast: $("toast"),
  themeSetting: $("themeSetting"),
  readingModeSetting: $("readingModeSetting"),
  fontSizeSetting: $("fontSizeSetting"),
  fontSizeValue: $("fontSizeValue"),
  lineHeightSetting: $("lineHeightSetting"),
  lineHeightValue: $("lineHeightValue"),
  letterSpacingSetting: $("letterSpacingSetting"),
  letterSpacingValue: $("letterSpacingValue"),
  contentWidthSetting: $("contentWidthSetting"),
  contentWidthValue: $("contentWidthValue"),
  translationEnabled: $("translationEnabled"),
  translationBaseUrl: $("translationBaseUrl"),
  translationApiKey: $("translationApiKey"),
  translationModel: $("translationModel"),
  translationDisplayMode: $("translationDisplayMode"),
  glassResetButton: $("glassResetButton"),
  glassBlurSetting: $("glassBlurSetting"),
  glassBlurValue: $("glassBlurValue"),
  glassOpacitySetting: $("glassOpacitySetting"),
  glassOpacityValue: $("glassOpacityValue"),
  glassSaturationSetting: $("glassSaturationSetting"),
  glassSaturationValue: $("glassSaturationValue"),
  glassHighlightSetting: $("glassHighlightSetting"),
  glassHighlightValue: $("glassHighlightValue"),
  glassRadiusSetting: $("glassRadiusSetting"),
  glassRadiusValue: $("glassRadiusValue"),
  glassTintSetting: $("glassTintSetting"),\n  glassRefractionSetting: $("glassRefractionSetting"),\n  glassRefractionValue: $("glassRefractionValue"),
  exportDataButton: $("exportDataButton"),
  createFolderButton: $("createFolderButton"),
};

const defaultSettings = {
  theme: "auto",
  readingMode: "paged",
  fontSize: 19,
  lineHeight: 1.95,
  letterSpacing: 0,
  contentWidth: 760,
  translation: {
    enabled: false,
    baseUrl: "",
    apiKey: "",
    model: "",
    displayMode: "both",
  },
  glass: {
    blur: 24,
    opacity: 0.56,
    saturation: 145,
    highlight: 0.46,
    radius: 24,
    tint: "#dcefff",
  },
};

const state = {
  view: "store",
  books: [],
  folders: [],
  filter: "all",
  sort: "lastRead",
  folderId: "all",
  detailBook: null,
  detailTab: "chapters",
  reader: null,
  readerNotes: [],
  pageHistory: [],
  pendingSelection: null,
  highlightColor: "blue",
  settings: loadSettings(),
};

function ensureGlassFilter() {
  if (document.getElementById("aire-liquid-filter-root")) return;
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.id = "aire-liquid-filter-root";
  svg.setAttribute("width", "0");
  svg.setAttribute("height", "0");
  svg.setAttribute("aria-hidden", "true");
  svg.style.position = "fixed";
  svg.style.pointerEvents = "none";

  const defs = document.createElementNS(ns, "defs");
  const filter = document.createElementNS(ns, "filter");
  filter.id = "aire-liquid-filter";
  filter.setAttribute("x", "-25%");
  filter.setAttribute("y", "-25%");
  filter.setAttribute("width", "150%");
  filter.setAttribute("height", "150%");

  const noise = document.createElementNS(ns, "feTurbulence");
  noise.setAttribute("type", "fractalNoise");
  noise.setAttribute("baseFrequency", "0.008 0.012");
  noise.setAttribute("numOctaves", "2");
  noise.setAttribute("seed", "11");
  noise.setAttribute("result", "noise");

  const displacement = document.createElementNS(ns, "feDisplacementMap");
  displacement.id = "aire-glass-displacement";
  displacement.setAttribute("in", "SourceGraphic");
  displacement.setAttribute("in2", "noise");
  displacement.setAttribute("scale", String(state.settings.glass.refraction ?? 14));
  displacement.setAttribute("xChannelSelector", "R");
  displacement.setAttribute("yChannelSelector", "B");

  filter.append(noise, displacement);
  defs.append(filter);
  svg.append(defs);
  document.body.prepend(svg);
}

function updateGlassFilter(scale) {
  const displacement = document.getElementById("aire-glass-displacement");
  if (displacement) displacement.setAttribute("scale", String(Math.max(0, Math.min(18, Number(scale) || 0))));
  document.documentElement.style.setProperty("--glass-refraction-opacity", String((Math.max(0, Math.min(18, Number(scale) || 0)) / 18) * 0.18));
}

function cloneDefaults() {
  return JSON.parse(JSON.stringify(defaultSettings));
}

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
    return {
      ...cloneDefaults(),
      ...saved,
      translation: { ...defaultSettings.translation, ...(saved.translation || {}) },
      glass: { ...defaultSettings.glass, ...(saved.glass || {}) },
    };
  } catch {
    return cloneDefaults();
  }
}

function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
  applySettings();
}

function applySettings() {
  const root = document.documentElement;
  const s = state.settings;
  const effectiveTheme =
    s.theme === "auto"
      ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : s.theme;

  root.dataset.theme = effectiveTheme;
  root.style.setProperty("--reader-font-size", `${s.fontSize}px`);
  root.style.setProperty("--reader-line-height", String(s.lineHeight));
  root.style.setProperty("--reader-letter-spacing", `${s.letterSpacing}px`);
  root.style.setProperty("--reader-width", `${s.contentWidth}px`);
  root.style.setProperty("--glass-blur", `${s.glass.blur}px`);
  root.style.setProperty("--glass-opacity", String(s.glass.opacity));
  root.style.setProperty("--glass-saturation", `${s.glass.saturation}%`);
  root.style.setProperty("--glass-highlight", String(s.glass.highlight));
  root.style.setProperty("--glass-radius", `${s.glass.radius}px`);
  root.style.setProperty("--glass-tint", s.glass.tint);

  populateSettingsUi();
  if (state.reader) renderReader();
}

function populateSettingsUi() {
  const s = state.settings;
  ui.themeSetting.value = s.theme;
  ui.readingModeSetting.value = s.readingMode;
  ui.fontSizeSetting.value = s.fontSize;
  ui.fontSizeValue.textContent = `${s.fontSize}px`;
  ui.lineHeightSetting.value = s.lineHeight;
  ui.lineHeightValue.textContent = Number(s.lineHeight).toFixed(2);
  ui.letterSpacingSetting.value = s.letterSpacing;
  ui.letterSpacingValue.textContent = `${Number(s.letterSpacing).toFixed(1)}px`;
  ui.contentWidthSetting.value = s.contentWidth;
  ui.contentWidthValue.textContent = `${s.contentWidth}px`;
  ui.translationEnabled.checked = s.translation.enabled;
  ui.translationBaseUrl.value = s.translation.baseUrl;
  ui.translationApiKey.value = s.translation.apiKey;
  ui.translationModel.value = s.translation.model;
  ui.translationDisplayMode.value = s.translation.displayMode;
  ui.glassBlurSetting.value = s.glass.blur;
  ui.glassBlurValue.textContent = `${s.glass.blur}px`;
  ui.glassOpacitySetting.value = s.glass.opacity;
  ui.glassOpacityValue.textContent = `${Math.round(s.glass.opacity * 100)}%`;
  ui.glassSaturationSetting.value = s.glass.saturation;
  ui.glassSaturationValue.textContent = `${s.glass.saturation}%`;
  ui.glassHighlightSetting.value = s.glass.highlight;
  ui.glassHighlightValue.textContent = `${Math.round(s.glass.highlight * 100)}%`;
  ui.glassRadiusSetting.value = s.glass.radius;
  ui.glassRadiusValue.textContent = `${s.glass.radius}px`;
  ui.glassTintSetting.value = s.glass.tint;\n  ui.glassRefractionSetting.value = s.glass.refraction;\n  ui.glassRefractionValue.textContent = String(s.glass.refraction);
}

function toast(message, duration = 2400) {
  ui.toast.textContent = message;
  ui.toast.classList.remove("hidden");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => ui.toast.classList.add("hidden"), duration);
}

function escapeText(value) {
  return String(value ?? "");
}

function humanBytes(size) {
  if (!Number.isFinite(size)) return "";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso) {
  if (!iso) return "未读";
  return new Intl.DateTimeFormat("zh-CN", { month: "short", day: "numeric" }).format(new Date(iso));
}

function coverTone(title) {
  const tones = ["#b8d8ef", "#c8d7ee", "#bfded7", "#ddd0e9", "#d8dfc5", "#ead7d5", "#c8dfec"];
  let hash = 0;
  for (const char of title || "") hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return tones[hash % tones.length];
}

function setView(view) {
  state.view = view;
  const meta = {
    store: ["存所", "书和我们一起留下的东西。"],
    discover: ["见闻", "去外面看看，还有什么值得带回来。"],
    settings: ["衡准", "把整间书房调成喜欢的样子。"],
  };
  ui.pageTitle.textContent = meta[view][0];
  ui.pageSubtitle.textContent = meta[view][1];
  ui.storeView.classList.toggle("hidden", view !== "store");
  ui.discoverView.classList.toggle("hidden", view !== "discover");
  ui.settingsView.classList.toggle("hidden", view !== "settings");
  $$(".nav-item").forEach((button) => button.classList.toggle("active", button.dataset.view === view));
}

async function refreshLibrary() {
  const [books, folders] = await Promise.all([listBooks(), listFolders()]);
  state.books = books;
  state.folders = folders;
  renderFolderBar();
  renderLibrary();
  updateResume();
}

function renderFolderBar() {
  ui.folderBar.replaceChildren();
  const all = document.createElement("button");
  all.className = `chip ${state.folderId === "all" ? "active" : ""}`;
  all.type = "button";
  all.textContent = "全部";
  all.onclick = () => {
    state.folderId = "all";
    renderFolderBar();
    renderLibrary();
  };
  ui.folderBar.append(all);

  for (const folder of state.folders.sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
    const button = document.createElement("button");
    button.className = `chip ${state.folderId === folder.id ? "active" : ""}`;
    button.type = "button";
    button.textContent = folder.name;
    button.onclick = () => {
      state.folderId = folder.id;
      renderFolderBar();
      renderLibrary();
    };
    ui.folderBar.append(button);
  }
}

function filteredBooks() {
  const query = ui.librarySearch.value.trim().toLowerCase();
  let books = [...state.books];

  if (state.filter === "read") books = books.filter((book) => Boolean(book.lastReadAt));
  if (state.filter === "unread") books = books.filter((book) => !book.lastReadAt);
  if (state.folderId !== "all") books = books.filter((book) => book.folderId === state.folderId);
  if (query) {
    books = books.filter((book) =>
      [book.title, book.author, book.description].some((value) => String(value || "").toLowerCase().includes(query))
    );
  }

  books.sort((a, b) => {
    if (state.sort === "uploaded") return String(b.importedAt).localeCompare(String(a.importedAt));
    if (state.sort === "title") return String(a.title).localeCompare(String(b.title), "zh-CN");
    return String(b.lastReadAt || b.importedAt).localeCompare(String(a.lastReadAt || a.importedAt));
  });

  return books;
}

function renderLibrary() {
  const books = filteredBooks();
  ui.libraryEmpty.classList.toggle("hidden", state.books.length > 0);
  ui.bookGrid.classList.toggle("hidden", state.books.length === 0);
  ui.bookGrid.replaceChildren();

  for (const book of books) {
    const card = document.createElement("article");
    card.className = "book-card liquid";
    card.style.setProperty("--cover-tone", coverTone(book.title));

    const cover = document.createElement("div");
    cover.className = "text-cover";
    cover.textContent = book.title;

    const footer = document.createElement("footer");
    const title = document.createElement("h3");
    title.className = "book-card-title";
    title.textContent = book.title;

    const meta = document.createElement("p");
    meta.className = "book-card-meta";
    meta.textContent = [book.author, book.format?.toUpperCase(), book.lastReadAt ? `读于 ${formatDate(book.lastReadAt)}` : "未读"]
      .filter(Boolean)
      .join(" · ");

    const progress = document.createElement("div");
    progress.className = "progress-line";
    const fill = document.createElement("span");
    const total = book.content?.length || 1;
    fill.style.width = `${Math.min(100, ((book.progressOffset || 0) / total) * 100)}%`;
    progress.append(fill);

    footer.append(title, meta, progress);
    card.append(cover, footer);
    card.addEventListener("click", () => openBookDetail(book.id));
    ui.bookGrid.append(card);
  }

  if (state.books.length && !books.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state liquid";
    empty.innerHTML = "<p>这里没有符合当前筛选的书。</p>";
    ui.bookGrid.append(empty);
  }
}

async function handleFiles(files) {
  const list = Array.from(files || []);
  if (!list.length) return;

  ui.bookFileInput.value = "";
  let done = 0;
  for (const file of list) {
    try {
      toast(`正在解析《${file.name}》……`, 120000);
      const book = await parseBookFile(file);
      await putBook(book);
      done++;
    } catch (error) {
      toast(`${file.name}：${error.message}`, 4800);
    }
  }
  await refreshLibrary();
  if (done) toast(`放进存所 ${done} 本书。`);
}

async function openBookDetail(id) {
  const book = await getBook(id);
  if (!book) return;
  state.detailBook = book;
  state.detailTab = "chapters";
  ui.detailCover.textContent = book.title;
  ui.detailCover.style.background = `linear-gradient(145deg, color-mix(in srgb, ${coverTone(book.title)} 68%, white), rgba(220,211,247,.43))`;
  ui.detailMeta.textContent = [book.author, book.format?.toUpperCase(), humanBytes(book.size)].filter(Boolean).join(" · ");
  ui.detailTitle.textContent = book.title;
  ui.detailDescription.textContent = book.description || "还没有简介。以后可以在这里补上这本书的来历。";
  $$(".detail-tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.detailTab === "chapters"));
  await renderDetailTab();
  ui.bookDetail.classList.remove("hidden");
}

async function renderDetailTab() {
  const book = state.detailBook;
  if (!book) return;
  ui.detailTabBody.replaceChildren();

  if (state.detailTab === "chapters") {
    const wrap = document.createElement("div");
    wrap.className = "jump-list";
    const chapters = book.chapters?.length ? book.chapters : [{ title: "正文", offset: 0 }];
    chapters.forEach((chapter, index) => {
      const button = document.createElement("button");
      button.className = "jump-item";
      button.type = "button";
      const title = document.createElement("span");
      title.textContent = chapter.title || `章节 ${index + 1}`;
      const position = document.createElement("small");
      position.textContent = `${Math.round(((chapter.offset || 0) / Math.max(1, book.content.length)) * 100)}%`;
      button.append(title, position);
      button.onclick = () => {
        closeSheet(ui.bookDetail);
        openLocalReader(book.id, chapter.offset || 0);
      };
      wrap.append(button);
    });
    ui.detailTabBody.append(wrap);
    return;
  }

  if (state.detailTab === "notes") {
    const notes = (await listNotes(book.id)).sort((a, b) => a.start - b.start);
    if (!notes.length) {
      ui.detailTabBody.innerHTML = '<p class="setting-note">还没有划线或段评。</p>';
      return;
    }
    for (const note of notes) {
      const card = document.createElement("article");
      card.className = "note-card";
      const quote = document.createElement("blockquote");
      quote.textContent = note.quote;
      card.append(quote);
      if (note.text) {
        const text = document.createElement("p");
        text.textContent = note.text;
        card.append(text);
      }
      card.onclick = () => {
        closeSheet(ui.bookDetail);
        openLocalReader(book.id, note.start);
      };
      ui.detailTabBody.append(card);
    }
    return;
  }

  if (state.detailTab === "story") {
    const textarea = document.createElement("textarea");
    textarea.rows = 8;
    textarea.placeholder = "这本书读完以后，我们在这里留下属于它的叙说。";
    textarea.value = book.story || "";
    const save = document.createElement("button");
    save.className = "primary-button";
    save.type = "button";
    save.style.marginTop = "10px";
    save.textContent = "保存叙说";
    save.onclick = async () => {
      book.story = textarea.value;
      await putBook(book);
      state.detailBook = book;
      toast("叙说保存了。");
    };
    ui.detailTabBody.append(textarea, save);
  }
}

function closeSheet(element) {
  element.classList.add("hidden");
}

function computeChunk(content, offset, target = 5200) {
  const start = Math.max(0, Math.min(offset || 0, Math.max(0, content.length - 1)));
  let end = Math.min(content.length, start + target);
  if (end < content.length) {
    const boundary = content.indexOf("\n\n", end);
    if (boundary !== -1 && boundary - end < 1200) end = boundary + 2;
  }
  return { start, end, text: content.slice(start, end) };
}

async function openLocalReader(id, offset = null) {
  const book = await getBook(id);
  if (!book) return;

  state.reader = {
    kind: "local",
    book,
    offset: Number.isFinite(offset) ? offset : (book.progressOffset || 0),
    chunk: null,
  };
  state.pageHistory = [];
  state.readerNotes = await listNotes(id);
  ui.readerView.classList.remove("hidden");
  document.body.style.overflow = "hidden";
  renderReader();
}

async function openRemoteReader(book, offset = 0) {
  state.reader = {
    kind: "remote",
    book,
    offset,
    chunk: null,
  };
  state.pageHistory = [];
  state.readerNotes = [];
  ui.readerView.classList.remove("hidden");
  document.body.style.overflow = "hidden";
  await loadRemoteChunk(offset, false);
}

async function loadRemoteChunk(offset, pushHistory = true) {
  if (!state.reader || state.reader.kind !== "remote") return;
  if (pushHistory && state.reader.chunk) state.pageHistory.push(state.reader.chunk.start);
  ui.readerPaper.textContent = "正在翻页……";
  const data = await callApi("text", { id: state.reader.book.id, offset, limit: 12000 });
  const text = data?.text || "";
  state.reader.chunk = {
    start: Number(data?.offset || offset),
    end: Number(data?.offset || offset) + text.length,
    text,
    total: Number(data?.totalChars || data?.total_chars || 0),
    hasMore: Boolean(data?.hasMore ?? data?.has_more),
  };
  state.reader.offset = state.reader.chunk.start;
  renderReader();
}

function currentReaderChunk() {
  const reader = state.reader;
  if (!reader) return null;

  if (reader.kind === "remote") return reader.chunk;

  const target = state.settings.readingMode === "paged" ? 5200 : 12000;
  const chunk = computeChunk(reader.book.content, reader.offset, target);
  return {
    ...chunk,
    total: reader.book.content.length,
    hasMore: chunk.end < reader.book.content.length,
  };
}

function renderReader() {
  const reader = state.reader;
  if (!reader) return;
  const chunk = currentReaderChunk();
  if (!chunk) return;
  reader.chunk = chunk;

  const title = reader.book.title || "Reading";
  const author = reader.book.author || "";
  ui.readerTitle.textContent = title;
  ui.readerMeta.textContent = reader.kind === "remote"
    ? [`Gutenberg #${reader.book.id}`, author].filter(Boolean).join(" · ")
    : [author, reader.book.format?.toUpperCase()].filter(Boolean).join(" · ");

  const progress = chunk.total ? Math.min(100, (chunk.end / chunk.total) * 100) : 0;
  ui.readerProgress.textContent = `${Math.round(progress)}% · ${chunk.start.toLocaleString()}–${chunk.end.toLocaleString()}`;
  ui.readerProgressBar.style.width = `${progress}%`;
  ui.readerPaper.classList.toggle("paged", state.settings.readingMode === "paged");

  renderReaderText(chunk);
  ui.readerPrevButton.disabled = reader.kind === "remote" ? state.pageHistory.length === 0 : chunk.start <= 0;
  ui.readerNextButton.disabled = !chunk.hasMore;
  ui.readerChapterButton.disabled = reader.kind === "remote";

  if (reader.kind === "local") {
    const book = reader.book;
    book.lastReadAt = new Date().toISOString();
    book.progressOffset = chunk.start;
    putBook(book).catch(console.error);
    updateResumeFromBook(book);
  }
}

function renderReaderText(chunk) {
  ui.readerPaper.replaceChildren();
  const relevant = state.readerNotes
    .filter((note) => note.end > chunk.start && note.start < chunk.end)
    .map((note) => ({
      ...note,
      localStart: Math.max(0, note.start - chunk.start),
      localEnd: Math.min(chunk.text.length, note.end - chunk.start),
    }))
    .sort((a, b) => a.localStart - b.localStart);

  let cursor = 0;
  for (const note of relevant) {
    if (note.localStart > cursor) ui.readerPaper.append(document.createTextNode(chunk.text.slice(cursor, note.localStart)));
    const mark = document.createElement("mark");
    mark.dataset.noteId = note.id;
    mark.dataset.color = note.color || "blue";
    mark.title = note.text || "划线";
    mark.append(document.createTextNode(chunk.text.slice(note.localStart, note.localEnd)));
    ui.readerPaper.append(mark);
    cursor = Math.max(cursor, note.localEnd);
  }
  if (cursor < chunk.text.length) ui.readerPaper.append(document.createTextNode(chunk.text.slice(cursor)));
}

async function nextReaderPage() {
  const reader = state.reader;
  if (!reader?.chunk?.hasMore) return;
  if (reader.kind === "remote") return loadRemoteChunk(reader.chunk.end);

  state.pageHistory.push(reader.chunk.start);
  reader.offset = reader.chunk.end;
  renderReader();
  ui.readerView.scrollTo({ top: 0, behavior: "smooth" });
}

async function previousReaderPage() {
  const reader = state.reader;
  if (!reader) return;

  if (state.pageHistory.length) {
    const previous = state.pageHistory.pop();
    if (reader.kind === "remote") return loadRemoteChunk(previous, false);
    reader.offset = previous;
  } else if (reader.kind === "local") {
    const target = state.settings.readingMode === "paged" ? 5200 : 12000;
    reader.offset = Math.max(0, reader.chunk.start - target);
  }
  renderReader();
  ui.readerView.scrollTo({ top: 0, behavior: "smooth" });
}

function closeReader() {
  ui.readerView.classList.add("hidden");
  document.body.style.overflow = "";
  state.pendingSelection = null;
  ui.selectionButton.classList.add("hidden");
  refreshLibrary().catch(console.error);
}

function selectionOffsets(range) {
  const pre = range.cloneRange();
  pre.selectNodeContents(ui.readerPaper);
  pre.setEnd(range.startContainer, range.startOffset);
  const start = pre.toString().length;
  const selected = range.toString();
  return { start, selected };
}

function captureSelection() {
  if (!state.reader || state.reader.kind !== "local") {
    ui.selectionButton.classList.add("hidden");
    return;
  }
  const selection = getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    ui.selectionButton.classList.add("hidden");
    return;
  }
  const range = selection.getRangeAt(0);
  if (!ui.readerPaper.contains(range.commonAncestorContainer)) {
    ui.selectionButton.classList.add("hidden");
    return;
  }
  const { start, selected } = selectionOffsets(range);
  const quote = selected.trim();
  if (quote.length < 2) {
    ui.selectionButton.classList.add("hidden");
    return;
  }
  const leftTrim = selected.indexOf(quote);
  state.pendingSelection = {
    quote,
    start: state.reader.chunk.start + start + Math.max(0, leftTrim),
    end: state.reader.chunk.start + start + Math.max(0, leftTrim) + quote.length,
  };
  ui.selectionButton.classList.remove("hidden");
}

function openNoteComposer() {
  if (!state.pendingSelection) return;
  ui.noteQuote.textContent = state.pendingSelection.quote;
  ui.noteText.value = "";
  ui.noteComposer.classList.remove("hidden");
}

async function savePendingNote() {
  if (!state.pendingSelection || !state.reader || state.reader.kind !== "local") return;
  const note = {
    id: crypto.randomUUID(),
    bookId: state.reader.book.id,
    quote: state.pendingSelection.quote,
    start: state.pendingSelection.start,
    end: state.pendingSelection.end,
    text: ui.noteText.value.trim(),
    color: state.highlightColor,
    source: "隐",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    thread: [],
  };
  await putNote(note);
  state.readerNotes.push(note);
  state.pendingSelection = null;
  getSelection()?.removeAllRanges();
  ui.selectionButton.classList.add("hidden");
  closeSheet(ui.noteComposer);
  renderReader();
  toast(note.text ? "划线和纸条都留下了。" : "划下来了。");
}

async function showReaderNotes() {
  if (!state.reader || state.reader.kind !== "local") {
    toast("Gutenberg 试读暂时不写入共读记录。");
    return;
  }
  state.detailBook = state.reader.book;
  state.detailTab = "notes";
  ui.detailCover.textContent = state.reader.book.title;
  ui.detailMeta.textContent = state.reader.book.author || "";
  ui.detailTitle.textContent = state.reader.book.title;
  ui.detailDescription.textContent = state.reader.book.description || "这本书留下的划线与纸条。";
  $$(".detail-tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.detailTab === "notes"));
  await renderDetailTab();
  ui.bookDetail.classList.remove("hidden");
}

async function showReaderChapters() {
  if (!state.reader || state.reader.kind !== "local") return;
  state.detailBook = state.reader.book;
  state.detailTab = "chapters";
  ui.detailCover.textContent = state.reader.book.title;
  ui.detailMeta.textContent = state.reader.book.author || "";
  ui.detailTitle.textContent = state.reader.book.title;
  ui.detailDescription.textContent = state.reader.book.description || "";
  $$(".detail-tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.detailTab === "chapters"));
  await renderDetailTab();
  ui.bookDetail.classList.remove("hidden");
}

function updateResumeFromBook(book) {
  if (!book) {
    ui.resumeButton.classList.add("hidden");
    return;
  }
  ui.resumeButton.classList.remove("hidden");
  ui.resumeButton.textContent = `继续《${book.title}》`;
  ui.resumeButton.dataset.bookId = book.id;
}

function updateResume() {
  const recent = [...state.books]
    .filter((book) => book.lastReadAt)
    .sort((a, b) => String(b.lastReadAt).localeCompare(String(a.lastReadAt)))[0];
  updateResumeFromBook(recent);
}

async function assignFolder() {
  const book = state.detailBook;
  if (!book) return;
  const existing = state.folders.map((f) => f.name).join("、");
  const name = prompt(existing ? `输入文件夹名。已有：${existing}\n留空移出文件夹。` : "输入新的文件夹名；留空保持未分类。");
  if (name === null) return;

  const trimmed = name.trim();
  if (!trimmed) {
    book.folderId = null;
  } else {
    let folder = state.folders.find((f) => f.name === trimmed);
    if (!folder) {
      folder = { id: crypto.randomUUID(), name: trimmed, createdAt: new Date().toISOString() };
      await putFolder(folder);
      state.folders.push(folder);
    }
    book.folderId = folder.id;
  }
  await putBook(book);
  state.detailBook = book;
  await refreshLibrary();
  toast("归类好了。");
}

async function createFolder() {
  const name = prompt("新文件夹叫什么？")?.trim();
  if (!name) return;
  if (state.folders.some((folder) => folder.name === name)) {
    toast("已经有这个文件夹了。");
    return;
  }
  await putFolder({ id: crypto.randomUUID(), name, createdAt: new Date().toISOString() });
  await refreshLibrary();
  toast(`建好了「${name}」。`);
}

async function removeCurrentBook() {
  const book = state.detailBook;
  if (!book) return;
  if (!confirm(`从存所删除《${book.title}》？原文件、划线和段评都会一起删除。`)) return;
  await deleteBook(book.id);
  closeSheet(ui.bookDetail);
  await refreshLibrary();
  toast("已经从存所移走了。");
}

async function callApi(op, payload = {}) {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ op, ...payload }),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || body?.ok === false) throw new Error(body?.error || "书源请求失败。");
  return body?.data ?? body;
}

function normalizeBooks(data) {
  for (const candidate of [data, data?.books, data?.results, data?.items, data?.data, data?.result?.books, data?.result?.results]) {
    if (Array.isArray(candidate)) return candidate;
  }
  return [];
}

function normalizeAuthor(book) {
  const authors = book?.authors ?? book?.author ?? [];
  if (typeof authors === "string") return authors;
  if (!Array.isArray(authors)) return "";
  return authors.map((author) => typeof author === "string" ? author : author?.name || "").filter(Boolean).join(" · ");
}

function remoteBookId(book) {
  return Number(book?.id ?? book?.gutenberg_id ?? book?.book_id);
}

async function discover(query = null) {
  ui.discoverButton.disabled = true;
  ui.popularButton.disabled = true;
  ui.discoverStatus.textContent = "正在外面找……";
  try {
    const data = query
      ? await callApi("search", { query })
      : await callApi("popular", { limit: 24 });
    renderDiscover(data);
    ui.discoverStatus.textContent = "找到了。";
  } catch (error) {
    ui.discoverStatus.textContent = `没找成：${error.message}`;
  } finally {
    ui.discoverButton.disabled = false;
    ui.popularButton.disabled = false;
  }
}

function renderDiscover(data) {
  const books = normalizeBooks(data);
  ui.discoverResults.classList.remove("hidden");
  ui.discoverGrid.replaceChildren();
  ui.discoverMeta.textContent = `${books.length} 本`;

  if (!books.length) {
    ui.discoverGrid.innerHTML = '<div class="empty-state liquid"><p>没有找到。换个关键词试试。</p></div>';
    return;
  }

  for (const book of books) {
    const id = remoteBookId(book);
    if (!Number.isFinite(id)) continue;
    const titleText = book.title || `Gutenberg #${id}`;
    const card = document.createElement("article");
    card.className = "book-card liquid";
    card.style.setProperty("--cover-tone", coverTone(titleText));

    const cover = document.createElement("div");
    cover.className = "text-cover";
    cover.textContent = titleText;

    const footer = document.createElement("footer");
    const title = document.createElement("h3");
    title.className = "book-card-title";
    title.textContent = titleText;
    const meta = document.createElement("p");
    meta.className = "book-card-meta";
    meta.textContent = [normalizeAuthor(book), `Gutenberg #${id}`].filter(Boolean).join(" · ");
    footer.append(title, meta);
    card.append(cover, footer);
    card.onclick = () => openRemoteReader({ id, title: titleText, author: normalizeAuthor(book) });
    ui.discoverGrid.append(card);
  }
}

async function exportData() {
  const data = await exportLibraryData();
  data.settings = { ...state.settings, translation: { ...state.settings.translation, apiKey: "" } };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `aire-library-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
  toast("阅读数据导出了。API Key 没有写进去。");
}

function bindSettings() {
  const bind = (element, fn, event = "input") => {
    element.addEventListener(event, () => {
      fn(element);
      saveSettings();
    });
  };

  bind(ui.themeSetting, (el) => state.settings.theme = el.value, "change");
  bind(ui.readingModeSetting, (el) => state.settings.readingMode = el.value, "change");
  bind(ui.fontSizeSetting, (el) => state.settings.fontSize = Number(el.value));
  bind(ui.lineHeightSetting, (el) => state.settings.lineHeight = Number(el.value));
  bind(ui.letterSpacingSetting, (el) => state.settings.letterSpacing = Number(el.value));
  bind(ui.contentWidthSetting, (el) => state.settings.contentWidth = Number(el.value));

  bind(ui.translationEnabled, (el) => state.settings.translation.enabled = el.checked, "change");
  bind(ui.translationBaseUrl, (el) => state.settings.translation.baseUrl = el.value.trim(), "change");
  bind(ui.translationApiKey, (el) => state.settings.translation.apiKey = el.value, "change");
  bind(ui.translationModel, (el) => state.settings.translation.model = el.value.trim(), "change");
  bind(ui.translationDisplayMode, (el) => state.settings.translation.displayMode = el.value, "change");

  bind(ui.glassBlurSetting, (el) => state.settings.glass.blur = Number(el.value));
  bind(ui.glassOpacitySetting, (el) => state.settings.glass.opacity = Number(el.value));
  bind(ui.glassSaturationSetting, (el) => state.settings.glass.saturation = Number(el.value));
  bind(ui.glassHighlightSetting, (el) => state.settings.glass.highlight = Number(el.value));
  bind(ui.glassRadiusSetting, (el) => state.settings.glass.radius = Number(el.value));
  bind(ui.glassTintSetting, (el) => state.settings.glass.tint = el.value);\n  bind(ui.glassRefractionSetting, (el) => state.settings.glass.refraction = Number(el.value));

  const presets = {
    clear: { blur: 12, opacity: 0.30, saturation: 125, highlight: 0.60, radius: 22, tint: "#e9f7ff" },
    soft: { ...defaultSettings.glass },
    deep: { blur: 34, opacity: 0.68, saturation: 180, highlight: 0.35, radius: 27, tint: "#cfe9fb" },
  };
  $$("[data-glass-preset]").forEach((button) => {
    button.addEventListener("click", () => {
      state.settings.glass = { ...presets[button.dataset.glassPreset] };
      $$("[data-glass-preset]").forEach((item) => item.classList.toggle("active", item === button));
      saveSettings();
    });
  });
  ui.glassResetButton.addEventListener("click", () => {
    state.settings.glass = { ...defaultSettings.glass };
    saveSettings();
    toast("玻璃恢复到柔和预设。");
  });
}

$$(".nav-item").forEach((button) => button.addEventListener("click", () => setView(button.dataset.view)));

ui.uploadBookButton.addEventListener("click", () => ui.bookFileInput.click());
$$("[data-action='upload']").forEach((button) => button.addEventListener("click", () => ui.bookFileInput.click()));
ui.bookFileInput.addEventListener("change", () => handleFiles(ui.bookFileInput.files));

ui.librarySearch.addEventListener("input", renderLibrary);
ui.sortSelect.addEventListener("change", () => {
  state.sort = ui.sortSelect.value;
  renderLibrary();
});
ui.readFilter.addEventListener("click", (event) => {
  const button = event.target.closest("[data-filter]");
  if (!button) return;
  state.filter = button.dataset.filter;
  $$(".segment", ui.readFilter).forEach((item) => item.classList.toggle("active", item === button));
  renderLibrary();
});

ui.detailReadButton.addEventListener("click", () => {
  if (!state.detailBook) return;
  const id = state.detailBook.id;
  closeSheet(ui.bookDetail);
  openLocalReader(id);
});
ui.detailFolderButton.addEventListener("click", assignFolder);
ui.detailDeleteButton.addEventListener("click", removeCurrentBook);
$$(".detail-tab").forEach((tab) => tab.addEventListener("click", () => {
  state.detailTab = tab.dataset.detailTab;
  $$(".detail-tab").forEach((item) => item.classList.toggle("active", item === tab));
  renderDetailTab();
}));

$$("[data-close]").forEach((element) => element.addEventListener("click", () => {
  const target = $(element.dataset.close);
  if (target) closeSheet(target);
}));

ui.readerBackButton.addEventListener("click", closeReader);
ui.readerPrevButton.addEventListener("click", previousReaderPage);
ui.readerNextButton.addEventListener("click", nextReaderPage);
ui.readerChapterButton.addEventListener("click", showReaderChapters);
ui.readerNotesButton.addEventListener("click", showReaderNotes);

document.addEventListener("selectionchange", () => {
  if (ui.readerView.classList.contains("hidden")) return;
  clearTimeout(captureSelection.timer);
  captureSelection.timer = setTimeout(captureSelection, 100);
});
ui.selectionButton.addEventListener("click", openNoteComposer);
ui.saveNoteButton.addEventListener("click", savePendingNote);
ui.highlightColors.addEventListener("click", (event) => {
  const button = event.target.closest("[data-color]");
  if (!button) return;
  state.highlightColor = button.dataset.color;
  $$(".highlight-color", ui.highlightColors).forEach((item) => item.classList.toggle("active", item === button));
});

ui.discoverForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const query = ui.discoverInput.value.trim();
  if (query) discover(query);
});
ui.popularButton.addEventListener("click", () => discover());
ui.resumeButton.addEventListener("click", () => {
  const id = ui.resumeButton.dataset.bookId;
  if (id) openLocalReader(id);
});

ui.createFolderButton.addEventListener("click", createFolder);
ui.exportDataButton.addEventListener("click", exportData);

bindSettings();
applySettings();
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
  if (state.settings.theme === "auto") applySettings();
});

refreshLibrary().catch((error) => {
  console.error(error);
  toast("存所数据库没有打开成功。", 5000);
});
